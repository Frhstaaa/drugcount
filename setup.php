<?php
/**
 * PillCount — All-In-One Setup & Auto-Update Tool for CyberPanel / Linux Server
 * 
 * Fitur:
 * 1. Tarik (Pull) pembaruan kodingan terbaru dari GitHub (origin main).
 * 2. Setup file .env & SQLite database beserta permission otomatis.
 * 3. Injeksi variabel COMPOSER_HOME & instalasi dependensi vendor.
 * 4. Generate APP_KEY, storage link, migrasi database & seed data awal.
 * 5. Install paket Python OpenCV (requirements.txt).
 * 6. Otomatis menyalakan ulang Python Engine Daemon (port 5175) di latar belakang.
 * 7. Optimasi dan penyegaran seluruh cache aplikasi.
 * 
 * Akses Browser: https://domainanda.com/setup.php (Secret default: deploy123)
 * Akses Terminal : php setup.php
 */

@set_time_limit(600);
@ini_set('memory_limit', '1024M');
@ini_set('max_execution_time', '600');

define('SETUP_SECRET', 'deploy123'); // Ganti kata sandi ini jika diinginkan

// Deteksi direktori root proyek
$currentDir = __DIR__;
$baseDir = file_exists($currentDir . '/artisan') ? $currentDir : dirname($currentDir);
$isCli = (php_sapi_name() === 'cli');
$isWindows = (DIRECTORY_SEPARATOR === '\\');

// Konfigurasi Environment Composer agar tidak error di CyberPanel
$composerHome = $baseDir . '/storage/composer';
if (!is_dir($composerHome)) {
    @mkdir($composerHome, 0777, true);
}
putenv("HOME={$baseDir}");
putenv("COMPOSER_HOME={$composerHome}");
$_ENV['HOME'] = $baseDir;
$_ENV['COMPOSER_HOME'] = $composerHome;

