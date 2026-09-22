<?php

namespace Database\Seeders;

use App\Models\CountingSession;
use Illuminate\Database\Seeder;

class CountingSessionSeeder extends Seeder
{
    public function run(): void
    {
        CountingSession::create([
            'prescription_no' => 'RX-882104',
            'medicine_name' => 'Paracetamol 500mg Tablet',
            'pharmacist_name' => 'Apt. Sarah Pratama, S.Farm',
            'shape_filter' => 'tablet',
            'auto_count' => 24,
            'manual_count' => 24,
            'confidence_score' => 99.2,
            'lighting_quality' => 'optimal',
            'blur_score' => 840.5,
            'image_path' => null,
            'annotated_image_path' => null,
            'detected_items' => [
                ['id' => 1, 'shape' => 'tablet', 'cx' => 120, 'cy' => 140],
                ['id' => 2, 'shape' => 'tablet', 'cx' => 240, 'cy' => 180],
                ['id' => 3, 'shape' => 'tablet', 'cx' => 360, 'cy' => 150],
            ],
            'notes' => 'Resep rawat jalan umum. Nampan biru matte.',
            'created_at' => now()->subHours(2),
        ]);

        CountingSession::create([
            'prescription_no' => 'RX-773915',
            'medicine_name' => 'Amoxicillin 500mg Kapsul',
            'pharmacist_name' => 'Budi Santoso, A.Md.Farm',
            'shape_filter' => 'capsule',
            'auto_count' => 15,
            'manual_count' => 16,
            'confidence_score' => 97.8,
            'lighting_quality' => 'optimal',
            'blur_score' => 720.0,
            'image_path' => null,
            'annotated_image_path' => null,
            'detected_items' => [],
            'notes' => '1 butir kapsul ditambahkan manual karena sedikit tertutup bayangan.',
            'created_at' => now()->subHours(5),
        ]);

        CountingSession::create([
            'prescription_no' => 'RX-621094',
            'medicine_name' => 'Racikan Puyer Batuk Anak (PCT + CTM + GG)',
            'pharmacist_name' => 'Apt. Sarah Pratama, S.Farm',
            'shape_filter' => 'racikan',
            'auto_count' => 10,
            'manual_count' => 10,
            'confidence_score' => 96.5,
            'lighting_quality' => 'optimal',
            'blur_score' => 690.2,
            'image_path' => null,
            'annotated_image_path' => null,
            'detected_items' => [],
            'notes' => 'Penyiapan puyer 10 bungkus untuk pasien anak.',
            'created_at' => now()->subDay(),
        ]);
    }
}
