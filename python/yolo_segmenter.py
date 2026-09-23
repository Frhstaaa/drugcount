#!/usr/bin/env python3
"""
PillCount — YOLOv8 Instance Segmentation & Morphological Peak Segmenter
Specialized engine for segmenting touching, overlapping, and clustered medicine pills.

Supports:
1. ONNX Runtime (CPU-optimized, low latency, ~40-80ms on CPU)
2. Ultralytics YOLOv8-seg (.pt / .onnx)
3. Scientific H-Maxima / Local Peak Watershed (zero-dependency fallback)
"""

import os
import cv2
import numpy as np

# Check available backends
HAS_ONNX = False
try:
    import onnxruntime as ort
    HAS_ONNX = True
except ImportError:
    pass

HAS_ULTRALYTICS = False
try:
    from ultralytics import YOLO
    HAS_ULTRALYTICS = True
except (ImportError, Exception):
    pass

HAS_SCIPY = False
try:
    import scipy.ndimage as ndi
    HAS_SCIPY = True
except ImportError:
    pass


class YOLOPillSegmenter:
    def __init__(self, model_path=None):
        self.model_path = model_path
        self.session = None
        self.yolo_model = None
        self.backend = None
        self._init_backend()

    def _init_backend(self):
        """Initialize best available segmentation backend."""
        # Check explicit or default model paths
        search_paths = []
        if self.model_path and os.path.exists(self.model_path):
            search_paths.append(self.model_path)

        curr_dir = os.path.dirname(os.path.abspath(__file__))
        search_paths.extend([
            os.path.join(curr_dir, "models", "yolov8_pills_seg.onnx"),
            os.path.join(curr_dir, "models", "yolov8n-seg.onnx"),
            os.path.join(curr_dir, "models", "yolov8n-seg.pt"),
            os.path.join(curr_dir, "models", "best.onnx"),
        ])

        found_path = None
        for p in search_paths:
            if os.path.exists(p) and os.path.getsize(p) > 1000:
                found_path = p
                break

        if found_path:
            self.model_path = found_path
            if found_path.endswith(".onnx") and HAS_ONNX:
                try:
                    opts = ort.SessionOptions()
                    opts.intra_op_num_threads = 1
                    opts.inter_op_num_threads = 1
                    opts.enable_cpu_mem_arena = False
                    opts.enable_mem_pattern = False
                    opts.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
                    opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_BASIC
                    self.session = ort.InferenceSession(found_path, sess_options=opts, providers=["CPUExecutionProvider"])
                    self.backend = "onnxruntime"
                    return
                except Exception as e:
                    pass

            if (found_path.endswith(".pt") or found_path.endswith(".onnx")) and HAS_ULTRALYTICS:
                try:
                    self.yolo_model = YOLO(found_path)
                    self.backend = "ultralytics"
                    return
                except Exception:
                    pass

        # Fallback to high-precision scientific peak watershed
        self.backend = "scientific_watershed"

    def is_available(self):
        return self.backend in ["onnxruntime", "ultralytics"]

    def segment(self, image, min_area=100, max_area=7500, conf_threshold=0.25, iou_threshold=0.50):
        """
        Segment all pills in the given image.
        Returns list of detected pill dicts with masks, contours, and subpixel centroids.
        """
        if self.backend == "onnxruntime" and self.session is not None:
            return self._segment_onnx(image, min_area, max_area, conf_threshold, iou_threshold)
        elif self.backend == "ultralytics" and self.yolo_model is not None:
            return self._segment_ultralytics(image, min_area, max_area, conf_threshold, iou_threshold)
        else:
            return self._segment_scientific_peak_watershed(image, min_area, max_area)

    def _letterbox(self, img, new_shape=(640, 640), color=(114, 114, 114)):
        """Resize and pad image while meeting stride-multiple constraints."""
        shape = img.shape[:2]  # [h, w]
        r = min(new_shape[0] / shape[0], new_shape[1] / shape[1])
        new_unpad = (int(round(shape[1] * r)), int(round(shape[0] * r)))
        dw, dh = new_shape[1] - new_unpad[0], new_shape[0] - new_unpad[1]
        dw /= 2
        dh /= 2

        if shape[::-1] != new_unpad:
            img = cv2.resize(img, new_unpad, interpolation=cv2.INTER_LINEAR)
        top, bottom = int(round(dh - 0.1)), int(round(dh + 0.1))
        left, right = int(round(dw - 0.1)), int(round(dw + 0.1))
        img = cv2.copyMakeBorder(img, top, bottom, left, right, cv2.BORDER_CONSTANT, value=color)
        return img, r, (dw, dh)

    def _segment_onnx(self, image, min_area, max_area, conf_threshold, iou_threshold):
        orig_h, orig_w = image.shape[:2]
        input_img, ratio, (pad_w, pad_h) = self._letterbox(image, (640, 640))
        input_tensor = input_img.transpose((2, 0, 1))[::-1]  # BGR to RGB, HWC to CHW
        input_tensor = np.ascontiguousarray(input_tensor, dtype=np.float32) / 255.0
        input_tensor = input_tensor[None, ...]  # Add batch dim

        input_name = self.session.get_inputs()[0].name
        try:
            outputs = self.session.run(None, {input_name: input_tensor})
        except Exception:
            return self._segment_scientific_peak_watershed(image, min_area, max_area)

        # YOLOv8-seg outputs: output0 = [1, num_channels, 8400], output1 = [1, 32, 160, 160]
        preds = np.squeeze(outputs[0]).T  # shape [8400, num_channels]
        protos = np.squeeze(outputs[1])   # shape [32, 160, 160]

        num_channels = preds.shape[1]
        num_classes = num_channels - 4 - 32
        boxes_data = preds[:, :4]
        scores_data = preds[:, 4:4 + num_classes]
        mask_coeffs_data = preds[:, 4 + num_classes:]

        # Class-agnostic object confidence
        max_scores = np.max(scores_data, axis=1)
        valid_indices = np.where(max_scores >= conf_threshold)[0]

        if len(valid_indices) == 0:
            return self._segment_scientific_peak_watershed(image, min_area, max_area)

        kept_boxes = []
        kept_scores = []
        kept_coeffs = []

        for idx in valid_indices:
            cx, cy, w, h = boxes_data[idx]
            x1 = cx - w / 2
            y1 = cy - h / 2
            kept_boxes.append([int(x1), int(y1), int(w), int(h)])
            kept_scores.append(float(max_scores[idx]))
            kept_coeffs.append(mask_coeffs_data[idx])

        indices = cv2.dnn.NMSBoxes(kept_boxes, kept_scores, conf_threshold, iou_threshold)
        if len(indices) == 0:
            return self._segment_scientific_peak_watershed(image, min_area, max_area)

        pills = []
        for i in indices.flatten():
            box = kept_boxes[i]
            coeff = kept_coeffs[i]
            score = kept_scores[i]

            # Reconstruct mask at 160x160
            raw_mask = np.matmul(coeff, protos.reshape(32, -1)).reshape(160, 160)
            mask_160 = 1.0 / (1.0 + np.exp(-raw_mask))  # sigmoid

            # Crop to bounding box in 160x160 coords
            scale_proto = 160.0 / 640.0
            bx1 = max(0, int(round(box[0] * scale_proto)))
            by1 = max(0, int(round(box[1] * scale_proto)))
            bx2 = min(160, int(round((box[0] + box[2]) * scale_proto)))
            by2 = min(160, int(round((box[1] + box[3]) * scale_proto)))

            cropped_mask = np.zeros_like(mask_160)
            cropped_mask[by1:by2, bx1:bx2] = mask_160[by1:by2, bx1:bx2]

            # Upscale mask to 640x640
            mask_640 = cv2.resize(cropped_mask, (640, 640), interpolation=cv2.INTER_LINEAR)
            # Remove letterbox padding
            unpadded_mask = mask_640[int(pad_h):int(640 - pad_h), int(pad_w):int(640 - pad_w)]
            mask_orig = cv2.resize(unpadded_mask, (orig_w, orig_h), interpolation=cv2.INTER_LINEAR)

            binary_mask = (mask_orig > 0.50).astype(np.uint8) * 255
            contours, _ = cv2.findContours(binary_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if not contours:
                continue

            c = max(contours, key=cv2.contourArea)
            area = cv2.contourArea(c)
            if area < min_area or area > max_area:
                continue

            pill_item = self._extract_pill_props(c, orig_w, orig_h, score, len(pills) + 1)
            if pill_item:
                pills.append(pill_item)

        if not pills:
            return self._segment_scientific_peak_watershed(image, min_area, max_area)

        return pills

    def _segment_ultralytics(self, image, min_area, max_area, conf_threshold, iou_threshold):
        orig_h, orig_w = image.shape[:2]
        results = self.yolo_model.predict(
            source=image,
            conf=conf_threshold,
            iou=iou_threshold,
            retina_masks=True,
            verbose=False,
            device="cpu"
        )
        if not results or len(results) == 0 or results[0].masks is None:
            return self._segment_scientific_peak_watershed(image, min_area, max_area)

        pills = []
        res = results[0]
        for idx, (box, seg) in enumerate(zip(res.boxes, res.masks.xy)):
            if len(seg) < 3:
                continue
            contour = np.array(seg, dtype=np.int32).reshape((-1, 1, 2))
            area = cv2.contourArea(contour)
            if area < min_area or area > max_area:
                continue

            score = float(box.conf[0]) if hasattr(box, "conf") else 0.95
            pill_item = self._extract_pill_props(contour, orig_w, orig_h, score, len(pills) + 1)
            if pill_item:
                pills.append(pill_item)

        if not pills:
            return self._segment_scientific_peak_watershed(image, min_area, max_area)

        return pills

    def _segment_scientific_peak_watershed(self, image, min_area, max_area):
        """
        Scientific Distance Transform Watershed with Local Maxima Peak Separation.
        Splits physically touching pills even without external AI weights!
        """
        orig_h, orig_w = image.shape[:2]
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Contrast enhancement & noise reduction
        clahe = cv2.createCLAHE(clipLimit=2.2, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        denoised = cv2.bilateralFilter(enhanced, 7, 50, 50)

        # Otsu binarization
        border_vals = np.concatenate([
            denoised[0:12, :].flatten(),
            denoised[-12:, :].flatten(),
            denoised[:, 0:12].flatten(),
            denoised[:, -12:].flatten()
        ])
        bg = np.median(border_vals)
        thresh_flag = cv2.THRESH_BINARY if bg < 120 else cv2.THRESH_BINARY_INV
        _, binary = cv2.threshold(denoised, 0, 255, thresh_flag + cv2.THRESH_OTSU)

        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        cleaned = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel, iterations=1)
        cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_CLOSE, kernel, iterations=2)

        # Exact Euclidean distance transform
        if HAS_SCIPY:
            dist = ndi.distance_transform_edt(cleaned == 255).astype(np.float32)
        else:
            dist = cv2.distanceTransform(cleaned, cv2.DIST_L2, 5)

        if dist.max() <= 0:
            return []

        # Peak detection: find local maxima in distance transform to separate touching pills
        if HAS_SCIPY:
            # Maximum filter to find distinct pill centers (peaks)
            neighborhood_size = 15
            local_max = ndi.maximum_filter(dist, size=neighborhood_size) == dist
            # Only keep peaks that are significant foreground
            peaks = local_max & (dist > (0.28 * dist.max())) & (dist >= 5.0)
            markers, num_markers = ndi.label(peaks)
        else:
            _, sure_fg = cv2.threshold(dist, 0.35 * dist.max(), 255, 0)
            num_markers, markers = cv2.connectedComponents(np.uint8(sure_fg))

        if num_markers == 0:
            return []

        # Proper watershed marker assignment:
        # 0 = unknown region to be resolved by watershed
        # 1 = definite background
        # 2, 3, ... = individual pill seed peaks
        markers_ws = np.zeros(cleaned.shape, dtype=np.int32)
        sure_bg = cv2.dilate(cleaned, kernel, iterations=5) == 0
        markers_ws[sure_bg] = 1
        markers_ws[markers > 0] = markers[markers > 0] + 1

        watershed_canvas = cv2.cvtColor(denoised, cv2.COLOR_GRAY2BGR)
        markers_ws = cv2.watershed(watershed_canvas, markers_ws)

        pills = []
        for label in range(2, num_markers + 2):
            mask = np.zeros(cleaned.shape, dtype=np.uint8)
            mask[markers_ws == label] = 255

            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if not contours:
                continue

            c = max(contours, key=cv2.contourArea)
            area = cv2.contourArea(c)
            if area < min_area or area > max_area:
                continue

            pill_item = self._extract_pill_props(c, orig_w, orig_h, 0.95, len(pills) + 1)
            if pill_item:
                pills.append(pill_item)

        return pills

    def _extract_pill_props(self, contour, orig_w, orig_h, score, item_id):
        """Extract physical metrics, simplified contour polygon, and subpixel centroid."""
        area = cv2.contourArea(contour)
        x, y, w, h = cv2.boundingRect(contour)
        peri = cv2.arcLength(contour, True)
        if peri == 0:
            return None

        circularity = 4 * np.pi * (area / (peri * peri))
        hull = cv2.convexHull(contour)
        hull_area = cv2.contourArea(hull)
        solidity = float(area) / hull_area if hull_area > 0 else 0
        aspect_ratio = float(max(w, h)) / max(min(w, h), 1)

        # Minimum physical validity check
        if solidity < 0.60 or circularity < 0.22:
            return None

        # Moments for subpixel centroid
        M = cv2.moments(contour)
        if M["m00"] > 0:
            cx = M["m10"] / M["m00"]
            cy = M["m01"] / M["m00"]
        else:
            cx = x + w / 2.0
            cy = y + h / 2.0

        # Classify shape
        if solidity >= 0.70 and aspect_ratio <= 1.65 and circularity >= 0.35:
            shape = "tablet"
        elif solidity >= 0.68 and 1.35 <= aspect_ratio <= 4.2 and circularity >= 0.25:
            shape = "capsule"
        else:
            shape = "racikan"

        # Simplify polygon for lightweight frontend SVG transmission
        epsilon = 0.015 * peri
        approx = cv2.approxPolyDP(contour, epsilon, True)
        polygon = []
        for pt in approx:
            px = round(float(pt[0][0]) / orig_w, 4)
            py = round(float(pt[0][1]) / orig_h, 4)
            polygon.append([px, py])

        pct_x = round(float(cx) / orig_w, 4)
        pct_y = round(float(cy) / orig_h, 4)

        return {
            "id": item_id,
            "x": int(x),
            "y": int(y),
            "width": int(w),
            "height": int(h),
            "centroid": [round(float(cx), 1), round(float(cy), 1)],
            "pct_x": pct_x,
            "pct_y": pct_y,
            "area": round(float(area), 1),
            "circularity": round(float(circularity), 3),
            "solidity": round(float(solidity), 3),
            "aspect_ratio": round(float(aspect_ratio), 2),
            "shape": shape,
            "confidence": round(float(score), 3),
            "polygon": polygon
        }