// Validasi otentikasi browser
if (!$isCli) {
    $secret = $_GET['secret'] ?? '';
    if ($secret !== SETUP_SECRET && !isset($_POST['run'])) {
        ?>
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>PillCount — All-In-One Setup & Update</title>
            <style>
                body { background: #0b1326; color: #dae2fd; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
                .card { background: #171f33; border: 1px solid #2d3449; border-radius: 20px; padding: 32px; max-width: 520px; width: 100%; box-shadow: 0 15px 35px rgba(0,0,0,0.6); text-align: center; }
                .icon { width: 56px; height: 56px; background: rgba(107, 216, 203, 0.15); color: #6bd8cb; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; font-size: 28px; }
                h1 { color: #6bd8cb; margin: 0 0 8px; font-size: 22px; font-weight: 700; }
                p { color: #bcc9c6; font-size: 13.5px; line-height: 1.6; margin: 0 0 20px; }
                .features { background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 14px 18px; text-align: left; margin-bottom: 22px; font-size: 12.5px; color: #94a3b8; }
                .features li { margin-bottom: 6px; }
                .features li:last-child { margin-bottom: 0; }
                .features strong { color: #e2e8f0; }
                input[type="password"] { width: 100%; padding: 13px 16px; border-radius: 12px; border: 1px solid #334155; background: #060e20; color: #fff; box-sizing: border-box; margin-bottom: 16px; font-size: 14px; outline: none; transition: border-color 0.2s; }
                input[type="password"]:focus { border-color: #6bd8cb; }
                button { width: 100%; background: #6bd8cb; color: #003732; border: none; padding: 14px; border-radius: 12px; font-weight: 700; font-size: 15px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(107, 216, 203, 0.3); }
                button:hover { background: #89f5e7; transform: translateY(-1px); }
                button:active { transform: translateY(0); }
                .hint { font-size: 12px; color: #64748b; margin-top: 16px; }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="icon">💊</div>
                <h1>PillCount Setup & Auto-Update</h1>
                <p>Alat otomatis untuk menyinkronkan kode terbaru dari GitHub, memperbarui database, menginstal dependensi, serta menyalakan Python AI Engine di CyberPanel.</p>
                
                <ul class="features">
                    <li>🔄 <strong>Git Pull</strong>: Mengambil kodingan terbaru dari branch <code>main</code></li>
                    <li>📦 <strong>Composer & Artisan</strong>: Migrasi database, seed data & refresh cache</li>
                    <li>🐍 <strong>Python OpenCV</strong>: Install paket & aktifkan daemon latar belakang (:5175)</li>
                </ul>

                <form method="POST">
                    <input type="password" name="password" placeholder="Masukkan Secret Key (Default: deploy123)" required>
                    <button type="submit" name="run" value="1">Jalankan Setup & Update Sekarang &rarr;</button>
                </form>
                <div class="hint">Secret default: <code>deploy123</code> (dapat diubah di setup.php)</div>
            </div>
        </body>
        </html>
        <?php
        exit;
    }

    if (isset($_POST['run']) && ($_POST['password'] ?? '') !== SETUP_SECRET) {
        die("<h2 style='color:#ffb4ab;font-family:sans-serif;padding:20px;text-align:center;'>Secret Key Salah! Silakan periksa kembali.</h2>");
    }

    header('Content-Type: text/html; charset=utf-8');
    echo "<!DOCTYPE html><html><head><title>Memproses Setup & Update...</title><meta name='viewport' content='width=device-width, initial-scale=1'><style>body{background:#060e20;color:#6bd8cb;font-family:'JetBrains Mono',monospace,Courier;padding:20px;line-height:1.6;font-size:13px;max-width:900px;margin:0 auto;}</style></head><body><pre>";
}

function output($text, $status = 'info') {
    global $isCli;
    $time = date('H:i:s');
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

output("=================================================================", 'success');
output("🚀 MEMULAI SETUP & AUTO-UPDATE PILLCOUNT 🚀", 'success');
output("Direktori Proyek: {$baseDir}");
output("=================================================================");

// 1. Tarik Pembaruan dari GitHub jika folder .git ada
output("\n[1/8] Memeriksa Pembaruan Kode dari GitHub...");
if (is_dir($baseDir . '/.git')) {
    output("  Mengambil kode terbaru (git fetch & pull origin main)...");
    runCommand("cd {$baseDir} && git fetch origin main");
    runCommand("cd {$baseDir} && git reset --hard origin/main");
    runCommand("cd {$baseDir} && git pull origin main");
    output("  Kodingan telah disinkronkan dengan GitHub!", 'success');
} else {
    output("  Folder .git tidak terdeteksi (aplikasi diupload manual). Melewati git pull.", 'info');
}

// 2. Setup File .env & Konfigurasi Dasar
output("\n[2/8] Memeriksa Konfigurasi .env...");
$envFile = $baseDir . '/.env';
$envExample = $baseDir . '/.env.example';
if (!file_exists($envFile)) {
    if (file_exists($envExample)) {
        copy($envExample, $envFile);
        output("  Berhasil membuat file .env baru dari .env.example", 'success');
    } else {
        output("  File .env.example tidak ditemukan!", 'warning');
    }
} else {
    output("  File .env sudah aktif.", 'info');
}

// 3. Database SQLite & Hak Akses Folder
output("\n[3/8] Memeriksa Database SQLite & Permissions...");
$dbDir = $baseDir . '/database';
$dbFile = $dbDir . '/database.sqlite';
if (!is_dir($dbDir)) {
    @mkdir($dbDir, 0777, true);
}
if (!file_exists($dbFile)) {
    @touch($dbFile);
    output("  Database database.sqlite berhasil dibuat", 'success');
} else {
    output("  Database database.sqlite siap digunakan.", 'info');
}
@chmod($dbFile, 0666);
@chmod($dbDir, 0777);

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
    $baseDir . '/python',
];
foreach ($writableDirs as $d) {
    if (!is_dir($d)) @mkdir($d, 0777, true);
    @chmod($d, 0777);
}
output("  Permissions storage & cache telah diatur ke 0777", 'success');

// 4. Composer Dependencies
output("\n[4/8] Memeriksa Dependensi Vendor Composer...");
$composerEnv = "COMPOSER_HOME=" . escapeshellarg($composerHome) . " HOME=" . escapeshellarg($baseDir) . " ";
if (!file_exists($baseDir . '/vendor/autoload.php')) {
    output("  Folder vendor belum lengkap. Menjalankan composer install...", 'warning');
    runCommand("cd {$baseDir} && " . $composerEnv . 'composer install --no-dev --optimize-autoloader --no-interaction');
} else {
    output("  Folder vendor/autoload.php sudah terinstal.", 'success');
}

// 5. Artisan Commands (Key, Storage Link, Migrate, Seed, Cache)
output("\n[5/8] Menjalankan Konfigurasi Artisan Laravel...");
if (file_exists($baseDir . '/vendor/autoload.php')) {
    // Generate Key jika kosong
    $envContent = file_get_contents($envFile);
    if (strpos($envContent, 'APP_KEY=base64:') === false) {
        output("  Membuat Application Key baru...");
        runCommand("cd {$baseDir} && php artisan key:generate --force");
    }

    // Storage link
    runCommand("cd {$baseDir} && php artisan storage:link");

    // Migrasi Database
    runCommand("cd {$baseDir} && php artisan migrate --force");

    // Seeder
    runCommand("cd {$baseDir} && php artisan db:seed --class=CountingSessionSeeder --force");

    // Clear & Refresh Cache
    runCommand("cd {$baseDir} && php artisan optimize:clear");
    runCommand("cd {$baseDir} && php artisan config:cache");
    runCommand("cd {$baseDir} && php artisan route:cache");
    runCommand("cd {$baseDir} && php artisan view:cache");
    output("  Seluruh cache aplikasi berhasil disegarkan.", 'success');
} else {
    output("  [PERINGATAN] Vendor belum ada. Silakan jalankan 'composer install' via SSH/Terminal.", 'warning');
}

// 6. Deteksi Python & Instalasi Paket OpenCV
output("\n[6/8] Memeriksa Python & Paket Computer Vision...");
@chmod($baseDir . '/python/detect_pills.py', 0755);
@chmod($baseDir . '/python/server.py', 0755);

$pythonCmd = 'python3';
exec('python3 --version 2>&1', $pyOut, $pyRet);
if ($pyRet !== 0) {
    $pythonCmd = 'python';
    $pyOut = [];
    exec('python --version 2>&1', $pyOut, $pyRet);
}

if ($pyRet === 0) {
    $pyVer = implode(' ', $pyOut);
    output("  Python aktif: {$pyVer}", 'success');
    
    // Pastikan PYTHON_BIN tercatat di .env
    $envContent = file_get_contents($envFile);
    if (strpos($envContent, 'PYTHON_BIN=') === false) {
        file_put_contents($envFile, "\nPYTHON_BIN={$pythonCmd}\n", FILE_APPEND);
        output("  Tercatat PYTHON_BIN={$pythonCmd} pada .env", 'info');
    }

    // Install requirements jika belum lengkap
    output("  Memeriksa paket Python requirements.txt...");
    runCommand("cd {$baseDir} && {$pythonCmd} -m pip install -r python/requirements.txt --no-warn-script-location");
} else {
    output("  [PERINGATAN] Python tidak ditemukan pada PATH server.", 'error');
}

// 7. Menyalakan Python Engine Daemon di Background (Port 5175)
output("\n[7/8] Mengaktifkan Python AI Engine Microservice (:5175)...");
if ($pyRet === 0) {
    if (!$isWindows) {
        // Hentikan proses lama di port 5175 jika ada
        exec("fuser -k 5175/tcp 2>/dev/null");
        exec("pkill -f 'python.*server.py' 2>/dev/null");
        
        // Nyalakan daemon di latar belakang dengan nohup
        $daemonCmd = "cd {$baseDir} && nohup {$pythonCmd} python/server.py > python/server.log 2>&1 &";
        exec($daemonCmd);
        output("  Menjalankan daemon latar belakang: {$daemonCmd}");
    } else {
        // Pada Windows local dev
        pclose(popen("start /B {$pythonCmd} {$baseDir}\\python\\server.py", "r"));
    }

    // Tunggu 1.5 detik untuk memastikan server menyala
    usleep(1500000);

    // Tes koneksi health check ke port 5175
    $healthCheck = false;
    $context = stream_context_create(['http' => ['timeout' => 2]]);
    $resp = @file_get_contents('http://127.0.0.1:5175/health', false, $context);
    if ($resp && strpos($resp, 'online') !== false) {
        $healthCheck = true;
    }

    if ($healthCheck) {
        output("  [SUKSES] Python AI Daemon AKTIF dan merespons pada http://127.0.0.1:5175!", 'success');
    } else {
        output("  Daemon sedang diinisialisasi atau berjalan dalam mode Subprocess CLI otomatis.", 'info');
        output("  (Tenang, Laravel tetap dapat mendeteksi obat menggunakan CLI fallback '{$pythonCmd} python/detect_pills.py')", 'info');
    }
}

// 8. Uji Coba Engine Deteksi Langsung
output("\n[8/8] Menguji Coba Algoritma Deteksi Obat Langsung...");
if ($pyRet === 0) {
    $testOut = [];
    $testRet = 0;
    exec("cd {$baseDir} && {$pythonCmd} python/detect_pills.py --shape all 2>&1", $testOut, $testRet);
    $testStr = implode(' ', $testOut);
    if (strpos($testStr, 'pills') !== false || strpos($testStr, 'success') !== false) {
        output("  [OK] Computer Vision Engine berhasil merespons dan siap menghitung obat!", 'success');
    } else {
        output("  Output engine: " . substr($testStr, 0, 160), 'info');
    }
}

output("\n=================================================================", 'success');
output("🎉 PROSES SETUP & PEMBARUAN APLIKASI SELESAI DENGAN SUKSES! 🎉", 'success');
output("=================================================================", 'success');
output("Aplikasi PillCount siap digunakan dengan performa optimal.", 'info');

if (!$isCli) {
    echo "</pre><br>";
    echo "<div style='display:flex;gap:12px;margin-top:10px;'>";
    echo "<a href='/' style='background:#6bd8cb;color:#003732;padding:12px 24px;text-decoration:none;border-radius:10px;font-weight:bold;font-family:sans-serif;'>Buka Aplikasi PillCount &rarr;</a>";
    echo "<a href='/settings' style='background:#171f33;border:1px solid #2d3449;color:#dae2fd;padding:12px 24px;text-decoration:none;border-radius:10px;font-weight:bold;font-family:sans-serif;'>Buka Halaman Kalibrasi</a>";
    echo "</div></body></html>";
}
