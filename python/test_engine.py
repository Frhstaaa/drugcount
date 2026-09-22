#!/usr/bin/env python3
"""
Unit test for PillCount CV engine using synthetically generated pill tray
"""
import numpy as np
import cv2
import json
from detect_pills import detect_pills

def generate_test_pill_tray():
    # 800x600 dark blue medical tray background (matching typical pharmacy tray)
    img = np.zeros((600, 800, 3), dtype=np.uint8)
    img[:] = (38, 27, 11) # Dark navy / blue in BGR

    # Draw a slight tray border
    cv2.rectangle(img, (20, 20), (780, 580), (55, 42, 20), 2)

    # 1. Draw 10 white circular tablets (radius 18)
    tablet_positions = [
        (150, 120), (280, 140), (420, 110), (560, 150), (680, 130),
        (180, 260), (320, 240), (450, 270), (590, 250), (710, 280)
    ]
    for (cx, cy) in tablet_positions:
        cv2.circle(img, (cx, cy), 18, (240, 245, 250), -1)
        # Inner debossed score line (like a scored tablet)
        cv2.line(img, (cx - 10, cy), (cx + 10, cy), (200, 205, 210), 2)

    # 2. Draw 6 oval/capsule pills (length 48, width 20)
    capsule_positions = [
        (160, 420, 0), (300, 400, 45), (460, 430, 90),
        (600, 410, 30), (250, 510, -20), (520, 500, 60)
    ]
    for (cx, cy, angle) in capsule_positions:
        # Ellipse for capsule
        cv2.ellipse(img, (cx, cy), (26, 12), angle, 0, 360, (230, 230, 240), -1)

    # 3. Draw 2 touching tablets (to test watershed separation!)
    cv2.circle(img, (380, 480), 18, (245, 245, 245), -1)
    cv2.circle(img, (408, 480), 18, (245, 245, 245), -1) # touching at edge

    return img

def main():
    print("Generating synthetic pill test image...")
    test_img = generate_test_pill_tray()

    # Save test image
    cv2.imwrite("python/test_tray.jpg", test_img)
    print("Saved to python/test_tray.jpg")

    print("\nRunning Pill Detection...")
    res = detect_pills(test_img, shape_filter="all", sensitivity=50)

    print("Success:", res["success"])
    print("Pills Counted:", res["count"])
    print("Quality Info:", res["quality"])
    print(f"Sample Pill [0]:", res["pills"][0] if res["pills"] else "None")

    assert res["success"] == True
    # We drew 10 tablets + 6 capsules + 2 touching tablets = 18 pills
    print(f"Expected ~18 pills, detected: {res['count']}")
    assert res["count"] >= 16, f"Expected at least 16 pills, got {res['count']}"
    print("\nTest passed successfully!")

if __name__ == "__main__":
    main()
