<?php
/**
 * PillCount — MySQL Database Configurator & Migration Tool
 * Mengalihkan konfigurasi database dari SQLite ke MySQL di CyberPanel / Production Server
 * 
 * Akses Browser: https://domainanda.com/update_mysql.php (Secret: deploy123)
 * Akses CLI     : php update_mysql.php
 */

@set_time_limit(300);
@ini_set('memory_limit', '512M');

$baseDir = file_exists(__DIR__ . '/artisan') ? __DIR__ : dirname(__DIR__);
$isCli = (php_sapi_name() === 'cli');

// Kredensial Database MySQL yang diberikan User
$dbHost = '127.0.0.1';
$dbPort = '3306';
$dbName = 'drug_drugcount';
$dbUser = 'drug_tfrahesta';
$dbPass = '12345678';

if (!$isCli) {
    session_start();
    define('SECRET_PASS', 'deploy123');

    if (isset($_POST['password']) && $_POST['password'] === SECRET_PASS) {
        $_SESSION['mysql_auth'] = true;
    }

    if (empty($_SESSION['mysql_auth'])) {
        ?>
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Konfigurasi MySQL — PillCount AI</title>
            <style>
                body { background: #0b1326; color: #dae2fd; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
                .card { background: #171f33; border: 1px solid #2d3449; border-radius: 20px; padding: 32px; max-width: 480px; width: 100%; box-shadow: 0 15px 35px rgba(0,0,0,0.6); text-align: center; }
                .icon { width: 56px; height: 56px; background: rgba(107, 216, 203, 0.15); color: #6bd8cb; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; font-size: 28px; }
                h1 { color: #6bd8cb; margin: 0 0 8px; font-size: 20px; font-weight: 700; }
                p { color: #bcc9c6; font-size: 13px; line-height: 1.5; margin: 0 0 20px; }
                .details { background: #060e20; border: 1px solid #2d3449; border-radius: 12px; padding: 14px; text-align: left; font-family: monospace; font-size: 12px; color: #6bd8cb; margin-bottom: 20px; }
                input[type="password"] { width: 100%; padding: 12px 14px; border-radius: 12px; border: 1px solid #3d4947; background: #060e20; color: #fff; margin-bottom: 14px; box-sizing: border-box; }
                button { width: 100%; background: #6bd8cb; color: #003732; border: none; padding: 14px; border-radius: 12px; font-weight: 700; font-size: 14px; cursor: pointer; }
                button:hover { background: #89f5e7; }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="icon">🐬</div>
                <h1>Pindah ke Database MySQL</h1>
                <p>Mengubah koneksi database aplikasi ke MySQL CyberPanel dan menjalankan migrasi tabel otomatis.</p>
                <div class="details">
                    Database: <?php echo htmlspecialchars($dbName); ?><br>
                    Username: <?php echo htmlspecialchars($dbUser); ?><br>
                    Host: <?php echo htmlspecialchars($dbHost . ':' . $dbPort); ?>
                </div>
                <form method="POST">
                    <input type="password" name="password" placeholder="Masukkan password (deploy123)" required>
                    <button type="submit">Jalankan Migrasi ke MySQL &rarr;</button>
                </form>
            </div>
        </body>
        </html>
        <?php
        exit;
    }

    header('Content-Type: text/html; charset=utf-8');
    echo "<!DOCTYPE html><html><head><title>Proses Migrasi MySQL...</title><style>body{background:#060e20;color:#6bd8cb;font-family:monospace;padding:24px;line-height:1.6;font-size:13px;max-width:900px;margin:0 auto;}</style></head><body><pre>";
}

function out($msg) {
    global $isCli;
    $time = date('H:i:s');
    if ($isCli) {
        echo "[{$time}] {$msg}\n";
    } else {
        echo "[{$time}] " . htmlspecialchars($msg) . "\n";
        @ob_flush();
        @flush();
    }
}

out("==================================================");
out("  PILLCOUNT — SETUP & MIGRASI DATABASE MYSQL");
out("==================================================");
out("Direktori Proyek: " . $baseDir);

// 1. Uji Koneksi PDO ke MySQL
out("\n1. Menguji Koneksi ke MySQL Server...");
$pdo = null;
$selectedHost = $dbHost;

try {
    $dsn = "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4";
    $pdo = new PDO($dsn, $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_TIMEOUT => 5,
    ]);
    out("  [OK] Berhasil terhubung ke MySQL pada {$dbHost}:{$dbPort}!");
} catch (PDOException $e) {
    out("  [INFO] Koneksi via 127.0.0.1 gagal: " . $e->getMessage());
    out("  [INFO] Mencoba alternatif host 'localhost'...");
    try {
        $dsn = "mysql:host=localhost;port={$dbPort};dbname={$dbName};charset=utf8mb4";
        $pdo = new PDO($dsn, $dbUser, $dbPass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_TIMEOUT => 5,
        ]);
        $selectedHost = 'localhost';
        out("  [OK] Berhasil terhubung ke MySQL pada localhost:{$dbPort}!");
    } catch (PDOException $e2) {
        out("  [GAGAL] Tidak dapat terhubung ke MySQL: " . $e2->getMessage());
        out("  Pastikan database '{$dbName}' dan user '{$dbUser}' sudah dibuat di CyberPanel!");
        if (!$isCli) echo "</pre></body></html>";
        exit(1);
    }
}

// 2. Perbarui File .env
out("\n2. Memperbarui File .env ke MySQL...");
$envFile = $baseDir . '/.env';
if (!file_exists($envFile)) {
    if (file_exists($baseDir . '/.env.example')) {
        copy($baseDir . '/.env.example', $envFile);
        out("  [OK] Menyalin .env dari .env.example");
    } else {
        out("  [GAGAL] File .env tidak ditemukan!");
        if (!$isCli) echo "</pre></body></html>";
        exit(1);
    }
}

$envContent = file_get_contents($envFile);

$replacements = [
    '/^DB_CONNECTION=.*$/m' => 'DB_CONNECTION=mysql',
    '/^#? ?DB_HOST=.*$/m'     => 'DB_HOST=' . $selectedHost,
    '/^#? ?DB_PORT=.*$/m'     => 'DB_PORT=' . $dbPort,
    '/^#? ?DB_DATABASE=.*$/m' => 'DB_DATABASE=' . $dbName,
    '/^#? ?DB_USERNAME=.*$/m' => 'DB_USERNAME=' . $dbUser,
    '/^#? ?DB_PASSWORD=.*$/m' => 'DB_PASSWORD=' . $dbPass,
    '/^SESSION_DRIVER=.*$/m'  => 'SESSION_DRIVER=file',
    '/^CACHE_STORE=.*$/m'     => 'CACHE_STORE=file',
];

foreach ($replacements as $pattern => $replacement) {
    if (preg_match($pattern, $envContent)) {
        $envContent = preg_replace($pattern, $replacement, $envContent);
    } else {
        $envContent .= "\n" . $replacement;
    }
}

file_put_contents($envFile, $envContent);
out("  [OK] Konfigurasi MySQL berhasil disimpan ke .env!");

// 3. Clear Laravel Cache
out("\n3. Membersihkan Cache Konfigurasi Laravel...");
@shell_exec("cd " . escapeshellarg($baseDir) . " && php artisan optimize:clear 2>&1");
out("  [OK] Cache konfigurasi dibersihkan.");

// 4. Jalankan Migrasi Database
out("\n4. Menjalankan Artisan Migrate ke MySQL...");
$migrateCmd = "cd " . escapeshellarg($baseDir) . " && php artisan migrate --force 2>&1";
$migrateOutput = shell_exec($migrateCmd);
out($migrateOutput);

// 5. Cek tabel-tabel di MySQL
out("\n5. Memeriksa Tabel yang Terbentuk di MySQL...");
try {
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    out("  Tabel ditemukan (" . count($tables) . "): " . implode(', ', $tables));
} catch (\Throwable $e) {
    out("  Gagal membaca daftar tabel: " . $e->getMessage());
}

// 6. Migrasikan Data Sesi & User Lama dari SQLite (Jika ada)
$sqlitePath = $baseDir . '/database/database.sqlite';
if (file_exists($sqlitePath) && filesize($sqlitePath) > 0) {
    out("\n6. Menyalin Data Lama dari SQLite ke MySQL...");
    try {
        $sqlitePdo = new PDO("sqlite:" . $sqlitePath, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]);

        // Copy users jika MySQL masih kosong
        $mysqlUserCount = (int)$pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
        if ($mysqlUserCount === 0) {
            $sqliteUsers = $sqlitePdo->query("SELECT * FROM users")->fetchAll(PDO::FETCH_ASSOC);
            if (!empty($sqliteUsers)) {
                $userStmt = $pdo->prepare("INSERT IGNORE INTO users (id, name, email, email_verified_at, password, remember_token, created_at, updated_at) VALUES (:id, :name, :email, :email_verified_at, :password, :remember_token, :created_at, :updated_at)");
                foreach ($sqliteUsers as $u) {
                    $userStmt->execute([
                        ':id' => $u['id'],
                        ':name' => $u['name'],
                        ':email' => $u['email'],
                        ':email_verified_at' => $u['email_verified_at'] ?? null,
                        ':password' => $u['password'],
                        ':remember_token' => $u['remember_token'] ?? null,
                        ':created_at' => $u['created_at'] ?? date('Y-m-d H:i:s'),
                        ':updated_at' => $u['updated_at'] ?? date('Y-m-d H:i:s'),
                    ]);
                }
                out("  [OK] Berhasil menyalin " . count($sqliteUsers) . " akun user dari SQLite ke MySQL!");
            }
        }

        // Copy counting_sessions jika MySQL masih kosong
        $mysqlSessionCount = (int)$pdo->query("SELECT COUNT(*) FROM counting_sessions")->fetchColumn();
        if ($mysqlSessionCount === 0) {
            $sqliteSessions = $sqlitePdo->query("SELECT * FROM counting_sessions")->fetchAll(PDO::FETCH_ASSOC);
            if (!empty($sqliteSessions)) {
                $sessStmt = $pdo->prepare("INSERT INTO counting_sessions (id, user_id, prescription_no, medicine_name, pharmacist_name, shape_filter, auto_count, manual_count, confidence_score, lighting_quality, blur_score, image_path, annotated_image_path, detected_items, notes, created_at, updated_at) VALUES (:id, :user_id, :prescription_no, :medicine_name, :pharmacist_name, :shape_filter, :auto_count, :manual_count, :confidence_score, :lighting_quality, :blur_score, :image_path, :annotated_image_path, :detected_items, :notes, :created_at, :updated_at)");
                
                $firstUserId = (int)$pdo->query("SELECT id FROM users LIMIT 1")->fetchColumn() ?: null;

                foreach ($sqliteSessions as $s) {
                    $sessStmt->execute([
                        ':id' => $s['id'],
                        ':user_id' => $s['user_id'] ?? $firstUserId,
                        ':prescription_no' => $s['prescription_no'],
                        ':medicine_name' => $s['medicine_name'],
                        ':pharmacist_name' => $s['pharmacist_name'],
                        ':shape_filter' => $s['shape_filter'] ?? 'all',
                        ':auto_count' => $s['auto_count'],
                        ':manual_count' => $s['manual_count'],
                        ':confidence_score' => $s['confidence_score'] ?? 98.5,
                        ':lighting_quality' => $s['lighting_quality'] ?? 'optimal',
                        ':blur_score' => $s['blur_score'] ?? null,
                        ':image_path' => $s['image_path'] ?? null,
                        ':annotated_image_path' => $s['annotated_image_path'] ?? null,
                        ':detected_items' => $s['detected_items'] ?? '[]',
                        ':notes' => $s['notes'] ?? null,
                        ':created_at' => $s['created_at'] ?? date('Y-m-d H:i:s'),
                        ':updated_at' => $s['updated_at'] ?? date('Y-m-d H:i:s'),
                    ]);
                }
                out("  [OK] Berhasil menyalin " . count($sqliteSessions) . " data riwayat hitung obat dari SQLite ke MySQL!");
            }
        }
    } catch (\Throwable $e) {
        out("  [INFO] Migrasi data lama dari SQLite dilewati: " . $e->getMessage());
    }
}

// 7. Refresh Cache Akhir
out("\n7. Memperbarui Cache Routing & Config...");
@shell_exec("cd " . escapeshellarg($baseDir) . " && php artisan config:cache && php artisan route:cache && php artisan view:cache 2>&1");
out("  [OK] Seluruh cache Laravel berhasil disegarkan!");

out("\n==================================================");
out("  SUKSES! APLIKASI KINI MENGGUNAKAN MYSQL 🐬");
out("  Database : {$dbName}");
out("  User     : {$dbUser}");
out("  Host     : {$selectedHost}");
out("==================================================");

if (!$isCli) {
    echo "\n\n<a href='/' style='display:inline-block;padding:12px 24px;background:#6bd8cb;color:#003732;text-decoration:none;border-radius:10px;font-weight:bold;margin-top:20px;'>Buka Aplikasi PillCount Sekarang &rarr;</a>";
    echo "</pre></body></html>";
}
