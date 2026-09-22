<?php
/**
 * PillCount — CyberPanel Web Terminal & Command Runner
 * Pengganti Terminal SSH untuk mengeksekusi perintah shell langsung dari browser web.
 * 
 * Akses: https://domainanda.com/terminal.php (atau https://domainanda.com/public/terminal.php)
 * Password default: deploy123
 */

@set_time_limit(600);
@ini_set('memory_limit', '1024M');
@ini_set('max_execution_time', '600');

session_start();

define('TERMINAL_SECRET', 'deploy123'); // Ganti kata sandi ini jika diinginkan

// Deteksi direktori root proyek
$currentDir = __DIR__;
$baseDir = file_exists($currentDir . '/artisan') ? $currentDir : dirname($currentDir);

// Konfigurasi Environment penting
$composerHome = $baseDir . '/storage/composer';
if (!is_dir($composerHome)) {
    @mkdir($composerHome, 0777, true);
}
putenv("HOME={$baseDir}");
putenv("COMPOSER_HOME={$composerHome}");
$_ENV['HOME'] = $baseDir;
$_ENV['COMPOSER_HOME'] = $composerHome;

// Cek logout
if (isset($_GET['logout'])) {
    unset($_SESSION['terminal_auth']);
    header('Location: ' . strtok($_SERVER["REQUEST_URI"], '?'));
    exit;
}

// Cek login
if (isset($_POST['password'])) {
    if ($_POST['password'] === TERMINAL_SECRET) {
        $_SESSION['terminal_auth'] = true;
    } else {
        $loginError = "Password salah!";
    }
}

$isLoggedIn = !empty($_SESSION['terminal_auth']);

// Daftar Tombol Shortcut Cepat
$quickCommands = [
    'fix_signal11' => [
        'label' => '⚡ 1-Click Fix Signal 11 (NumPy & OpenCV)',
        'cmd' => 'python3 -m pip install "numpy>=1.24.0,<2.0.0" "opencv-python-headless>=4.8.0,<5.0.0" "pillow>=10.0.0" --force-reinstall --no-warn-script-location',
        'desc' => 'Menurunkan NumPy ke versi 1.x agar tidak lagi crash (Signal 11 / Segfault)'
    ],
    'git_pull' => [
        'label' => '🔄 Git Pull & Update Semua',
        'cmd' => 'git fetch origin main && git reset --hard origin/main && git pull origin main && php artisan migrate --force && php artisan optimize:clear && fuser -k 5175/tcp 2>/dev/null; pkill -f "python.*server.py" 2>/dev/null; nohup python3 python/server.py > python/server.log 2>&1 & sleep 1; curl -s http://127.0.0.1:5175/health || echo "Daemon aktif"',
        'desc' => 'Menarik kode terbaru, migrasi DB, dan otomatis menyalakan ulang engine Python terbaru'
    ],
    'run_migrate' => [
        'label' => '🗄️ Jalankan Database Migration',
        'cmd' => 'php artisan migrate --force',
        'desc' => 'Menjalankan migrasi database saat ini'
    ],
    'migrate_mysql' => [
        'label' => '🐬 1-Click Pindah & Migrasi ke MySQL',
        'cmd' => 'php update_mysql.php',
        'desc' => 'Mengalihkan database ke MySQL (drug_drugcount) dan menyalin data lama otomatis'
    ],
    'start_daemon' => [
        'label' => '🐍 Nyalakan Python Server (:5175)',
        'cmd' => 'fuser -k 5175/tcp 2>/dev/null; pkill -f "python.*server.py" 2>/dev/null; nohup python3 python/server.py > python/server.log 2>&1 & sleep 1; curl -s http://127.0.0.1:5175/health || echo "Daemon dimulai"',
        'desc' => 'Menjalankan server deteksi obat ultra cepat di latar belakang'
    ],
    'test_engine' => [
        'label' => '🧪 Uji Coba Engine Deteksi Obat',
        'cmd' => 'python3 python/detect_pills.py --shape all',
        'desc' => 'Mengetes apakah OpenCV dan script deteksi berjalan normal tanpa crash'
    ],
    'check_modules' => [
        'label' => '🔍 Cek Versi Python & Modul',
        'cmd' => 'python3 --version && python3 -c "import cv2, numpy as np; print(\'OpenCV:\', cv2.__version__, \'| NumPy:\', np.__version__)"',
        'desc' => 'Menampilkan versi Python, OpenCV, dan NumPy aktif'
    ],
    'composer_install' => [
        'label' => '📦 Composer Install',
        'cmd' => 'composer install --no-dev --optimize-autoloader --no-interaction',
        'desc' => 'Menginstal / memperbarui paket PHP Laravel'
    ],
    'artisan_clear' => [
        'label' => '🧹 Clear & Refresh Cache',
        'cmd' => 'php artisan optimize:clear && php artisan config:cache && php artisan route:cache && php artisan view:cache',
        'desc' => 'Membersihkan semua cache konfigurasi, view, dan routing'
    ]
];

