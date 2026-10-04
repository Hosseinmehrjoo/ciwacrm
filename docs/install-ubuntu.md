# نصب CIWA CRM روی اوبونتو (سرور محلی برای کارمندان)

نسخهٔ وبِ همین راهنما (قابل آپلود در سایت): [`install-ubuntu.html`](./install-ubuntu.html)

این راهنما برای یک **اوبونتو تازه** است که هیچ پیش‌نیازی ندارد. هدف: CRM روی یک کامپیوتر/سرور داخل شبکه بالا بیاید و بقیهٔ کارمندان از مرورگر خودشان به همان سرور وصل شوند و با حساب خودشان وارد شوند.

نسخهٔ پیشنهادی سیستم‌عامل: **Ubuntu 26.04 LTS** (یا نزدیک به آن). دستورها روی سرور اوبونتو اجرا می‌شوند.

---

## ۱) تصویر کلی

| بخش | نقش | پورت |
| --- | --- | --- |
| MariaDB + هسته CRM (`docker`) | داده و API هسته | `8081` (هسته) |
| میان‌افزار (`integration`) | ورود و پروکسی امن API | `8787` |
| رابط CIWA (`frontend`) | همان چیزی که کارمند در مرورگر می‌بیند | `8443` |

کارمند فقط این را باز می‌کند:

```text
http://IP-سرور:8443
```

مثال: اگر IP سرور روی شبکهٔ داخلی `192.168.1.50` باشد → `http://192.168.1.50:8443`

---

## ۲) آماده‌سازی سرور

با کاربر عادی که `sudo` دارد وارد شوید (مثلاً `hossein`).

### ۲.۱ به‌روزرسانی سیستم

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y ca-certificates curl git ufw
```

### ۲.۲ نصب Docker

```bash
sudo apt install -y docker.io docker-compose-v2
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
```

یک‌بار از نشست خارج شوید و دوباره وارد شوید تا گروه `docker` اعمال شود. بعد این باید بدون sudo کار کند:

```bash
docker compose version
```

### ۲.۳ نصب Node.js 22 و pnpm

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pnpm@10.34.3
node -v
pnpm -v
```

---

## ۳) آوردن پروژه روی سرور

یکی از دو روش:

### روش الف) کلون از گیت

```bash
cd ~
git clone <آدرس-ریپوی-شما> crm.ciwa.ir
cd crm.ciwa.ir
```

### روش ب) کپی از کامپیوتر فعلی

از سیستم خودتان پوشهٔ پروژه را به سرور بفرستید (مثلاً با `scp` یا `rsync`) و داخل همان پوشه بروید:

```bash
cd ~/crm.ciwa.ir
```

---

## ۴) تنظیم فایل `.env` برای شبکهٔ داخلی

```bash
cp env.example .env
nano .env
```

ابتدا IP سرور روی شبکهٔ داخلی را پیدا کنید:

```bash
hostname -I | awk '{print $1}'
```

فرض کنید خروجی `192.168.1.50` است. فایل `.env` را **حداقل** این‌طور پر کنید (رمزها را عوض کنید):

```env
CIWA_DB_NAME=ciwa
CIWA_DB_USER=ciwa
CIWA_DB_PASSWORD=یک-رمز-قوی
MARIADB_ROOT_PASSWORD=یک-رمز-قوی-دیگر
CIWA_ADMIN_PASSWORD=رمز-ادمین-اولیه
CIWA_CLIENT_ID=ciwa-integration
CIWA_CLIENT_SECRET=یک-رمز-بلند-تصادفی

# آدرسی که مرورگر کارمند می‌بیند
CIWA_PUBLIC_URL=http://192.168.1.50:8443

# هسته از دید مرورگر/لینک‌ها
CIWA_CORE_PUBLIC_URL=http://192.168.1.50:8081

# هسته از دید میان‌افزار روی همین سرور
CIWA_CORE_URL=http://127.0.0.1:8081
```

نکته‌ها:

- به‌جای `192.168.1.50` همان IP واقعی سرور را بگذارید.
- اگر بعداً دامنه دارید (مثلاً `crm.company.local`) همان را به‌جای IP بگذارید.
- برای HTTP داخل شبکه، `CIWA_COOKIE_SECURE` را **فعال نکنید**.

