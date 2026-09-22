<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CountingSession extends Model
{
    protected $fillable = [
        'user_id',
        'prescription_no',
        'medicine_name',
        'pharmacist_name',
        'shape_filter',
        'auto_count',
        'manual_count',
        'confidence_score',
        'lighting_quality',
        'blur_score',
        'image_path',
        'annotated_image_path',
        'detected_items',
        'notes',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'detected_items' => 'array',
        'auto_count' => 'integer',
        'manual_count' => 'integer',
        'confidence_score' => 'float',
        'blur_score' => 'float',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Petugas farmasi pemilik sesi penghitungan.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
