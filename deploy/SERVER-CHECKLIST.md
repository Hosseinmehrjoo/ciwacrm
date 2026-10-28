# چک‌لیست دیپلوی سرور

## قبل از اتصال

- [x] `docker-compose.yml` با `restart: unless-stopped`
- [x] `env.example` کامل برای پروداکشن
- [x] `deploy/bootstrap-server.sh` نصب یک‌مرحله‌ای
- [x] قالب systemd در `deploy/systemd/`
- [x] بیلد فرانت (`pnpm build`) موفق
- [x] `vite preview` بدون whitelist دامنهٔ ثابت

## از شما لازم است

1. **SSH**: آی‌پی / دامنه، پورت، نام کاربری، روش ورود (رمز یا کلید)
2. **دامنه یا IP عمومی** برای `CIWA_PUBLIC_URL`
3. **HTTPS؟** اگر بله: گواهی آماده / nginx / Cloudflare
4. آیا دیتابیس تازه باشد یا از همین محیط کپی شود؟

## روی سرور (خلاصه)

```bash
# پیش‌نیاز: Docker، Node 22، pnpm — طبق docs/install-ubuntu.md
cp env.example .env   # رمزها و URL را عوض کنید
./deploy/bootstrap-server.sh
sudo ufw allow 8443/tcp
```

ورود اول: کاربر `admin` و رمز `CIWA_ADMIN_PASSWORD`.
