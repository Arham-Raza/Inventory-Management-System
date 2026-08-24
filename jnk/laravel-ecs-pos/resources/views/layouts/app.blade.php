<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', 'ECS POS')</title>
    <style>
        :root{--bg:#eef2f6;--panel:#fff;--ink:#0f172a;--muted:#64748b;--line:#d9e2ec;--primary:#00796b;--primary2:#00a884;--danger:#c2410c;--nav:#0b1220;--nav2:#121c2e;--blue:#2563eb;--amber:#d97706}
        *{box-sizing:border-box}body{margin:0;font-family:Inter,Segoe UI,Arial,sans-serif;background:var(--bg);color:var(--ink)}a{text-decoration:none;color:inherit}
        .shell{display:flex;min-height:100vh}.sidebar{width:268px;background:linear-gradient(180deg,var(--nav),var(--nav2));color:#fff;padding:22px 16px;display:flex;flex-direction:column;gap:18px;box-shadow:8px 0 30px rgba(15,23,42,.12)}
        .brand{font-weight:900;font-size:24px;letter-spacing:.2px}.brand small{display:block;color:#94a3b8;font-size:12px;font-weight:700;margin-top:4px}.userbox{font-size:13px;color:#dbeafe;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.05);border-radius:12px;padding:14px}
        .nav{display:grid;gap:7px}.nav a,.logout{display:block;width:100%;border:0;border-radius:10px;padding:12px 13px;background:transparent;color:#e5e7eb;text-align:left;font:inherit;font-weight:750;cursor:pointer}.nav a:hover,.logout:hover{background:rgba(255,255,255,.09)}
        .main{flex:1;padding:28px;overflow:auto}.topline{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:22px}.h1{font-size:30px;font-weight:900;margin:0;letter-spacing:0}.sub{color:var(--muted);margin:6px 0 0}
        .grid{display:grid;gap:16px}.grid-4{grid-template-columns:repeat(4,minmax(0,1fr))}.grid-3{grid-template-columns:repeat(3,minmax(0,1fr))}.grid-2{grid-template-columns:repeat(2,minmax(0,1fr))}
        .card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:18px;box-shadow:0 8px 30px rgba(15,23,42,.06)}.metric{font-size:28px;font-weight:900}.label{font-size:13px;color:var(--muted)}
        .table-wrap{width:100%;overflow:auto;border-radius:12px;box-shadow:0 8px 24px rgba(15,23,42,.04)}table{width:100%;min-width:860px;border-collapse:separate;border-spacing:0;background:#fff;border:1px solid var(--line);border-radius:12px;overflow:hidden}th,td{padding:13px 14px;border-bottom:1px solid #edf2f7;text-align:left;font-size:14px;vertical-align:top}th{font-size:12px;color:#607086;text-transform:uppercase;background:#f8fafc;font-weight:900}.right{text-align:right}tr:last-child td{border-bottom:0}
        .btn{display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:10px;padding:12px 16px;background:#111827;color:#fff;font-weight:850;cursor:pointer;gap:8px}.btn.primary{background:linear-gradient(135deg,var(--primary),var(--primary2))}.btn.blue{background:var(--blue)}.btn.danger{background:var(--danger)}.btn.light{background:#eef2f6;color:#101828}.btn.big{font-size:18px;padding:18px 20px;border-radius:14px}.btn:disabled{opacity:.5;cursor:not-allowed}
        .field{display:grid;gap:7px;margin-bottom:14px}.field label{font-size:13px;font-weight:850}.input,.select{width:100%;border:1px solid #cfd8e3;border-radius:10px;padding:12px 13px;font:inherit;background:#fff}.input:focus,.select:focus{outline:3px solid rgba(0,168,132,.18);border-color:var(--primary2)}
        .alert{padding:12px 14px;border-radius:10px;margin-bottom:16px;font-weight:750}.alert.ok{background:#ecfdf3;color:#027a48}.alert.err{background:#fff1f2;color:#be123c}.chip{display:inline-flex;border-radius:999px;padding:5px 10px;font-size:12px;font-weight:900}.chip.ok{background:#ecfdf3;color:#027a48}.chip.sold{background:#f1f5f9;color:#475569}.chip.warn{background:#fffbeb;color:#b45309}
        .pos{display:grid;grid-template-columns:minmax(540px,1fr) 440px;gap:18px;height:calc(100vh - 56px)}.pos-left,.pos-cart{background:#fff;border:1px solid var(--line);border-radius:16px;overflow:auto;box-shadow:0 12px 36px rgba(15,23,42,.08)}.pos-left{padding:22px}.pos-cart{padding:0;display:flex;flex-direction:column}.scan-panel{background:linear-gradient(135deg,#0f766e,#0ea5a2);color:#fff;border-radius:18px;padding:22px;margin-bottom:18px}.scan-panel label{color:#dffcf7}.scan{font-size:24px;padding:20px;border-radius:14px;border:0;box-shadow:inset 0 0 0 1px rgba(255,255,255,.2)}.scan-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.scan-meta div{background:#f8fafc;border:1px solid var(--line);border-radius:14px;padding:16px}.cart-head{padding:18px 20px;background:#101828;color:#fff}.cart-body{padding:16px;flex:1;overflow:auto}.cart-actions{padding:16px;border-top:1px solid var(--line);background:#f8fafc}.cart-item{border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:12px;background:#fff}.cart-title{font-weight:900}.totals{border-top:1px solid var(--line);padding-top:14px;margin-top:14px;display:grid;gap:10px}.row{display:flex;justify-content:space-between;gap:10px}.total{font-size:28px;font-weight:950;color:#0f766e}.toast{position:fixed;right:20px;bottom:20px;background:#111827;color:#fff;padding:14px 17px;border-radius:12px;display:none;z-index:50;box-shadow:0 16px 42px rgba(0,0,0,.2)}
        .modal{position:fixed;inset:0;background:rgba(15,23,42,.62);display:none;align-items:center;justify-content:center;z-index:40;padding:14px}.modal-card{width:min(680px,92vw);max-height:92vh;overflow:auto;background:#fff;border-radius:18px;padding:24px;box-shadow:0 24px 70px rgba(15,23,42,.28)}
        .login-page{min-height:100vh;display:grid;grid-template-columns:minmax(0,1fr) 440px}.login-visual{position:relative;overflow:hidden;background:#0b1220;color:#fff;padding:56px;display:flex;flex-direction:column;justify-content:space-between}.login-visual:before{content:"";position:absolute;inset:0;background:linear-gradient(120deg,rgba(11,18,32,.96),rgba(0,121,107,.78)),url('https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=80');background-size:cover;background-position:center}.login-visual>*{position:relative}.login-headline{font-size:54px;font-weight:950;margin-top:24px;max-width:720px;line-height:1.02}.login-card{background:#fff;padding:42px;display:flex;align-items:center}.login-badge{display:inline-flex;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:8px 12px;font-weight:850;color:#dffcf7}.action-row{display:flex;gap:10px;flex-wrap:wrap}
        .label-sheet{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}.barcode-label{background:#fff;border:1px dashed #94a3b8;border-radius:8px;padding:10px;text-align:center;break-inside:avoid}.barcode-label svg{width:100%;height:52px}.label-model{font-weight:900;font-size:12px;margin-top:5px}.label-serial{font-family:Consolas,monospace;font-weight:900;font-size:13px}
        @media(max-width:980px){.shell{display:block}.sidebar{width:auto;position:sticky;top:0;z-index:30;border-radius:0;padding:14px 14px 12px;gap:12px}.brand{font-size:20px}.brand small{display:none}.userbox{display:none}.nav{display:flex;gap:8px;overflow:auto;padding-bottom:4px}.nav a,.logout{white-space:nowrap;padding:10px 12px;border-radius:999px;background:rgba(255,255,255,.08)}.nav form{display:block;flex:0 0 auto}.grid-4,.grid-3,.grid-2,.pos,.login-page{grid-template-columns:1fr}.pos{height:auto}.main{padding:16px}.scan-meta{grid-template-columns:1fr}.login-visual{min-height:320px;padding:34px}.login-headline{font-size:38px}.login-card{padding:30px}.topline{align-items:flex-start;flex-direction:column}.action-row{width:100%}.action-row .btn{flex:1}.pos-left,.pos-cart{border-radius:14px}.pos-cart{max-height:none}.cart-head{padding:16px}.cart-body{max-height:48vh}.modal-card .grid-3{grid-template-columns:1fr}.scan{font-size:20px;padding:16px}.h1{font-size:26px}}
        @media(max-width:640px){body{background:#f8fafc}.main{padding:12px}.card{padding:14px;border-radius:10px}.login-visual{min-height:280px;padding:24px}.login-headline{font-size:31px;line-height:1.08}.login-visual p{font-size:15px!important;line-height:1.5!important}.login-visual .grid-3{display:none}.login-card{padding:24px}.sidebar{padding:12px}.nav a,.logout{font-size:13px;padding:9px 11px}.pos{gap:12px}.pos-left{padding:14px}.scan-panel{padding:16px;border-radius:14px}.scan-panel p{font-size:13px}.scan-meta div{padding:12px}.pos-help{display:none}.cart-actions{padding:14px}.total{font-size:23px}.btn.big{font-size:16px;padding:15px 16px}.toast{left:12px;right:12px;bottom:12px}.label-sheet{grid-template-columns:1fr}.barcode-label{min-height:126px}.table-wrap{margin-left:-2px;margin-right:-2px}.h1{font-size:24px}.metric{font-size:24px}}
        @media print{.sidebar,.no-print,.main>.topline,.cart-head{display:none!important}.shell,.main{display:block;padding:0;background:#fff}.receipt{max-width:80mm;margin:0;color:#000;border:0;box-shadow:none}.receipt *{font-family:Consolas,monospace!important}.label-sheet{grid-template-columns:repeat(3,64mm);gap:3mm}.barcode-label{width:64mm;height:34mm;border:1px dashed #999;border-radius:0;padding:3mm}.barcode-label svg{height:14mm}}
    </style>
</head>
<body>
@auth
    <div class="shell">
        <aside class="sidebar no-print">
            <div class="brand">ECS POS<small>Serialized laptop retail</small></div>
            <div class="userbox">
                <strong>{{ auth()->user()->name }}</strong><br>
                {{ auth()->user()->role }}
            </div>
            <nav class="nav">
                @if(in_array(auth()->user()->role, ['SUPER_ADMIN','MANAGER']))
                    <a href="{{ route('dashboard') }}">Dashboard</a>
                    <a href="{{ route('inventory.index') }}">Inventory</a>
                @endif
                @if(in_array(auth()->user()->role, ['SUPER_ADMIN','MANAGER','DATA_ENTRY']))
                    <a href="{{ route('data-entry.index') }}">Receive Stock</a>
                    <a href="{{ route('barcodes.index') }}">Barcode Labels</a>
                @endif
                @if(in_array(auth()->user()->role, ['SUPER_ADMIN','MANAGER','CASHIER']))
                    <a href="{{ route('pos.index') }}">POS Terminal</a>
                @endif
                @if(auth()->user()->role === 'SUPER_ADMIN')
                    <a href="{{ route('discounts.index') }}">Discounts</a>
                    <a href="{{ route('employees.index') }}">Employees</a>
                    <a href="{{ route('accounting.index') }}">Accounting</a>
                @endif
                <form method="post" action="{{ route('logout') }}">@csrf<button class="logout">Sign out</button></form>
            </nav>
        </aside>
        <main class="main">
            @if(session('status'))<div class="alert ok">{{ session('status') }}</div>@endif
            @if($errors->any())<div class="alert err">{{ $errors->first() }}</div>@endif
            @yield('content')
        </main>
    </div>
@else
    @yield('content')
@endauth
</body>
</html>
