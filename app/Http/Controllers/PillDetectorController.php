<?php

namespace App\Http\Controllers;

use App\Models\CountingSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\Process\Process;

class PillDetectorController extends Controller
{
    /**
     * Run Python pill detection on an incoming webcam image frame.
     */
    public function detect(Request $request)
    {
        $validated = $request->validate([
            'image' => 'required|string',
            'shape' => 'nullable|string|in:all,tablet,capsule,racikan',
            'min_area' => 'nullable|integer|min:20|max:10000',
            'max_area' => 'nullable|integer|min:500|max:200000',
            'sensitivity' => 'nullable|integer|min:1|max:100',
            'engine' => 'nullable|string|in:auto,yolo,classic',
        ]);

        $shape = $validated['shape'] ?? 'all';
        $minArea = $validated['min_area'] ?? 120;
        $maxArea = $validated['max_area'] ?? 120000;
        $sensitivity = $validated['sensitivity'] ?? 50;
        $engine = $validated['engine'] ?? 'auto';
        $imageB64 = $validated['image'];

        // Option 1: Try local Python microservice (port 5175) for ultra-low latency
        try {
            $response = Http::timeout(20.0)->post('http://127.0.0.1:5175/detect', [
                'image' => $imageB64,
                'shape' => $shape,
                'min_area' => $minArea,
                'max_area' => $maxArea,
                'sensitivity' => $sensitivity,
                'engine' => $engine,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                if (!empty($data['success'])) {
                    $data['engine'] = 'python_daemon';
                    return response()->json($data);
                }
            }
        } catch (\Throwable $e) {
            // Daemon not running or timed out, gracefully fallback to CLI execution below
        }

        // Option 2: Direct CLI execution via python detect_pills.py
        try {
            $binaryImage = null;
            if (strpos($imageB64, 'data:image') === 0) {
                $parts = explode(',', $imageB64, 2);
                if (isset($parts[1])) {
                    $binaryImage = base64_decode($parts[1]);
                }
            } else {
                $binaryImage = base64_decode($imageB64);
            }

            if ($binaryImage !== null && strlen($binaryImage) > 10) {
                $tmpFile = tempnam(sys_get_temp_dir(), 'pill_') . '.jpg';
                file_put_contents($tmpFile, $binaryImage);
            } else {
                $tmpFile = tempnam(sys_get_temp_dir(), 'pill_') . '.txt';
                file_put_contents($tmpFile, $imageB64);
            }

            $pythonScript = base_path('python/detect_pills.py');
            $pythonBin = $this->getPythonBinary();

            $process = new Process(
                [
                    $pythonBin,
                    $pythonScript,
                    '--image', $tmpFile,
                    '--shape', $shape,
                    '--min-area', (string)$minArea,
                    '--max-area', (string)$maxArea,
                    '--sensitivity', (string)$sensitivity,
                    '--engine', $engine,
                ],
                base_path(),
                [
                    'OMP_NUM_THREADS' => '1',
                    'OPENBLAS_NUM_THREADS' => '1',
                    'MKL_NUM_THREADS' => '1',
                    'VECLIB_MAXIMUM_THREADS' => '1',
                    'NUMEXPR_NUM_THREADS' => '1',
                ]
            );

            $process->setTimeout(20);
            $process->run();

            if (file_exists($tmpFile)) {
                @unlink($tmpFile);
            }

            if (!$process->isSuccessful()) {
                $err = trim($process->getErrorOutput() ?: $process->getOutput());
                return response()->json([
                    'success' => false,
                    'error' => "Gagal menjalankan deteksi computer vision ({$pythonBin}): " . ($err ?: 'Process failed with exit code ' . $process->getExitCode()),
                ], 500);
            }

            $output = $process->getOutput();
            $data = json_decode($output, true);

            if (json_last_error() !== JSON_ERROR_NONE || empty($data)) {
                return response()->json([
                    'success' => false,
                    'error' => 'Format output dari deteksi Python tidak valid.',
                    'raw_output' => substr($output, 0, 500),
                ], 500);
            }

            $data['engine'] = 'python_cli';
            return response()->json($data);

        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'error' => 'Kesalahan sistem saat deteksi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Determine available Python binary on current server environment.
     */
    protected function getPythonBinary(): string
    {
        if ($envBin = env('PYTHON_BIN')) {
            return $envBin;
        }

        // Check isolated virtual environment first (guaranteed compatible NumPy 1.x)
        $venvLinux = base_path('python/venv/bin/python');
        if (file_exists($venvLinux)) {
            return $venvLinux;
        }

        $venvWin = base_path('python/venv/Scripts/python.exe');
        if (file_exists($venvWin)) {
            return $venvWin;
        }

        $isWindows = (DIRECTORY_SEPARATOR === '\\');
        $candidates = $isWindows 
            ? ['python', 'py'] 
            : ['python3', '/usr/bin/python3', '/usr/local/bin/python3', 'python'];

        foreach ($candidates as $bin) {
            $cmd = $isWindows ? "where {$bin}" : "which {$bin}";
            $out = @shell_exec($cmd . ' 2>&1');
            if ($out && trim($out) !== '' && strpos($out, 'not found') === false) {
                $lines = explode("\n", trim($out));
                $first = trim($lines[0]);
                if (file_exists($first) || !$isWindows) {
                    return $first;
                }
            }
        }

        return $isWindows ? 'python' : 'python3';
    }

    /**
     * Check health status of Python CV engines (Microservice Daemon or Subprocess CLI).
     */
    public function health()
    {
        $status = [
            'status' => 'offline',
            'daemon' => false,
            'cli' => false,
            'python_bin' => $this->getPythonBinary(),
            'version' => null,
            'message' => '',
        ];

        // 1. Check Python daemon on port 5175
        try {
            $res = Http::timeout(1.2)->get('http://127.0.0.1:5175/health');
            if ($res->successful() && $res->json('status') === 'online') {
                $status['status'] = 'online';
                $status['daemon'] = true;
                $status['mode'] = 'HTTP Microservice (:5175)';
                $status['details'] = $res->json();
                return response()->json($status);
            }
        } catch (\Throwable $e) {
            // Daemon not running, proceed to check CLI
        }

        // 2. Check Python CLI subprocess
        try {
            $pythonBin = $this->getPythonBinary();
            $process = new Process([$pythonBin, '--version']);
            $process->setTimeout(3);
            $process->run();

            if ($process->isSuccessful()) {
                $verOutput = trim($process->getOutput() ?: $process->getErrorOutput());
                $status['status'] = 'online';
                $status['cli'] = true;
                $status['mode'] = "Python CLI Subprocess ({$pythonBin})";
                $status['version'] = $verOutput;
                return response()->json($status);
            } else {
                $status['message'] = "Binary {$pythonBin} tidak dapat dijalankan: " . $process->getErrorOutput();
            }
        } catch (\Throwable $e) {
            $status['message'] = $e->getMessage();
        }

        return response()->json($status, 200);
    }

    /**
     * Store a verified pill counting session with snapshot and metadata.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'prescription_no' => 'nullable|string|max:100',
            'medicine_name' => 'required|string|max:255',
            'pharmacist_name' => 'nullable|string|max:255',
            'shape_filter' => 'nullable|string|max:50',
            'auto_count' => 'required|integer|min:0',
            'manual_count' => 'required|integer|min:0',
            'confidence_score' => 'nullable|numeric',
            'lighting_quality' => 'nullable|string|max:50',
            'blur_score' => 'nullable|numeric',
            'raw_image' => 'nullable|string', // base64
            'annotated_image' => 'nullable|string', // base64
            'detected_items' => 'nullable|array',
            'notes' => 'nullable|string|max:1000',
        ]);

        $rawPath = null;
        $annotatedPath = null;

        // Save raw image snapshot
        if (!empty($validated['raw_image'])) {
            $rawPath = $this->saveBase64Image($validated['raw_image'], 'raw_');
        }

        // Save annotated image snapshot
        if (!empty($validated['annotated_image'])) {
            $annotatedPath = $this->saveBase64Image($validated['annotated_image'], 'annotated_');
        }

        $userId = auth()->id();
        $pharmacistName = !empty($validated['pharmacist_name']) 
            ? $validated['pharmacist_name'] 
            : (auth()->user()?->name ?? 'Petugas Farmasi');

        $sessionData = [
            'prescription_no' => $validated['prescription_no'] ?? ('RX-' . strtoupper(Str::random(6))),
            'medicine_name' => $validated['medicine_name'],
            'pharmacist_name' => $pharmacistName,
            'shape_filter' => $validated['shape_filter'] ?? 'all',
            'auto_count' => $validated['auto_count'],
            'manual_count' => $validated['manual_count'],
            'confidence_score' => $validated['confidence_score'] ?? 98.5,
            'lighting_quality' => $validated['lighting_quality'] ?? 'optimal',
            'blur_score' => $validated['blur_score'] ?? null,
            'image_path' => $rawPath,
            'annotated_image_path' => $annotatedPath,
            'detected_items' => $validated['detected_items'] ?? [],
            'notes' => $validated['notes'] ?? null,
        ];

        if (Schema::hasColumn('counting_sessions', 'user_id')) {
            $sessionData['user_id'] = $userId;
        }

        $session = CountingSession::create($sessionData);

        return response()->json([
            'success' => true,
            'message' => 'Sesi verifikasi hitung obat berhasil disimpan.',
            'session' => $session,
        ]);
    }

    /**
     * List past counting sessions (scoped to current user).
     */
    public function list(Request $request)
    {
        $userId = auth()->id();
        $query = CountingSession::query()->orderBy('created_at', 'desc');

        if (Schema::hasColumn('counting_sessions', 'user_id') && $userId) {
            $query->where('user_id', $userId);
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('medicine_name', 'like', "%{$search}%")
                  ->orWhere('prescription_no', 'like', "%{$search}%")
                  ->orWhere('pharmacist_name', 'like', "%{$search}%");
            });
        }

        if ($request->filled('shape') && $request->input('shape') !== 'all') {
            $query->where('shape_filter', $request->input('shape'));
        }

        $sessions = $query->paginate(15);

        return response()->json($sessions);
    }

    /**
     * Delete a counting session (user must own this session).
     */
    public function destroy($id)
    {
        $userId = auth()->id();
        $query = CountingSession::query();

        if (Schema::hasColumn('counting_sessions', 'user_id') && $userId) {
            $query->where('user_id', $userId);
        }

        $session = $query->findOrFail($id);

        if ($session->image_path && Storage::disk('public')->exists(str_replace('/storage/', '', $session->image_path))) {
            Storage::disk('public')->delete(str_replace('/storage/', '', $session->image_path));
        }
        if ($session->annotated_image_path && Storage::disk('public')->exists(str_replace('/storage/', '', $session->annotated_image_path))) {
            Storage::disk('public')->delete(str_replace('/storage/', '', $session->annotated_image_path));
        }

        $session->delete();

        return response()->json([
            'success' => true,
            'message' => 'Riwayat sesi hitung berhasil dihapus.',
        ]);
    }

    /**
     * Helper to save base64 image data into storage.
     */
    protected function saveBase64Image(string $base64Data, string $prefix): string
    {
        if (preg_match('/^data:image\/(\w+);base64,/', $base64Data, $type)) {
            $data = substr($base64Data, strpos($base64Data, ',') + 1);
            $type = strtolower($type[1]); // jpg, png, jpeg
            if ($type === 'jpeg') $type = 'jpg';
            $data = base64_decode($data);
            if ($data === false) {
                return '';
            }
        } else {
            $data = base64_decode($base64Data);
            $type = 'jpg';
        }

        $filename = $prefix . date('Ymd_His') . '_' . Str::random(6) . '.' . $type;
        $path = 'sessions/' . $filename;

        Storage::disk('public')->put($path, $data);

        return '/storage/' . $path;
    }
}
