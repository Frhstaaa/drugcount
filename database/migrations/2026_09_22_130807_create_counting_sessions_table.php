<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('counting_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('prescription_no')->nullable()->index();
            $table->string('medicine_name')->nullable()->index();
            $table->string('pharmacist_name')->nullable();
            $table->string('shape_filter')->default('all');
            $table->integer('auto_count')->default(0);
            $table->integer('manual_count')->default(0);
            $table->float('confidence_score')->nullable();
            $table->string('lighting_quality')->nullable();
            $table->float('blur_score')->nullable();
            $table->string('image_path')->nullable();
            $table->string('annotated_image_path')->nullable();
            $table->json('detected_items')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('counting_sessions');
    }
};
