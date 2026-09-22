<?php
/**
 * PillCount — CyberPanel / Server Automated Update Script
 * Mengambil perubahan terbaru langsung dari repositori GitHub
 * 
 * Usage:
 * - Via CLI: php update.php
 * - Via Browser: https://your-domain.com/update.php?secret=deploy123
 */

@set_time_limit(600);
@ini_set('memory_limit', '1024M');
@ini_set('max_execution_time', '600');

$baseDir = __DIR__;
$composerHome = $baseDir . '/storage/composer';
if (!is_dir($composerHome)) {
    @mkdir($composerHome, 0777, true);
}
putenv("HOME={$baseDir}");
putenv("COMPOSER_HOME={$composerHome}");
$_ENV['HOME'] = $baseDir;
$_ENV['COMPOSER_HOME'] = $composerHome;

define('UPDATE_SECRET', 'deploy123'); // Ganti kata sandi ini jika diinginkan
$isCli = (php_sapi_name() === 'cli');

// Basic security check for browser access
if (!$isCli) {
    $secret = $_GET['secret'] ?? '';
    if ($secret !== UPDATE_SECRET && !isset($_POST['run'])) {
        ?>
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>PillCount - Update dari GitHub</title>
            <style>
                body { background: #0b1326; color: #dae2fd; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
                .card { background: #171f33; border: 1px solid #2d3449; border-radius: 16px; padding: 30px; max-width: 480px; width: 100%; box-shadow: 0 10px 30px rgba(0,0,0,0.5); text-align: center; }
                h1 { color: #6bd8cb; margin-top: 0; font-size: 22px; }
                p { color: #bcc9c6; font-size: 14px; line-height: 1.6; }
                input[type="password"] { width: 100%; padding: 12px; border-radius: 10px; border: 1px solid #3d4947; background: #060e20; color: #fff; box-sizing: border-box; margin: 15px 0; font-size: 14px; }
                button { width: 100%; background: #94de2d; color: #102000; border: none; padding: 14px; border-radius: 10px; font-weight: bold; font-size: 15px; cursor: pointer; transition: background 0.2s; }
                button:hover { background: #acf847; }
                .hint { font-size: 12px; color: #879391; margin-top: 15px; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>Pembaruan Aplikasi PillCount</h1>
                <p>Skrip ini akan mengambil (pull) kode terbaru dari repositori GitHub, menjalankan migrasi database, dan menyegarkan cache aplikasi.</p>
                <form method="POST">
                    <input type="password" name="password" placeholder="Masukkan Secret Key (Default: deploy123)" required>
                    <button type="submit" name="run" value="1">Tarik Pembaruan dari GitHub</button>
                </form>
                <div class="hint">Secret default: <code>deploy123</code> (bisa diubah di update.php)</div>
            </div>
        </body>
        </html>
        <?php
        exit;
    }

    if (isset($_POST['run']) && ($_POST['password'] ?? '') !== UPDATE_SECRET) {
        die("<h2 style='color:red;font-family:sans-serif;'>Password Secret Salah!</h2>");
    }

    header('Content-Type: text/html; charset=utf-8');
    echo "<!DOCTYPE html><html><head><title>Memperbarui Aplikasi...</title><style>body{background:#060e20;color:#6bd8cb;font-family:monospace;padding:20px;line-height:1.5;}</style></head><body><pre>";
}

function output($text, $status = 'info') {
    global $isCli;
    $time = date('H:i:s');
    $color = '';
    if ($isCli) {
        $color = match($status) {
            'success' => "\033[32m",
            'error' => "\033[31m",
            'warning' => "\033[33m",
            default => "\033[36m"
        };
        echo "[{$time}] {$color}{$text}\033[0m\n";
    } else {
        $hex = match($status) {
            'success' => '#94de2d',
            'error' => '#ffb4ab',
            'warning' => '#ffb95f',
            default => '#6bd8cb'
        };
        echo "<span style='color:{$hex}'>[{$time}] {$text}</span><br>";
        if (ob_get_level() > 0) ob_flush();
        flush();
    }
}

function runCommand($cmd) {
    output("Menjalankan: {$cmd}", 'info');
    $output = [];
    $returnVar = 0;
    exec($cmd . ' 2>&1', $output, $returnVar);
    foreach ($output as $line) {
        output("  > " . $line, $returnVar === 0 ? 'info' : 'warning');
    }
    return $returnVar === 0;
}

$baseDir = __DIR__;
output("=== MEMULAI UPDATE DARI GITHUB ===", 'success');
output("Direktori: {$baseDir}");

// 1. Git Pull dari Origin Main
output("\n1. Mengambil kode terbaru dari GitHub (git pull)...");
if (is_dir($baseDir . '/.git')) {
    runCommand('git fetch origin main');
    runCommand('git reset --hard origin/main');
    runCommand('git pull origin main');
} else {
    output("  Direktori .git tidak ditemukan. Pastikan repo di-clone dengan git clone.", 'warning');
}

// 2. Composer Install (jika ada pembaruan paket PHP)
output("\n2. Memeriksa Kebutuhan Paket Composer...");
$composerEnv = "COMPOSER_HOME=" . escapeshellarg($composerHome) . " HOME=" . escapeshellarg($baseDir) . " ";
runCommand($composerEnv . 'composer install --no-dev --optimize-autoloader --no-interaction');

// 3. Jalankan Database Migrations
output("\n3. Memeriksa & Menjalankan Migrasi Database...");
runCommand('php artisan migrate --force');

// 4. Refresh & Optimasi Cache
output("\n4. Menyegarkan Cache Aplikasi...");
runCommand('php artisan optimize:clear');
runCommand('php artisan config:cache');
runCommand('php artisan route:cache');
runCommand('php artisan view:cache');

// 5. Update Python Requirements
output("\n5. Memeriksa Dependensi Python...");
$pythonCmd = 'python3';
exec('python3 --version 2>&1', $pyOut, $pyRet);
if ($pyRet !== 0) $pythonCmd = 'python';
runCommand("{$pythonCmd} -m pip install -r python/requirements.txt --no-warn-script-location");

output("\n=======================================================", 'success');
output("🚀 APLIKASI PILLCOUNT BERHASIL DIPERBARUI! 🚀", 'success');

if (!$isCli) {
    echo "</pre><br><a href='/' style='background:#94de2d;color:#102000;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;font-family:sans-serif;'>Buka Aplikasi &rarr;</a></body></html>";
}
