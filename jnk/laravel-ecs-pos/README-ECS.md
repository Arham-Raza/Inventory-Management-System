# ECS POS Laravel

This app targets the Wampserver PHP 8.3 runtime:

```bat
serve-php83.bat
test-php83.bat
composer-php83.bat install
```

The global Windows `php` command may still point to `C:\wamp64\bin\php\php8.0.30\php.exe`.
Use the helper scripts above unless PATH is updated to PHP 8.3.

Local URL:

```text
http://127.0.0.1:8000/login
```

Seeded accounts:

```text
admin@ecs.com / admin123
manager@ecs.com / manager123
dataentry@ecs.com / dataentry123
cashier@ecs.com / cashier123
```
