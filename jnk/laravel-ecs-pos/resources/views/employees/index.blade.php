@extends('layouts.app')
@section('title', 'Employees - ECS POS')
@section('content')
<div class="topline"><div><h1 class="h1">Employees</h1><p class="sub">Create accounts and assign access roles.</p></div></div>
<form class="card" method="post" action="{{ route('employees.store') }}">
    @csrf
    <div class="grid grid-4">
        <div class="field"><label>Name</label><input class="input" name="name" required></div>
        <div class="field"><label>Email</label><input class="input" name="email" type="email" required></div>
        <div class="field"><label>Password</label><input class="input" name="password" type="password" required></div>
        <div class="field"><label>Role</label><select class="select" name="role"><option>SUPER_ADMIN</option><option>MANAGER</option><option>DATA_ENTRY</option><option>CASHIER</option></select></div>
    </div>
    <button class="btn primary">Create Employee</button>
</form>
<div style="height:18px"></div>
<div class="table-wrap">
<table>
    <thead><tr><th>Name</th><th>Email</th><th>Role</th><th class="right">Orders</th></tr></thead>
    <tbody>
    @foreach($employees as $employee)
        <tr><td>{{ $employee->name }}</td><td>{{ $employee->email }}</td><td><span class="chip warn">{{ $employee->role }}</span></td><td class="right">{{ $employee->orders_count }}</td></tr>
    @endforeach
    </tbody>
</table>
</div>
@endsection
