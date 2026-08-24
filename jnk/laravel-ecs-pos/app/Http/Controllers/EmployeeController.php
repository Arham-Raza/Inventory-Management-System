<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class EmployeeController extends Controller
{
    public function index()
    {
        return view('employees.index', [
            'employees' => User::withCount('orders')->orderBy('role')->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'min:6'],
            'role' => ['required', 'in:SUPER_ADMIN,MANAGER,DATA_ENTRY,CASHIER'],
        ]);

        $data['password'] = Hash::make($data['password']);
        User::create($data);

        return back()->with('status', 'Employee account created.');
    }
}
