@extends('layouts.app')
@section('title', 'Login - ECS POS')
@section('content')
<div class="login-page">
    <section class="login-visual">
        <div>
            <span class="login-badge">Easy Connect Solutions</span>
            <div class="login-headline">Serialized laptop retail, built for fast checkout.</div>
            <p style="font-size:18px;color:#dbeafe;max-width:620px;line-height:1.65">Scan a laptop, confirm RAM and drive configuration, collect payment, and print a warranty receipt with the exact serial number.</p>
        </div>
        <div class="grid grid-3" style="max-width:760px">
            <div style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.16);border-radius:16px;padding:16px"><strong>Barcode Ready</strong><br><span style="color:#cbd5e1">Code 128 labels</span></div>
            <div style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.16);border-radius:16px;padding:16px"><strong>Warranty Receipts</strong><br><span style="color:#cbd5e1">Thermal print format</span></div>
            <div style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.16);border-radius:16px;padding:16px"><strong>Role Secure</strong><br><span style="color:#cbd5e1">Cashier, manager, admin</span></div>
        </div>
    </section>
    <section class="login-card">
        <form method="post" action="{{ route('login.attempt') }}" style="width:100%">
            @csrf
            <h1 class="h1">Sign in</h1>
            <p class="sub">Open your store terminal.</p>
            @if($errors->any())<div class="alert err">{{ $errors->first() }}</div>@endif
            <div class="field"><label>Email</label><input class="input" name="email" type="email" value="{{ old('email') }}" autofocus required></div>
            <div class="field"><label>Password</label><input class="input" name="password" type="password" required></div>
            <button class="btn primary big" style="width:100%">Sign in</button>
            <p class="sub" style="font-size:12px;margin-top:18px">Demo: admin@ecs.com / admin123</p>
        </form>
    </section>
</div>
@endsection
