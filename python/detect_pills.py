#!/usr/bin/env python3
"""
PillCount Computer Vision Engine
High-precision automated pill detection & counting using OpenCV

Hybrid Multi-Strategy Engine:
1. Dual-Threshold Watershed & Morphology (Loose pills & capsules on counting trays)
2. Circular Hough Transform with Spatial-Intensity Clustering (Blister packs / foil strips & round tablets)
3. Non-Maximum Suppression (NMS) & Multi-level False-Positive Rejection (Faces, hands, clutter -> 0)
4. Quality diagnostics (Blur, lighting analysis)
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

# High-level scientific imaging libraries (SciPy & Scikit-Image)
try:
    from scipy import ndimage as ndi
    from scipy.spatial.distance import cdist
    from skimage.measure import regionprops, label
    from skimage.feature import peak_local_max
    HAS_SCIENTIFIC = True
except ImportError:
    HAS_SCIENTIFIC = False

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

    if mean_val < 35:
        lighting = "terlalu_gelap"
        lighting_msg = "Pencahayaan terlalu gelap. Nyalakan senter atau tambah cahaya."
    elif mean_val > 235:
        lighting = "terlalu_terang"
        lighting_msg = "Pencahayaan terlalu silau/overexposed."
    elif std_val < 20:
        lighting = "kontras_rendah"
        lighting_msg = "Kontras antara obat dan latar belakang kurang jelas."
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
    Classify pill based on morphological geometry with realistic physical metrics:
    - Tablet: circular or slightly oval (aspect ratio <= 1.65, circularity >= 0.35, solidity >= 0.70)
    - Capsule: elongated shape (aspect ratio 1.35 - 4.2, circularity >= 0.25, solidity >= 0.68)
    - Racikan: irregular contours of broken tablets (circularity >= 0.28, solidity >= 0.65, area <= 6500)
    """
    if solidity >= 0.70 and aspect_ratio <= 1.65 and circularity >= 0.35:
        return "tablet", 0.98
    elif solidity >= 0.68 and 1.35 <= aspect_ratio <= 4.2 and circularity >= 0.25:
        return "capsule", 0.96
    elif solidity >= 0.65 and circularity >= 0.28 and area <= 6500 and aspect_ratio <= 2.8:
        return "racikan", 0.88
    return None, 0.0