// Eksekusi Perintah
$outputLog = '';
$executedCmd = '';
if ($isLoggedIn && ($_SERVER['REQUEST_METHOD'] === 'POST')) {
    if (isset($_POST['quick_action']) && isset($quickCommands[$_POST['quick_action']])) {
        $executedCmd = $quickCommands[$_POST['quick_action']]['cmd'];
    } elseif (!empty($_POST['custom_cmd'])) {
        $executedCmd = trim($_POST['custom_cmd']);
    }

    if ($executedCmd !== '') {
        $fullCmd = "cd " . escapeshellarg($baseDir) . " && " . $executedCmd . " 2>&1";
        $outputArr = [];
        $returnCode = 0;
        exec($fullCmd, $outputArr, $returnCode);
        $outputLog = implode("\n", $outputArr);
        if ($outputLog === '') {
            $outputLog = "[Perintah selesai dieksekusi tanpa pesan output (Exit Code: {$returnCode})]";
        }
    }
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>PillCount — Web Terminal CyberPanel</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; }
        body {
            background-color: #060e20;
            color: #dae2fd;
            font-family: 'JetBrains Mono', -apple-system, monospace;
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
            min-height: 100vh;
        }
        .container {
            width: 100%;
            max-width: 900px;
        }
        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
            background: #171f33;
            padding: 16px 20px;
            border-radius: 16px;
            border: 1px solid #2d3449;
        }
        .header h1 {
            font-size: 18px;
            margin: 0;
            color: #6bd8cb;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .badge {
            font-size: 11px;
            background: rgba(107, 216, 203, 0.15);
            color: #6bd8cb;
            padding: 3px 8px;
            border-radius: 6px;
            border: 1px solid rgba(107, 216, 203, 0.3);
        }
        .card {
            background: #171f33;
            border: 1px solid #2d3449;
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .terminal-window {
            background: #0b1326;
            border: 1px solid #2d3449;
            border-radius: 12px;
            overflow: hidden;
            margin-bottom: 20px;
        }
        .terminal-header {
            background: #131b2e;
            padding: 10px 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid #2d3449;
            font-size: 12px;
            color: #879391;
        }
        .terminal-dots {
            display: flex;
            gap: 6px;
        }
        .dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
        }
        .dot-red { background: #ff5f56; }
        .dot-yellow { background: #ffbd2e; }
        .dot-green { background: #27c93f; }
        .terminal-body {
            padding: 16px;
            min-height: 200px;
            max-height: 480px;
            overflow-y: auto;
            color: #a6f4e6;
            font-size: 12.5px;
            line-height: 1.6;
            white-space: pre-wrap;
            word-break: break-all;
        }
        .quick-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
            gap: 10px;
            margin-bottom: 20px;
        }
        .btn-quick {
            background: #1f293d;
            border: 1px solid #334155;
            color: #dae2fd;
            padding: 12px 14px;
            border-radius: 12px;
            text-align: left;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .btn-quick:hover {
            background: #27354f;
            border-color: #6bd8cb;
            transform: translateY(-1px);
        }
        .btn-quick.highlight {
            background: rgba(148, 222, 45, 0.12);
            border-color: #94de2d;
            color: #acf847;
        }
        .btn-quick.highlight:hover {
            background: rgba(148, 222, 45, 0.2);
        }
        .btn-title {
            font-size: 13px;
            font-weight: bold;
        }
        .btn-desc {
            font-size: 11px;
            color: #879391;
        }
        .cmd-form {
            display: flex;
            gap: 10px;
        }
        .cmd-input {
            flex: 1;
            padding: 13px 16px;
            background: #0b1326;
            border: 1px solid #3d4947;
            border-radius: 12px;
            color: #fff;
            font-family: inherit;
            font-size: 13.5px;
            outline: none;
        }
        .cmd-input:focus {
            border-color: #6bd8cb;
        }
        .btn-submit {
            background: #6bd8cb;
            color: #003732;
            border: none;
            padding: 0 24px;
            border-radius: 12px;
            font-weight: bold;
            font-family: inherit;
            cursor: pointer;
            transition: background 0.2s;
        }
        .btn-submit:hover {
            background: #89f5e7;
        }
        .path-info {
            font-size: 11px;
            color: #879391;
            margin-top: 8px;
        }
        .auth-card {
            max-width: 440px;
            width: 100%;
            margin: 60px auto;
            text-align: center;
        }
        .auth-card input {
            width: 100%;
            padding: 14px;
            background: #0b1326;
            border: 1px solid #3d4947;
            border-radius: 12px;
            color: #fff;
            margin: 16px 0;
            font-size: 14px;
        }
        .auth-card button {
            width: 100%;
            padding: 14px;
            background: #6bd8cb;
            color: #003732;
            border: none;
            border-radius: 12px;
            font-weight: bold;
            font-size: 15px;
            cursor: pointer;
        }
    </style>
</head>
<body>
<div class="container">
    <?php if (!$isLoggedIn): ?>
        <div class="card auth-card">
            <h1 style="color:#6bd8cb;font-size:22px;margin-top:0;">Web Terminal CyberPanel</h1>
            <p style="color:#bcc9c6;font-size:13px;line-height:1.5;">Pengganti terminal SSH untuk mengeksekusi perintah server secara aman.</p>
            <?php if (!empty($loginError)): ?>
                <div style="color:#ffb4ab;background:rgba(255,180,171,0.1);padding:10px;border-radius:8px;font-size:12px;margin-bottom:12px;"><?= htmlspecialchars($loginError) ?></div>
            <?php endif; ?>
            <form method="POST">
                <input type="password" name="password" placeholder="Masukkan Secret Key (Default: deploy123)" required autofocus>
                <button type="submit">Buka Terminal &rarr;</button>
            </form>
            <div style="font-size:11px;color:#879391;margin-top:14px;">Secret default: <code>deploy123</code></div>
        </div>
    <?php else: ?>
        <div class="header">
            <h1>
                <span>⚡ CyberPanel Web Terminal</span>
                <span class="badge">Online</span>
            </h1>
            <div style="display:flex;gap:10px;align-items:center;">
                <a href="/" target="_blank" style="color:#6bd8cb;text-decoration:none;font-size:12px;background:#0b1326;padding:6px 12px;border-radius:8px;border:1px solid #2d3449;">Buka Aplikasi &rarr;</a>
                <a href="?logout=1" style="color:#ffb4ab;text-decoration:none;font-size:12px;background:#0b1326;padding:6px 12px;border-radius:8px;border:1px solid #2d3449;">Keluar</a>
            </div>
        </div>

        <!-- 1-Click Action Buttons -->
        <div class="card">
            <div style="font-size:13px;font-weight:bold;margin-bottom:12px;color:#6bd8cb;">
                ⚡ Tombol Cepat Perbaikan & Setup
            </div>
            <form method="POST" class="quick-grid">
                <?php foreach ($quickCommands as $key => $action): ?>
                    <button type="submit" name="quick_action" value="<?= $key ?>" class="btn-quick <?= $key === 'fix_signal11' ? 'highlight' : '' ?>">
                        <span class="btn-title"><?= $action['label'] ?></span>
                        <span class="btn-desc"><?= $action['desc'] ?></span>
                    </button>
                <?php endforeach; ?>
            </form>
        </div>

        <!-- Terminal Output Window -->
        <div class="terminal-window">
            <div class="terminal-header">
                <div class="terminal-dots">
                    <span class="dot dot-red"></span>
                    <span class="dot dot-yellow"></span>
                    <span class="dot dot-green"></span>
                </div>
                <div>
                    <?= $executedCmd ? 'Executed: <code style="color:#acf847;">' . htmlspecialchars($executedCmd) . '</code>' : 'Terminal Siap' ?>
                </div>
                <div>bash / php</div>
            </div>
            <div class="terminal-body" id="termBody"><?= $outputLog !== '' ? htmlspecialchars($outputLog) : "Pilih tombol cepat di atas, atau ketik perintah bash apa pun di bawah ini.\nContoh: python3 --version" ?></div>
        </div>

        <!-- Custom Command Form -->
        <div class="card">
            <form method="POST" class="cmd-form">
                <input type="text" name="custom_cmd" class="cmd-input" placeholder="Ketik perintah terminal di sini... (cth: pip list | grep numpy)" required>
                <button type="submit" class="btn-submit">Jalankan Perintah</button>
            </form>
            <div class="path-info">
                Direktori Kerja: <code><?= htmlspecialchars($baseDir) ?></code>
            </div>
        </div>
        <script>
            // Scroll to bottom of terminal
            const body = document.getElementById('termBody');
            if (body) body.scrollTop = body.scrollHeight;
        </script>
    <?php endif; ?>
</div>
</body>
</html>