UID میزبان را هم برای دسترسی درست فایل‌های هسته ست کنید:

```bash
echo "HOST_UID=$(id -u)" >> .env
echo "HOST_GID=$(id -g)" >> .env
```

---

## ۵) بالا آوردن پایگاه داده و هسته

از ریشهٔ پروژه:

```bash
cd ~/crm.ciwa.ir
docker compose up -d db crm
```

صبر کنید تا سالم شوند:

```bash
docker compose ps
curl -sI http://127.0.0.1:8081 | head -5
```

اولین اجرا ممکن است چند دقیقه طول بکشد (نصب Composer و نصب خاموش هسته).

اگر خطا دیدید:

```bash
docker compose logs -f crm
```

---

## ۶) بالا آوردن میان‌افزار و رابط

### ۶.۱ میان‌افزار (integration)

```bash
cd ~/crm.ciwa.ir
set -a
source .env
set +a
node integration/server.mjs
```

اگر پیام خطا نداد و پورت `8787` گوش داد، درست است. با `Ctrl+C` قطعش کنید؛ در مرحلهٔ بعد به‌صورت سرویس دائمی می‌گذاریم.

تست سریع:

```bash
curl -s http://127.0.0.1:8787/api/session
```

باید چیزی شبیه «وارد نشده‌اید» برگردد، نه خطای اتصال.

### ۶.۲ رابط (frontend)

```bash
cd ~/crm.ciwa.ir/frontend
pnpm install
pnpm build
pnpm preview --host 0.0.0.0 --port 8443
```

برای کار روزمرهٔ دفتر، `preview` پایدارتر از `pnpm dev` است.

---

## ۷) تبدیل به سرویس دائمی (systemd)

تا بعد از ریبوت هم CRM بالا بماند.

### ۷.۱ سرویس میان‌افزار

```bash
sudo tee /etc/systemd/system/ciwa-integration.service >/dev/null <<'EOF'
[Unit]
Description=CIWA CRM Integration
After=network.target docker.service
Wants=docker.service

[Service]
Type=simple
User=hossein
WorkingDirectory=/home/hossein/crm.ciwa.ir
EnvironmentFile=/home/hossein/crm.ciwa.ir/.env
Environment=PORT=8787
ExecStart=/usr/bin/node integration/server.mjs
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
```

> مسیرها و نام کاربر (`hossein`) را با واقعیت سرور خودتان عوض کنید.

### ۷.۲ سرویس رابط

```bash
sudo tee /etc/systemd/system/ciwa-frontend.service >/dev/null <<'EOF'
[Unit]
Description=CIWA CRM Frontend
After=network.target ciwa-integration.service
Requires=ciwa-integration.service

[Service]
Type=simple
User=hossein
WorkingDirectory=/home/hossein/crm.ciwa.ir/frontend
Environment=PORT=8443
Environment=CIWA_INTEGRATION_URL=http://127.0.0.1:8787
ExecStart=/usr/bin/pnpm preview --host 0.0.0.0 --port 8443
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
```

فعال‌سازی:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now docker
sudo systemctl enable --now ciwa-integration ciwa-frontend
sudo systemctl status ciwa-integration --no-pager
sudo systemctl status ciwa-frontend --no-pager
```

هسته و دیتابیس با Docker از قبل بالا هستند؛ برای بالا آمدن خودکار بعد از ریبوت:

```bash
cd ~/crm.ciwa.ir
docker compose up -d db crm
```

(معمولاً کانتینرهایی که با `docker compose up -d` ساخته شده‌اند restart policy پیش‌فرض دارند؛ اگر بعد از ریبوت بالا نیامدند همین دستور را در `@reboot` یا یک سرویس ساده بگذارید.)

---

## ۸) باز کردن فایروال برای کارمندان

```bash
sudo ufw allow OpenSSH
sudo ufw allow 8443/tcp comment 'CIWA CRM UI'
# فقط اگر لازم است هسته مستقیم دیده شود:
# sudo ufw allow 8081/tcp comment 'CIWA Core'
sudo ufw enable
sudo ufw status
```

کارمند معمولاً فقط به پورت `8443` نیاز دارد.

---

## ۹) ورود اول و ساخت کاربر برای کارمندان

1. از خود سرور یا یک سیستم داخل شبکه بروید به:
   `http://IP-سرور:8443`
