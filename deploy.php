<?php
/**
 * PillCount — CyberPanel / Server Automated Deployment Script
 * Usage:
 * - Via CLI: php deploy.php
 * - Via Browser: https://your-domain.com/deploy.php?secret=deploy123 (or visit and click Start)
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

define('DEPLOY_SECRET', 'deploy123'); // Ganti kata sandi ini jika diinginkan
$isCli = (php_sapi_name() === 'cli');

// Basic security check for browser access
if (!$isCli) {
    $secret = $_GET['secret'] ?? '';
    if ($secret !== DEPLOY_SECRET && !isset($_POST['run'])) {
        ?>
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>PillCount - Setup Deployment CyberPanel</title>
            <style>
                body { background: #0b1326; color: #dae2fd; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
                .card { background: #171f33; border: 1px solid #2d3449; border-radius: 16px; padding: 30px; max-width: 480px; width: 100%; box-shadow: 0 10px 30px rgba(0,0,0,0.5); text-align: center; }
                h1 { color: #6bd8cb; margin-top: 0; font-size: 22px; }
                p { color: #bcc9c6; font-size: 14px; line-height: 1.6; }
                input[type="password"] { width: 100%; padding: 12px; border-radius: 10px; border: 1px solid #3d4947; background: #060e20; color: #fff; box-sizing: border-box; margin: 15px 0; font-size: 14px; }
                button { width: 100%; background: #6bd8cb; color: #003732; border: none; padding: 14px; border-radius: 10px; font-weight: bold; font-size: 15px; cursor: pointer; transition: background 0.2s; }
                button:hover { background: #89f5e7; }
                .hint { font-size: 12px; color: #879391; margin-top: 15px; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>Setup Deployment PillCount</h1>
                <p>Skrip ini akan mengonfigurasi database SQLite, permissions, cache, dan dependensi server.</p>
                <form method="POST">
                    <input type="password" name="password" placeholder="Masukkan Secret Key (Default: deploy123)" required>
                    <button type="submit" name="run" value="1">Mulai Setup Aplikasi</button>
                </form>
                <div class="hint">Secret default: <code>deploy123</code> (bisa diubah di deploy.php)</div>
            </div>
        </body>
        </html>
        <?php
        exit;
    }

    if (isset($_POST['run']) && ($_POST['password'] ?? '') !== DEPLOY_SECRET) {
        die("<h2 style='color:red;font-family:sans-serif;'>Password Secret Salah!</h2>");
    }

    header('Content-Type: text/html; charset=utf-8');
    echo "<!DOCTYPE html><html><head><title>Menjalankan Setup...</title><style>body{background:#060e20;color:#6bd8cb;font-family:monospace;padding:20px;line-height:1.5;}</style></head><body><pre>";
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
output("=== MEMULAI SETUP DEPLOYMENT PILLCOUNT ===", 'success');
output("Direktori Kerja: {$baseDir}");

// 1. Cek Versi PHP
output("\n1. Memeriksa Versi PHP & Ekstensi...");
output("PHP Version: " . PHP_VERSION, 'info');
$requiredExtensions = ['pdo', 'pdo_sqlite', 'curl', 'fileinfo', 'mbstring', 'openssl', 'json'];
foreach ($requiredExtensions as $ext) {
    if (extension_loaded($ext)) {
        output("  [OK] Ekstensi PHP '{$ext}' aktif", 'success');
    } else {
        output("  [PERINGATAN] Ekstensi PHP '{$ext}' tidak ditemukan!", 'warning');
    }
}

// 2. Setup File .env
output("\n2. Memeriksa Konfigurasi .env...");
$envFile = $baseDir . '/.env';
$envExample = $baseDir . '/.env.example';
if (!file_exists($envFile)) {
    if (file_exists($envExample)) {
        copy($envExample, $envFile);
        output("  Berhasil membuat .env dari .env.example", 'success');
    } else {
        output("  .env.example tidak ditemukan!", 'error');
    }
} else {
    output("  File .env sudah ada.", 'info');
}

// 3. Setup Database SQLite
output("\n3. Memeriksa Database SQLite...");
$dbDir = $baseDir . '/database';
$dbFile = $dbDir . '/database.sqlite';
if (!is_dir($dbDir)) {
    @mkdir($dbDir, 0775, true);
}
if (!file_exists($dbFile)) {
    @touch($dbFile);
    output("  Berhasil membuat file database/database.sqlite", 'success');
} else {
    output("  File database/database.sqlite sudah ada.", 'info');
}
@chmod($dbFile, 0666);
@chmod($dbDir, 0777);

// 4. Set Permissions Storage & Cache
output("\n4. Mengatur Permission Storage & Cache...");
$writableDirs = [
    $baseDir . '/storage',
    $baseDir . '/storage/app',
    $baseDir . '/storage/app/public',
    $baseDir . '/storage/framework',
    $baseDir . '/storage/framework/cache',
    $baseDir . '/storage/framework/sessions',
    $baseDir . '/storage/framework/views',
    $baseDir . '/storage/logs',
    $baseDir . '/bootstrap/cache',
];
foreach ($writableDirs as $dir) {
    if (!is_dir($dir)) {
        @mkdir($dir, 0777, true);
    }
    @chmod($dir, 0777);
}
output("  Permissions storage dan cache telah diatur ke 0777", 'success');

// 5. Install Composer Dependencies (jika folder vendor belum ada)
output("\n5. Memeriksa Vendor & Composer Dependencies...");
$composerEnv = "COMPOSER_HOME=" . escapeshellarg($composerHome) . " HOME=" . escapeshellarg($baseDir) . " ";
if (!file_exists($baseDir . '/vendor/autoload.php')) {
    output("  Folder vendor belum lengkap. Menjalankan composer install...", 'warning');
    runCommand($composerEnv . 'composer install --no-dev --optimize-autoloader --no-interaction');
} else {
    output("  Folder vendor sudah terinstal.", 'success');
}

if (!file_exists($baseDir . '/vendor/autoload.php')) {
    output("\n[PERINGATAN] Folder vendor/autoload.php belum terbentuk.", 'warning');
    output("Jika composer di web server memiliki batasan hak akses / timeout, silakan jalankan satu perintah berikut di Terminal CyberPanel / SSH:", 'warning');
    output("  cd {$baseDir} && composer install --no-dev --optimize-autoloader\n", 'info');
    output("Setelah itu, jalankan kembali deploy.php untuk menyelesaikan setup otomatis.", 'info');
} else {
    // 6. Generate APP_KEY jika kosong
    output("\n6. Memeriksa Application Key...");
    $envContent = file_get_contents($envFile);
    if (strpos($envContent, 'APP_KEY=base64:') === false) {
        output("  APP_KEY kosong. Membuat Application Key baru...", 'info');
        runCommand('php artisan key:generate --force');
    } else {
        output("  APP_KEY sudah terkonfigurasi.", 'success');
    }

    // 7. Storage Link
    output("\n7. Menghubungkan Storage Link...");
    runCommand('php artisan storage:link');

    // 8. Jalankan Database Migration
    output("\n8. Menjalankan Database Migrations...");
    runCommand('php artisan migrate --force');

    // 9. Jalankan Database Seeder (jika belum ada data sesi)
    output("\n9. Memeriksa Data Awal...");
    runCommand('php artisan db:seed --class=CountingSessionSeeder --force');

    // 10. Optimasi Cache Laravel
    output("\n10. Mengoptimasi Cache Laravel...");
    runCommand('php artisan optimize:clear');
    runCommand('php artisan config:cache');
    runCommand('php artisan route:cache');
    runCommand('php artisan view:cache');
}

// 11. Cek Python & OpenCV
output("\n11. Memeriksa Python & OpenCV Environment...");
$pythonCmd = 'python3';
exec('python3 --version 2>&1', $pyOut, $pyRet);
if ($pyRet !== 0) {
    $pythonCmd = 'python';
    exec('python --version 2>&1', $pyOut, $pyRet);
}
if ($pyRet === 0) {
    output("  Python terdeteksi: " . implode(' ', $pyOut), 'success');
    output("  Memasang paket requirements.txt...");
    runCommand("{$pythonCmd} -m pip install -r python/requirements.txt --no-warn-script-location");
} else {
    output("  Python3 tidak ditemukan di PATH server. Pastikan Python terinstal di CyberPanel jika ingin menjalankan deteksi di sisi server.", 'warning');
}

output("\n=======================================================", 'success');
output("🎉 SETUP DEPLOYMENT SELESAI DENGAN SUKSES! 🎉", 'success');
output("Aplikasi PillCount siap digunakan di CyberPanel!", 'success');
output("Catatan Keamanan: Anda dapat menghapus atau mengganti secret di deploy.php sekarang.", 'info');

if (!$isCli) {
    echo "</pre><br><a href='/' style='background:#6bd8cb;color:#003732;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;font-family:sans-serif;'>Buka Aplikasi PillCount &rarr;</a></body></html>";
}
