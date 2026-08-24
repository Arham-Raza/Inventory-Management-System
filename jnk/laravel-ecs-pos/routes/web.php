<?php

use App\Http\Controllers\AccountingController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BarcodeLabelController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DiscountController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\PosController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login'])->name('login.attempt');
});

Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth')->name('logout');

Route::middleware('auth')->group(function () {
    Route::get('/', function () {
        $role = auth()->user()->role;

        if ($role === 'CASHIER') {
            return redirect()->route('pos.index');
        }

        if ($role === 'DATA_ENTRY') {
            return redirect()->route('data-entry.index');
        }

        return redirect()->route('dashboard');
    });
    Route::get('/home', function () {
        return redirect('/');
    })->name('home');

    Route::get('/pos', [PosController::class, 'index'])
        ->middleware('role:SUPER_ADMIN,MANAGER,CASHIER')
        ->name('pos.index');
    Route::post('/pos/lookup', [PosController::class, 'lookup'])
        ->middleware('role:SUPER_ADMIN,MANAGER,CASHIER')
        ->name('pos.lookup');
    Route::post('/pos/checkout', [PosController::class, 'checkout'])
        ->middleware('role:SUPER_ADMIN,MANAGER,CASHIER')
        ->name('pos.checkout');
    Route::get('/orders/{order}/receipt', [PosController::class, 'receipt'])->name('orders.receipt');

    Route::get('/dashboard', DashboardController::class)
        ->middleware('role:SUPER_ADMIN,MANAGER')
        ->name('dashboard');

    Route::get('/inventory', [InventoryController::class, 'index'])
        ->middleware('role:SUPER_ADMIN,MANAGER')
        ->name('inventory.index');
    Route::get('/inventory/barcodes', [BarcodeLabelController::class, 'index'])
        ->middleware('role:SUPER_ADMIN,MANAGER,DATA_ENTRY')
        ->name('barcodes.index');
    Route::get('/inventory/{item}/barcode', [BarcodeLabelController::class, 'show'])
        ->middleware('role:SUPER_ADMIN,MANAGER,DATA_ENTRY')
        ->name('barcodes.show');

    Route::get('/data-entry', [InventoryController::class, 'create'])
        ->middleware('role:SUPER_ADMIN,MANAGER,DATA_ENTRY')
        ->name('data-entry.index');
    Route::post('/data-entry', [InventoryController::class, 'store'])
        ->middleware('role:SUPER_ADMIN,MANAGER,DATA_ENTRY')
        ->name('data-entry.store');

    Route::get('/discounts', [DiscountController::class, 'index'])
        ->middleware('role:SUPER_ADMIN')
        ->name('discounts.index');
    Route::post('/discounts', [DiscountController::class, 'store'])
        ->middleware('role:SUPER_ADMIN')
        ->name('discounts.store');
    Route::post('/discounts/{discount}/toggle', [DiscountController::class, 'toggle'])
        ->middleware('role:SUPER_ADMIN')
        ->name('discounts.toggle');

    Route::get('/employees', [EmployeeController::class, 'index'])
        ->middleware('role:SUPER_ADMIN')
        ->name('employees.index');
    Route::post('/employees', [EmployeeController::class, 'store'])
        ->middleware('role:SUPER_ADMIN')
        ->name('employees.store');

    Route::get('/accounting', [AccountingController::class, 'index'])
        ->middleware('role:SUPER_ADMIN')
        ->name('accounting.index');
});