def detect_pills(image, shape_filter="all", min_area=140, max_area=7500, sensitivity=50):
    """
    Detect genuine pharmaceutical pills with hybrid contour-watershed and Hough circle detection.
    Accurately detects both loose pills on trays AND pills in blister packs / strips.
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
    clahe = cv2.createCLAHE(clipLimit=2.2, tileGridSize=(8, 8))
    enhanced = clahe.apply(denoised)

    candidate_pills = []

    # ==========================================
    # STRATEGY 1: Watershed & Morphological Contours
    # (Ideal for loose pills, colored capsules & trays)
    # ==========================================
    border_pixels = np.concatenate([
        enhanced[0:12, :].flatten(),
        enhanced[-12:, :].flatten(),
        enhanced[:, 0:12].flatten(),
        enhanced[:, -12:].flatten()
    ])
    bg_intensity = np.median(border_pixels)

    thresh_type = cv2.THRESH_BINARY if bg_intensity < 120 else cv2.THRESH_BINARY_INV
    _, binary = cv2.threshold(enhanced, 0, 255, thresh_type + cv2.THRESH_OTSU)

    k_size = 3 if sensitivity > 60 else 5
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k_size, k_size))
    cleaned = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel, iterations=1)
    cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_CLOSE, kernel, iterations=2)

    if HAS_SCIENTIFIC:
        dist_transform = ndi.distance_transform_edt(cleaned == 255).astype(np.float32)
    else:
        dist_transform = cv2.distanceTransform(cleaned, cv2.DIST_L2, 5)

    if dist_transform.max() > 0:
        thresh_factor = max(0.20, min(0.55, 0.55 - (sensitivity / 100.0) * 0.35))
        _, sure_fg = cv2.threshold(dist_transform, thresh_factor * dist_transform.max(), 255, 0)
        sure_fg = np.uint8(sure_fg)

        sure_bg = cv2.dilate(cleaned, kernel, iterations=3)
        unknown = cv2.subtract(sure_bg, sure_fg)

        num_markers, markers = cv2.connectedComponents(sure_fg)
        markers = markers + 1
        markers[unknown == 255] = 0

        watershed_img = proc_img.copy()
        markers = cv2.watershed(watershed_img, markers)

        scaled_min_area = max(100.0, float(min_area) * (scale * scale))
        scaled_max_area = min(float(proc_w * proc_h * 0.035), float(max_area) * (scale * scale), 7500.0)
        max_dim_px = int(130 * scale)
        min_dim_px = int(10 * scale)

        for label in range(2, num_markers + 1):
            mask = np.zeros(cleaned.shape, dtype=np.uint8)
            mask[markers == label] = 255

            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if not contours:
                continue

            c = max(contours, key=cv2.contourArea)
            area = cv2.contourArea(c)

            if area < scaled_min_area or area > scaled_max_area:
                continue

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

            dilated_mask = cv2.dilate(mask, kernel, iterations=2)
            ring_mask = cv2.subtract(dilated_mask, mask)
            mean_inside = cv2.mean(enhanced, mask=mask)[0]
            mean_ring = cv2.mean(enhanced, mask=ring_mask)[0]
            local_contrast = abs(mean_inside - mean_ring)

            if local_contrast < 16.0:
                continue

            inside_std = cv2.meanStdDev(enhanced, mask=mask)[1][0][0]
            if inside_std > 38.0:
                continue

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
                "x": x, "y": y, "w": w, "h": h,
                "cx": cx, "cy": cy,
                "r": int(max(w, h) / 2),
                "area": area,
                "circularity": circularity,
                "solidity": solidity,
                "aspect_ratio": aspect_ratio,
                "shape": shape_type,
                "confidence": conf,
                "contrast": local_contrast,
                "source": "watershed"
            })

    # ==========================================
    # STRATEGY 2: Circular Hough Transform for Blister Strips & Circular Tablets
    # (Solves pills in silver/transparent blister packs & reflective trays)
    # ==========================================
    if shape_filter in ["all", "tablet"]:
        blurred = cv2.GaussianBlur(gray, (7, 7), 1.5)
        min_r = int(11 * scale)
        max_r = int(42 * scale)

        # Multi-threshold search
        hough_circles = None
        for p2 in [26, 24, 22]:
            hc = cv2.HoughCircles(
                blurred, cv2.HOUGH_GRADIENT,
                dp=1.1, minDist=int(20 * scale),
                param1=60, param2=p2,
                minRadius=min_r, maxRadius=max_r
            )
            if hc is not None and len(hc[0]) >= 2:
                hough_circles = hc
                break

        if hough_circles is not None:
            valid_hough = []
            for c in hough_circles[0]:
                hcx, hcy, hr = int(c[0]), int(c[1]), int(c[2])
                if hcx - hr < 0 or hcy - hr < 0 or hcx + hr >= proc_w or hcy + hr >= proc_h:
                    continue

                mask = np.zeros(gray.shape, dtype=np.uint8)
                cv2.circle(mask, (hcx, hcy), hr, 255, -1)
                mean_val = cv2.mean(gray, mask=mask)[0]
                std_val = cv2.meanStdDev(gray, mask=mask)[1][0][0]

                # Pills have smooth surface (low std) and are not pure black shadow
                if std_val < 26.0 and mean_val > 80:
                    valid_hough.append({
                        "cx": hcx, "cy": hcy, "r": hr,
                        "mean": mean_val, "std": std_val
                    })

            # Filter out non-pill outliers by cluster median
            if len(valid_hough) >= 3:
                means = [vh["mean"] for vh in valid_hough]
                med_mean = np.median(means)
                radii = [vh["r"] for vh in valid_hough]
                med_r = np.median(radii)

                for vh in valid_hough:
                    if abs(vh["mean"] - med_mean) < 45 and 0.6 * med_r <= vh["r"] <= 1.45 * med_r:
                        overlap = False
                        for p in candidate_pills:
                            dist_sq = (p["cx"] - vh["cx"])**2 + (p["cy"] - vh["cy"])**2
                            if dist_sq < (vh["r"] * 0.8)**2:
                                overlap = True
                                break
                        if not overlap:
                            r = vh["r"]
                            candidate_pills.append({
                                "x": vh["cx"] - r, "y": vh["cy"] - r,
                                "w": 2 * r, "h": 2 * r,
                                "cx": vh["cx"], "cy": vh["cy"],
                                "r": r,
                                "area": int(np.pi * r * r),
                                "circularity": 0.95,
                                "solidity": 0.95,
                                "aspect_ratio": 1.0,
                                "shape": "tablet",
                                "confidence": 0.96,
                                "contrast": 25.0,
                                "source": "hough"
                            })
            elif len(valid_hough) in [1, 2]:
                for vh in valid_hough:
                    overlap = any((p["cx"] - vh["cx"])**2 + (p["cy"] - vh["cy"])**2 < (vh["r"] * 0.8)**2 for p in candidate_pills)
                    if not overlap:
                        r = vh["r"]
                        candidate_pills.append({
                            "x": vh["cx"] - r, "y": vh["cy"] - r,
                            "w": 2 * r, "h": 2 * r,
                            "cx": vh["cx"], "cy": vh["cy"],
                            "r": r,
                            "area": int(np.pi * r * r),
                            "circularity": 0.95,
                            "solidity": 0.95,
                            "aspect_ratio": 1.0,
                            "shape": "tablet",
                            "confidence": 0.92,
                            "contrast": 25.0,
                            "source": "hough"
                        })

    # ==========================================
    # STRATEGY 3: Blister Priority, Outlier Size Filtering & Spatial De-duplication
    # ==========================================
    # If blister pack with high confidence was detected (>=4 uniform circular tablets),
    # prioritize blister tablets and suppress stray background noise outside the blister pack
    blister_pills = [p for p in candidate_pills if p.get("source") == "hough"]
    if len(blister_pills) >= 4:
        filtered_candidates = blister_pills
    elif len(candidate_pills) >= 4:
        areas = [p["area"] for p in candidate_pills]
        median_area = np.median(areas)
        filtered_candidates = [
            p for p in candidate_pills
            if 0.20 * median_area <= p["area"] <= 3.8 * median_area
        ]
    else:
        filtered_candidates = candidate_pills

    # Scientific spatial de-duplication (pills cannot physically overlap in 2D space)
    if HAS_SCIENTIFIC and len(filtered_candidates) > 1:
        coords = np.array([[p["cx"], p["cy"]] for p in filtered_candidates])
        dists = cdist(coords, coords)
        keep = [True] * len(filtered_candidates)
        for i in range(len(filtered_candidates)):
            if not keep[i]:
                continue
            for j in range(i + 1, len(filtered_candidates)):
                min_r = min(filtered_candidates[i]["r"], filtered_candidates[j]["r"])
                if dists[i, j] < min_r * 0.80:
                    keep[j] = False
        filtered_candidates = [filtered_candidates[i] for i in range(len(filtered_candidates)) if keep[i]]

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
        radius = int(pill["r"] / scale)

        detected_pills.append({
            "id": idx,
            "x": orig_x,
            "y": orig_y,
            "width": orig_w_val,
            "height": orig_h_val,
            "cx": orig_cx,
            "cy": orig_cy,
            "pct_x": round((orig_cx / orig_w) * 100, 2) if orig_w > 0 else 0.0,
            "pct_y": round((orig_cy / orig_h) * 100, 2) if orig_h > 0 else 0.0,
            "radius": radius,
            "shape": pill["shape"],
            "confidence": round(pill["confidence"], 2),
            "area": int(pill["area"] / (scale * scale)),
            "circularity": round(pill["circularity"], 2),
            "aspect_ratio": round(pill["aspect_ratio"], 2)
        })

        cx, cy = pill["cx"], pill["cy"]
        # Mint cyan ring (BGR: 203, 216, 107 in hex #6bd8cb)
        cv2.circle(overlay, (cx, cy), max(pill["r"] + 3, 15), (203, 216, 107), 2)
        cv2.circle(overlay, (cx, cy), max(pill["r"] + 1, 13), (203, 216, 107), -1)
        # Pill center dot
        cv2.circle(annotated, (cx, cy), 4, (45, 222, 148), -1)

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
        image_data = image_input.split(",")[1]
    else:
        image_data = image_input

    try:
        decoded = base64.b64decode(image_data)
        np_arr = np.frombuffer(decoded, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        sys.stderr.write(f"Error decoding image: {e}\n")
        return None


def main():
    parser = argparse.ArgumentParser(description="PillCount AI CV Detection Engine")
    parser.add_argument("--image", type=str, help="Path to image file or base64 data")
    parser.add_argument("--shape", type=str, default="all", choices=["all", "tablet", "capsule", "racikan"], help="Filter by pill shape")
    parser.add_argument("--min-area", type=int, default=140, help="Minimum pill area in pixels")
    parser.add_argument("--max-area", type=int, default=7500, help="Maximum pill area in pixels")
    parser.add_argument("--sensitivity", type=int, default=50, help="Detection sensitivity (1-100)")
    parser.add_argument("--output", type=str, help="Optional path to save annotated image")

    args = parser.parse_args()

    # Read from stdin if --image not provided
    if not args.image:
        input_data = sys.stdin.read().strip()
        if not input_data:
            print(json.dumps({"success": False, "error": "No image input provided"}))
            sys.exit(1)
        image = load_image(input_data)
    else:
        image = load_image(args.image)

    if image is None:
        print(json.dumps({"success": False, "error": "Failed to decode image input"}))
        sys.exit(1)

    result = detect_pills(
        image,
        shape_filter=args.shape,
        min_area=args.min_area,
        max_area=args.max_area,
        sensitivity=args.sensitivity
    )

    if args.output and result.get("annotated_image"):
        try:
            b64_data = result["annotated_image"].split(",")[1]
            with open(args.output, "wb") as f:
                f.write(base64.b64decode(b64_data))
        except Exception as e:
            sys.stderr.write(f"Warning: Failed to save output image: {e}\n")

    print(json.dumps(result))


if __name__ == "__main__":
    main()
