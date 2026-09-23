#!/usr/bin/env python3
"""
PillCount Python Microservice Server
Lightweight HTTP API for real-time OpenCV pill detection & analysis.
Listens on http://127.0.0.1:5175
Features:
- Dynamic module hot-reloading (automatically picks up detect_pills.py updates without needing daemon restart)
- Single-thread low-memory footprint (<50MB VIRT)
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
import time
import importlib
from http.server import HTTPServer, BaseHTTPRequestHandler
import numpy as np
import cv2

# Disable OpenCV multi-threading & OpenCL to keep VIRT memory tiny
try:
    cv2.setNumThreads(1)
    cv2.ocl.setUseOpenCL(False)
except Exception:
    pass

# Import detection logic
import detect_pills

HOST = "127.0.0.1"
PORT = 5175


class PillDetectionHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        if self.path in ["/health", "/"]:
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            yolo_seg = getattr(detect_pills, "_yolo_segmenter", None)
            resp = {
                "status": "online",
                "service": "PillCount Python CV Engine",
                "version": "3.0-yolo-instance-seg",
                "yolo_available": yolo_seg is not None and yolo_seg.is_available(),
                "active_backend": yolo_seg.backend if yolo_seg else "none",
                "opencv_version": cv2.__version__,
                "server_time": time.strftime("%Y-%m-%d %H:%M:%S")
            }
            self.wfile.write(json.dumps(resp).encode("utf-8"))
        elif self.path == "/reload":
            try:
                importlib.reload(detect_pills)
                msg = "Engine reloaded successfully"
            except Exception as e:
                msg = f"Reload error: {e}"
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "message": msg}).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == "/detect":
            start_time = time.time()
            content_length = int(self.headers.get("Content-Length", 0))
            post_data = self.rfile.read(content_length)

            try:
                # Dynamic hot-reload: always use newest detect_pills logic
                try:
                    importlib.reload(detect_pills)
                except Exception:
                    pass

                payload = json.loads(post_data.decode("utf-8"))
                image_input = payload.get("image")
                if not image_input:
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json")
                    self._send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": False, "error": "Missing 'image' parameter"}).encode("utf-8"))
                    return

                shape_filter = payload.get("shape", "all")
                min_area = int(payload.get("min_area", 120))
                max_area = int(payload.get("max_area", 120000))
                sensitivity = int(payload.get("sensitivity", 50))
                engine = payload.get("engine", "auto")

                img = detect_pills.load_image(image_input)
                result = detect_pills.detect_pills(
                    img,
                    shape_filter=shape_filter,
                    min_area=min_area,
                    max_area=max_area,
                    sensitivity=sensitivity,
                    engine=engine
                )
                result["latency_ms"] = round((time.time() - start_time) * 1000, 1)

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(result).encode("utf-8"))

            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        # Suppress noisy logs, print concise summary
        sys.stderr.write(f"[PillCV] {self.address_string()} - {args[0]} {args[1]}\n")


def run_server():
    server_address = (HOST, PORT)
    httpd = HTTPServer(server_address, PillDetectionHandler)
    print(f"[PillCount CV Engine] Server running at http://{HOST}:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down PillCount CV Engine server...")
        httpd.server_close()


if __name__ == "__main__":
    run_server()
