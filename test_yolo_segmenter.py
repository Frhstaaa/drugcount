#!/usr/bin/env python3
"""
Test script for YOLOPillSegmenter.
"""
import cv2
import numpy as np
import os
import sys

# Add python dir to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "python"))
from yolo_segmenter import YOLOPillSegmenter

def main():
    print("Testing YOLOPillSegmenter...")
    segmenter = YOLOPillSegmenter()
    print(f"Active backend: {segmenter.backend}")

    # Test 1: Synthetic touching pills
    # Create an image with 2 touching white circular pills on dark background
    canvas = np.zeros((400, 400, 3), dtype=np.uint8)
    # Pill 1 at (170, 200), radius 35
    cv2.circle(canvas, (170, 200), 35, (230, 230, 230), -1)
    # Pill 2 touching Pill 1 at (230, 200), radius 35 (centers 60px apart, overlap by 10px!)
    cv2.circle(canvas, (230, 200), 35, (230, 230, 230), -1)

    pills = segmenter.segment(canvas, min_area=50, max_area=15000)
    print(f"Touching Pills Test: Detected {len(pills)} pills (Expected: 2)")
    for p in pills:
        print(f" - Pill {p['id']}: Centroid={p['centroid']}, Shape={p['shape']}, Area={p['area']}, Polygon points={len(p['polygon'])}")

    assert len(pills) == 2, f"Expected 2 pills for touching test, got {len(pills)}"
    print("TOUCHING PILLS SEGMENTATION TEST: PASSED!")

    # Test 2: Real test image if exists
    test_img = "test_blister_1.jpg"
    if os.path.exists(test_img):
        img = cv2.imread(test_img)
        pills_real = segmenter.segment(img)
        print(f"Real Image Test ({test_img}): Detected {len(pills_real)} pills")

    print("ALL TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    main()
