# SIPADU HUKUM - Sistem Informasi Terpadu produk Hukum

Sistem arsip digital internal dengan OCR otomatis.

## Arsitektur OCR

- `app` (web/API Next.js): menerima upload, menyimpan metadata, memberi status OCR `pending`.
- `ocr-worker` (service terpisah): mengambil dokumen `pending` dari MongoDB lalu menjalankan OCR.
- Kedua service membaca path storage yang sama (`ARCHIVE_BASE_PATH`) supaya worker bisa mengakses file upload.

Mode OCR:

- `OCR_EXECUTION_MODE=external` (default direkomendasikan untuk production Docker): OCR hanya diproses oleh `ocr-worker`.
- `OCR_EXECUTION_MODE=internal`: OCR boleh dipicu dari proses web (untuk dev/sederhana).

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- MongoDB (Mongoose)
- JWT auth (HTTP-only cookies)
- Linux filesystem storage (NAS-ready via `ARCHIVE_BASE_PATH`)
- OCR CLI: `tesseract`, `pdftotext`, `pdftoppm` (di container worker)

## Deploy Docker di Linux (OCR dipisah)

1. Edit file `.env.docker` (minimal ganti):

- `MONGO_ROOT_PASSWORD`
- `JWT_SECRET`
- opsional `APP_PORT`
- opsional `ARCHIVE_HOST_PATH` (default `./storage`, otomatis dibuat Docker)

2. Jalankan semua service sekaligus (MongoDB + App + OCR Worker):

```bash
docker compose --env-file .env.docker up -d --build
```

3. Cek status service.

```bash
docker compose ps
docker compose logs -f ocr-worker
```

Service yang berjalan:

- `app` di port `${APP_PORT}` (default `3000`)
- `ocr-worker` tanpa expose port, berjalan terus sebagai background processor
- `mongo` (persisten) via volume Docker `mongo_data`

## Environment Variables (utama)

- `MONGO_ROOT_USERNAME` username root MongoDB internal compose.
- `MONGO_ROOT_PASSWORD` password root MongoDB internal compose.
- `MONGO_DB_NAME` nama database aplikasi.
- `JWT_SECRET` secret token login.
- `ARCHIVE_BASE_PATH` path di dalam container (sudah di-set compose ke `/data/archive/raw`).
- `ARCHIVE_HOST_PATH` path storage di host Linux untuk di-mount ke container (default `./storage`).
- `OCR_EXECUTION_MODE` gunakan `external` untuk mode worker terpisah.
- `OCR_LANG` contoh `eng+ind`.
- `OCR_WORKER_BATCH_LIMIT` jumlah dokumen per siklus worker.
- `OCR_WORKER_POLL_MS` jeda saat worker masih ada antrian.
- `OCR_WORKER_IDLE_BACKOFF_MS` jeda saat antrian kosong.
- `GDRIVE_OAUTH_CLIENT_ID` client id OAuth 2.0 (disarankan untuk akun Gmail personal).
- `GDRIVE_OAUTH_CLIENT_SECRET` client secret OAuth 2.0.
- `GDRIVE_OAUTH_REFRESH_TOKEN` refresh token OAuth 2.0.
- `GDRIVE_SERVICE_ACCOUNT_EMAIL` email service account Google (fallback jika env OAuth kosong).
- `GDRIVE_PRIVATE_KEY` private key service account (fallback; format 1 baris dengan `\n`).
- `GDRIVE_FOLDER_ID` folder Drive tujuan upload (wajib).
- `GDRIVE_SHARE_MODE` mode share link: `anyone`, `domain`, atau `private`.
- `GDRIVE_SHARE_DOMAIN` domain Google Workspace jika mode `domain`.

## Persistensi Data

- Data MongoDB disimpan di volume Docker `mongo_data` (`/data/db` di container `mongo`).
- File arsip disimpan di host lewat bind mount `${ARCHIVE_HOST_PATH}` (default `./storage`).
- Jangan gunakan `docker compose down -v` jika tidak ingin data MongoDB terhapus.
- Dokumen yang dihapus masuk `Trash`, bisa di-restore, dan akan dipurge otomatis setelah 30 hari.

## Backup & DR

Script bawaan:

- `scripts/dr/backup.sh` untuk backup MongoDB + file arsip.
- `scripts/dr/restore.sh` untuk restore data dari backup.

Contoh backup manual:

```bash
chmod +x scripts/dr/backup.sh scripts/dr/restore.sh
./scripts/dr/backup.sh
```

Contoh restore full:

```bash
./scripts/dr/restore.sh --backup-dir /home/fando/arsipkpu/backups/20260417-120000 --yes
```

Dokumen langkah lengkap tersedia di:

- `docs/DR_RUNBOOK.md`

## Perintah Lokal (tanpa Docker)

Install:

```bash
npm install
```

Seed admin:

```bash
npm run seed
```

Jalankan web:

```bash
npm run dev
```

Jalankan OCR worker terpisah:

```bash
npm run ocr:worker
```
