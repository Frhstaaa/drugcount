<?php

namespace Tests\Feature;

use App\Models\CountingSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MultiUserAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected_to_login(): void
    {
        $response = $this->get('/');
        $response->assertRedirect('/login');

        $historyResponse = $this->get('/history');
        $historyResponse->assertRedirect('/login');
    }

    public function test_first_user_registration_attaches_orphaned_sessions(): void
    {
        // Buat 2 sesi lama sebelum ada user
        $oldSession = CountingSession::create([
            'prescription_no' => 'RX-111111',
            'medicine_name' => 'Paracetamol 500mg',
            'pharmacist_name' => 'Petugas Lama',
            'auto_count' => 10,
            'manual_count' => 10,
        ]);

        $this->assertNull($oldSession->user_id);

        // Registrasi user pertama
        $regResponse = $this->post('/register', [
            'name' => 'apt. Sarah Pratama, S.Farm',
            'email' => 'sarah@klinik.id',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $regResponse->assertRedirect('/');
        $this->assertAuthenticated();

        $user = User::first();
        $this->assertEquals('sarah@klinik.id', $user->email);

        // Sesi lama otomatis terikat ke user pertama
        $oldSession->refresh();
        $this->assertEquals($user->id, $oldSession->user_id);
    }

    public function test_user_history_is_strictly_isolated(): void
    {
        // Buat User 1 (Sarah) dan sesinya
        $sarah = User::create([
            'name' => 'apt. Sarah Pratama',
            'email' => 'sarah@klinik.id',
            'password' => bcrypt('password123'),
        ]);

        $sarahSession = CountingSession::create([
            'user_id' => $sarah->id,
            'prescription_no' => 'RX-SARAH-01',
            'medicine_name' => 'Amoxicillin 500mg',
            'pharmacist_name' => $sarah->name,
            'auto_count' => 20,
            'manual_count' => 20,
        ]);

        // Buat User 2 (Budi) dan sesinya
        $budi = User::create([
            'name' => 'apt. Budi Santoso',
            'email' => 'budi@klinik.id',
            'password' => bcrypt('password123'),
        ]);

        $budiSession = CountingSession::create([
            'user_id' => $budi->id,
            'prescription_no' => 'RX-BUDI-01',
            'medicine_name' => 'Ibuprofen 400mg',
            'pharmacist_name' => $budi->name,
            'auto_count' => 15,
            'manual_count' => 15,
        ]);

        // Login sebagai Budi
        $this->actingAs($budi);

        // API list sesi Budi hanya mengembalikan data Budi
        $response = $this->getJson('/api/sessions');
        $response->assertOk();
        $data = $response->json('data');

        $this->assertCount(1, $data);
        $this->assertEquals('RX-BUDI-01', $data[0]['prescription_no']);
        $this->assertEquals('Ibuprofen 400mg', $data[0]['medicine_name']);

        // Budi mencoba menghapus sesi milik Sarah -> harus ditolak 404 (tidak ditemukan di scope Budi)
        $delResponse = $this->deleteJson('/api/sessions/' . $sarahSession->id);
        $delResponse->assertNotFound();

        // Pastikan sesi Sarah masih tetap utuh di database
        $this->assertDatabaseHas('counting_sessions', [
            'id' => $sarahSession->id,
            'prescription_no' => 'RX-SARAH-01',
        ]);

        // Budi menghapus sesinya sendiri -> berhasil
        $delBudiResponse = $this->deleteJson('/api/sessions/' . $budiSession->id);
        $delBudiResponse->assertOk();
        $this->assertDatabaseMissing('counting_sessions', ['id' => $budiSession->id]);
    }
}
