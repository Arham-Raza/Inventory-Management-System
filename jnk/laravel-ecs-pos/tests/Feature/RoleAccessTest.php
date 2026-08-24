<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class RoleAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_cashier_can_open_pos_but_not_admin_dashboard()
    {
        $cashier = $this->user('CASHIER');

        $this->actingAs($cashier)->get(route('pos.index'))->assertOk();
        $this->actingAs($cashier)->get(route('dashboard'))->assertForbidden();
    }

    public function test_data_entry_can_receive_stock_but_not_open_pos()
    {
        $dataEntry = $this->user('DATA_ENTRY');

        $this->actingAs($dataEntry)->get(route('data-entry.index'))->assertOk();
        $this->actingAs($dataEntry)->get(route('pos.index'))->assertForbidden();
    }

    public function test_manager_cannot_manage_super_admin_only_sections()
    {
        $manager = $this->user('MANAGER');

        $this->actingAs($manager)->get(route('dashboard'))->assertOk();
        $this->actingAs($manager)->get(route('discounts.index'))->assertForbidden();
        $this->actingAs($manager)->get(route('employees.index'))->assertForbidden();
        $this->actingAs($manager)->get(route('accounting.index'))->assertForbidden();
    }

    public function test_root_redirects_by_role()
    {
        $this->actingAs($this->user('CASHIER'))->get('/')->assertRedirect(route('pos.index'));
        $this->actingAs($this->user('DATA_ENTRY'))->get('/')->assertRedirect(route('data-entry.index'));
        $this->actingAs($this->user('SUPER_ADMIN'))->get('/')->assertRedirect(route('dashboard'));
    }

    public function test_home_alias_redirects_to_role_aware_root()
    {
        $this->actingAs($this->user('SUPER_ADMIN'))->get('/home')->assertRedirect('/');
    }

    private function user(string $role): User
    {
        return User::factory()->create([
            'password' => Hash::make('password'),
            'role' => $role,
        ]);
    }
}
