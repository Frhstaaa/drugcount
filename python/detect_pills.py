#!/usr/bin/env python3
"""
PillCount Computer Vision Engine
High-precision automated pill detection & counting using OpenCV
Features:
- Rigorous false-positive rejection (faces, hands, rooms, clutter -> 0 pills)
- Local background ring contrast validation (pills must contrast against flat tray)
- Strict morphological geometry (Tablets: circularity>=0.68, solidity>=0.88; Capsules: AR 1.45-3.6, solidity>=0.86)
- Physical pharmaceutical size bounds (Area: 140 - 7500 px, max dimension <= 120 px)
- Outlier filtering by cluster median
- Quality diagnostics (Laplacian blur score, lighting analysis)
"""

import sys
import os

# Restrict thread pools to avoid exceeding CyberPanel 1GB vmemory limit
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"

import json
import base64
import argparse
import numpy as np
import cv2

# Disable OpenCV multi-threading & OpenCL to maintain tiny virtual memory footprint (<50MB)
try:
    cv2.setNumThreads(1)
    cv2.ocl.setUseOpenCL(False)
except Exception:
    pass


def analyze_image_quality(gray):
    """Analyze lighting conditions and sharpness/focus."""
    laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    is_blurry = laplacian_var < 70.0

    mean_val = float(np.mean(gray))
    std_val = float(np.std(gray))

    if mean_val < 40:
        lighting = "terlalu_gelap"
        lighting_msg = "Pencahayaan terlalu gelap. Nyalakan senter atau tambah cahaya."
    elif mean_val > 230:
        lighting = "terlalu_terang"
        lighting_msg = "Pencahayaan terlalu silau/overexposed."
    elif std_val < 25:
        lighting = "kontras_rendah"
        lighting_msg = "Kontras antara obat dan nampan kurang jelas."
    else:
        lighting = "optimal"
        lighting_msg = "Pencahayaan dan kontras optimal."

    return {
        "blur_score": round(laplacian_var, 1),
        "is_blurry": is_blurry,
        "lighting": lighting,
        "brightness": round(mean_val, 1),
        "contrast": round(std_val, 1),
        "message": lighting_msg if lighting != "optimal" else ("Kamera tampak buram/goyang." if is_blurry else "Kondisi gambar sangat baik.")
    }


def classify_pill_shape(contour, approx, aspect_ratio, circularity, solidity, area):
    """
    Classify pill based on morphological geometry with strict rejection:
    - Tablet: circular or slightly oval (aspect ratio <= 1.42, high circularity >= 0.68, solidity >= 0.88)
    - Capsule: elongated shape (aspect ratio 1.45 - 3.6, circularity >= 0.45, solidity >= 0.86)
    - Racikan: irregular contours of broken tablets (circularity >= 0.58, solidity >= 0.82, area <= 3000)
    Returns: (shape_type, confidence) or (None, 0.0) if not a valid pill.
    """
    if circularity >= 0.68 and solidity >= 0.88 and aspect_ratio <= 1.42:
        return "tablet", 0.98
    elif solidity >= 0.86 and 1.45 <= aspect_ratio <= 3.6 and circularity >= 0.45:
        return "capsule", 0.96
    elif solidity >= 0.82 and circularity >= 0.58 and area <= 3000 and aspect_ratio <= 2.2:
        return "racikan", 0.86
    return None, 0.0