2. با این مشخصات وارد شوید:
   - نام کاربری: `admin`
   - رمز: همان `CIWA_ADMIN_PASSWORD` داخل `.env`
3. از منو به بخش **کاربران** بروید و برای هر کارمند یک کاربر بسازید (نام کاربری، رمز، دسترسی).
4. رمز ادمین را بعد از ورود اول عوض کنید.

هر کارمند با مرورگر خودش (Chrome / Edge / Firefox) همان آدرس را باز می‌کند و با حساب خودش وارد می‌شود. نصب جدا روی سیستم کارمند لازم نیست.

---

## ۱۰) چک‌لیست نهایی قبل از تحویل به تیم

- [ ] `docker compose ps` وضعیت `db` و `crm` را healthy/up نشان می‌دهد
- [ ] `systemctl is-active ciwa-integration` → `active`
- [ ] `systemctl is-active ciwa-frontend` → `active`
- [ ] از یک سیستم **دیگر** در شبکه، `http://IP-سرور:8443` باز می‌شود
- [ ] ورود با `admin` موفق است
- [ ] حداقل یک کاربر تست برای کارمند ساخته و ورودش چک شده
- [ ] در `.env` دیگر `localhost` برای `CIWA_PUBLIC_URL` نیست

---

## ۱۱) به‌روزرسانی بعدی کد

```bash
cd ~/crm.ciwa.ir
git pull   # اگر از گیت استفاده می‌کنید
docker compose up -d --build db crm
cd frontend && pnpm install && pnpm build
sudo systemctl restart ciwa-integration ciwa-frontend
```

---

## ۱۲) عیب‌یابی سریع

| مشکل | کار پیشنهادی |
| --- | --- |
| از سیستم دیگر صفحه باز نمی‌شود | IP سرور، `ufw`، و `ss -ltnp \| grep 8443` را چک کنید |
| صفحه باز است ولی ورود خطا می‌دهد | `systemctl status ciwa-integration` و لاگ `docker compose logs crm` |
| بعد از ریبوت قطع است | `docker compose up -d` و `systemctl start ciwa-integration ciwa-frontend` |
| کوکی/نشست عجیب است | مطمئن شوید کارمند دقیقاً همان `CIWA_PUBLIC_URL` را باز می‌کند، نه `localhost` |
| `pnpm: command not found` در سرویس | مسیر کامل `which pnpm` را در `ExecStart` بگذارید |

لاگ سرویس‌ها:

```bash
journalctl -u ciwa-integration -f
journalctl -u ciwa-frontend -f
docker compose -f ~/crm.ciwa.ir/docker-compose.yml logs -f crm
```

---

## ۱۳) اختیاری: اجرای همه‌چیز داخل Docker

اگر ترجیح می‌دهید frontend و integration هم کانتینری باشند:

```bash
cd ~/crm.ciwa.ir
docker compose --profile container up -d
```

در این حالت هم باید در `.env` آدرس‌های `CIWA_PUBLIC_URL` و `CIWA_CORE_PUBLIC_URL` روی IP شبکهٔ داخلی باشند. برای محیط دفتر، روش systemd بخش‌های ۶ و ۷ معمولاً ساده‌تر دیباگ می‌شود.

---

## ۱۴) تلفن / CIWA Telecom (اختیاری)

ماژول تلفن جدا از هستهٔ CRM است و به سرویس CIWA Telecom روی همان شبکه یا همان سرور نیاز دارد. برای استقرار اولیهٔ CRM لازم نیست؛ بعد از پایدار شدن ورود کارمندان، در زبانهٔ تنظیمات گوشی آدرس API مرکز تلفن را وارد کنید.

---

## خلاصهٔ یک‌خطی برای کارمند

> برو به `http://IP-سرور:8443`، با کاربری که ادمین برایت ساخته وارد شو.