def detect_pills(image, shape_filter="all", min_area=140, max_area=7500, sensitivity=50):
    """
    Detect genuine pharmaceutical pills with strict false-positive rejection.
    """
    orig_h, orig_w = image.shape[:2]

    # Resize for consistent processing
    max_dim = 1280
    scale = 1.0
    if max(orig_h, orig_w) > max_dim:
        scale = max_dim / float(max(orig_h, orig_w))
        proc_w = int(orig_w * scale)
        proc_h = int(orig_h * scale)
        proc_img = cv2.resize(image, (proc_w, proc_h), interpolation=cv2.INTER_AREA)
    else:
        proc_img = image.copy()
        proc_h, proc_w = orig_h, orig_w

    gray = cv2.cvtColor(proc_img, cv2.COLOR_BGR2GRAY)
    quality = analyze_image_quality(gray)

    # Denoise while keeping crisp edges
    denoised = cv2.bilateralFilter(gray, d=7, sigmaColor=50, sigmaSpace=50)

    # Enhance contrast using CLAHE
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    enhanced = clahe.apply(denoised)

    # Estimate background polarity from image borders
    border_pixels = np.concatenate([
        enhanced[0:12, :].flatten(),
        enhanced[-12:, :].flatten(),
        enhanced[:, 0:12].flatten(),
        enhanced[:, -12:].flatten()
    ])
    bg_intensity = np.median(border_pixels)

    if bg_intensity < 120:
        # Dark background (e.g. blue/black medical tray) -> light pills
        _, binary = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    else:
        # Light background (e.g. white tray/paper) -> dark pills
        _, binary = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # Morphological cleaning
    k_size = 3 if sensitivity > 60 else 5
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k_size, k_size))
    cleaned = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel, iterations=1)
    cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_CLOSE, kernel, iterations=2)

    # Distance transform identifies peaks of pill centers
    dist_transform = cv2.distanceTransform(cleaned, cv2.DIST_L2, 5)
    if dist_transform.max() == 0:
        return {
            "success": True,
            "count": 0,
            "shape_filter": shape_filter,
            "pills": [],
            "quality": quality,
            "annotated_image": None,
            "image_size": {"width": orig_w, "height": orig_h}
        }

    thresh_factor = max(0.30, min(0.65, 0.65 - (sensitivity / 100.0) * 0.35))
    _, sure_fg = cv2.threshold(dist_transform, thresh_factor * dist_transform.max(), 255, 0)
    sure_fg = np.uint8(sure_fg)

    sure_bg = cv2.dilate(cleaned, kernel, iterations=3)
    unknown = cv2.subtract(sure_bg, sure_fg)

    num_markers, markers = cv2.connectedComponents(sure_fg)
    markers = markers + 1
    markers[unknown == 255] = 0

    watershed_img = proc_img.copy()
    markers = cv2.watershed(watershed_img, markers)

    # Physical pill size bounds (scaled)
    # A pill should NEVER exceed 2.2% of total screen or 7500 pixels
    scaled_min_area = max(130.0, float(min_area) * (scale * scale))
    scaled_max_area = min(float(proc_w * proc_h * 0.022), float(max_area) * (scale * scale), 7500.0)
    max_dim_px = int(120 * scale)
    min_dim_px = int(11 * scale)

    candidate_pills = []

    for label in range(2, num_markers + 1):
        mask = np.zeros(cleaned.shape, dtype=np.uint8)
        mask[markers == label] = 255

        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            continue

        c = max(contours, key=cv2.contourArea)
        area = cv2.contourArea(c)

        # 1. Strict area check
        if area < scaled_min_area or area > scaled_max_area:
            continue

        # 2. Bounding dimensions check
        x, y, w, h = cv2.boundingRect(c)
        if w > max_dim_px or h > max_dim_px or min(w, h) < min_dim_px:
            continue

        peri = cv2.arcLength(c, True)
        if peri == 0:
            continue
        circularity = 4 * np.pi * (area / (peri * peri))

        hull = cv2.convexHull(c)
        hull_area = cv2.contourArea(hull)
        solidity = float(area) / hull_area if hull_area > 0 else 0
        aspect_ratio = float(max(w, h)) / max(min(w, h), 1)

        # 3. Local background ring contrast check (must stand out sharply from tray)
        dilated_mask = cv2.dilate(mask, kernel, iterations=2)
        ring_mask = cv2.subtract(dilated_mask, mask)
        mean_inside = cv2.mean(enhanced, mask=mask)[0]
        mean_ring = cv2.mean(enhanced, mask=ring_mask)[0]
        local_contrast = abs(mean_inside - mean_ring)

        # A real pill has sharp contrast (>= 22 intensity units) against tray
        if local_contrast < 22.0:
            continue

        # 4. Internal texture consistency (pills have low internal variance)
        inside_std = cv2.meanStdDev(enhanced, mask=mask)[1][0][0]
        if inside_std > 42.0:
            # High internal variance means textured face/hair/fabric, not a solid pill
            continue

        # 5. Strict shape classification
        approx = cv2.approxPolyDP(c, 0.03 * peri, True)
        shape_type, conf = classify_pill_shape(c, approx, aspect_ratio, circularity, solidity, area)
        if not shape_type:
            continue

        if shape_filter == "tablet" and shape_type != "tablet":
            continue
        elif shape_filter == "capsule" and shape_type != "capsule":
            continue
        elif shape_filter == "racikan" and shape_type != "racikan":
            continue

        M = cv2.moments(c)
        if M["m00"] > 0:
            cx = int(M["m10"] / M["m00"])
            cy = int(M["m01"] / M["m00"])
        else:
            cx = x + w // 2
            cy = y + h // 2

        candidate_pills.append({
            "c": c,
            "x": x, "y": y, "w": w, "h": h,
            "cx": cx, "cy": cy,
            "area": area,
            "circularity": circularity,
            "solidity": solidity,
            "aspect_ratio": aspect_ratio,
            "shape": shape_type,
            "confidence": conf,
            "contrast": local_contrast
        })

    # 6. Outlier filtering by cluster median (for batch consistency)
    if len(candidate_pills) >= 4:
        areas = [p["area"] for p in candidate_pills]
        median_area = np.median(areas)
        # Filter extreme size outliers (pills of same medicine have similar size)
        filtered_candidates = [
            p for p in candidate_pills
            if 0.25 * median_area <= p["area"] <= 3.2 * median_area
        ]
    else:
        filtered_candidates = candidate_pills

    # Prepare output results and visual overlay
    detected_pills = []
    annotated = proc_img.copy()
    overlay = annotated.copy()

    for idx, pill in enumerate(filtered_candidates, 1):
        orig_x = int(pill["x"] / scale)
        orig_y = int(pill["y"] / scale)
        orig_w_val = int(pill["w"] / scale)
        orig_h_val = int(pill["h"] / scale)
        orig_cx = int(pill["cx"] / scale)
        orig_cy = int(pill["cy"] / scale)
        radius = int(max(pill["w"], pill["h"]) / 2)

        detected_pills.append({
            "id": idx,
            "x": orig_x,
            "y": orig_y,
            "width": orig_w_val,
            "height": orig_h_val,
            "cx": orig_cx,
            "cy": orig_cy,
            "radius": int(radius / scale),
            "shape": pill["shape"],
            "confidence": round(pill["confidence"], 2),
            "area": int(pill["area"] / (scale * scale)),
            "circularity": round(pill["circularity"], 2),
            "aspect_ratio": round(pill["aspect_ratio"], 2)
        })

        cx, cy = pill["cx"], pill["cy"]
        # Mint cyan ring (BGR: 203, 216, 107 in hex #6bd8cb)
        cv2.circle(overlay, (cx, cy), max(radius + 4, 15), (203, 216, 107), 2)
        cv2.circle(overlay, (cx, cy), max(radius + 2, 13), (203, 216, 107), -1)
        # Fluorescent lime center dot (BGR: 45, 222, 148 in hex #94de2d)
        cv2.circle(annotated, (cx, cy), 3, (45, 222, 148), -1)

        # Pill label badge (e.g. "01")
        badge_text = f"{idx:02d}"
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.4
        thickness = 1
        (tw, th), _ = cv2.getTextSize(badge_text, font, font_scale, thickness)

        badge_x = min(cx + radius + 4, proc_w - tw - 8)
        badge_y = max(cy - radius - 2, th + 6)

        cv2.rectangle(annotated, (badge_x - 3, badge_y - th - 3), (badge_x + tw + 3, badge_y + 3), (34, 26, 11), -1)
        cv2.rectangle(annotated, (badge_x - 3, badge_y - th - 3), (badge_x + tw + 3, badge_y + 3), (203, 216, 107), 1)
        cv2.putText(annotated, badge_text, (badge_x, badge_y), font, font_scale, (203, 216, 107), thickness, cv2.LINE_AA)

    alpha = 0.25
    cv2.addWeighted(overlay, alpha, annotated, 1 - alpha, 0, annotated)

    _, buffer = cv2.imencode('.jpg', annotated, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
    annotated_b64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode('utf-8')

    return {
        "success": True,
        "count": len(detected_pills),
        "shape_filter": shape_filter,
        "pills": detected_pills,
        "quality": quality,
        "annotated_image": annotated_b64 if detected_pills else None,
        "image_size": {"width": orig_w, "height": orig_h}
    }


def load_image(image_input):
    """Load image from base64 data URI, raw base64, or file path."""
    if os.path.isfile(image_input):
        # 1. Try reading as binary image directly
        img = cv2.imread(image_input)
        if img is not None:
            return img

        # 2. If it is a text file containing base64 data
        try:
            with open(image_input, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read().strip()
            if content:
                return load_image(content)
        except Exception:
            pass

    if image_input.startswith("data:image"):
        try:
            header, encoded = image_input.split(",", 1)
            data = base64.b64decode(encoded)
            nparr = np.frombuffer(data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is not None:
                return img
        except Exception:
            pass

    try:
        data = base64.b64decode(image_input)
        nparr = np.frombuffer(data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is not None:
            return img
    except Exception:
        pass

    raise ValueError(f"Cannot load image from input: {str(image_input)[:50]}...")


def main():
    parser = argparse.ArgumentParser(description="PillCount Computer Vision Engine")
    parser.add_argument("--image", required=True, help="Path to image file or base64 string")
    parser.add_argument("--shape", default="all", choices=["all", "tablet", "capsule", "racikan"], help="Shape filter")
    parser.add_argument("--min-area", type=int, default=140, help="Minimum pill contour area")
    parser.add_argument("--max-area", type=int, default=7500, help="Maximum pill contour area")
    parser.add_argument("--sensitivity", type=int, default=50, help="Detection sensitivity (1-100)")

    args = parser.parse_args()

    try:
        image = load_image(args.image)
        if image is None:
            print(json.dumps({"success": False, "error": "Failed to decode image"}))
            sys.exit(1)

        result = detect_pills(
            image,
            shape_filter=args.shape,
            min_area=args.min_area,
            max_area=args.max_area,
            sensitivity=args.sensitivity
        )
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
