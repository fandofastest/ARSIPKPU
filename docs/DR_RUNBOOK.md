# DR Runbook (Backup & Restore)

Dokumen ini menjelaskan prosedur backup dan restore untuk deployment Docker di Linux.

## 1) Tujuan

- Menjaga data MongoDB dan file arsip tetap aman.
- Menyediakan prosedur restore yang bisa dieksekusi cepat saat insiden.
- Mengurangi risiko kehilangan data permanen.

## 2) Scope Data

- Database: MongoDB (`mongo` container).
- File dokumen: folder host dari `ARCHIVE_HOST_PATH` (default `./storage`).
- Snapshot env: salinan `.env.docker` saat backup dilakukan.

## 3) Script yang Disediakan

- `scripts/dr/backup.sh`
- `scripts/dr/restore.sh`

Catatan:
- Script ditujukan dijalankan di server Linux deployment.
- Jalankan dengan user yang punya akses `docker`.

## 4) Persiapan di VPS

1. Salin script ke VPS (jika belum):
   - `scripts/dr/backup.sh`
   - `scripts/dr/restore.sh`
2. Beri izin executable:

```bash
chmod +x scripts/dr/backup.sh scripts/dr/restore.sh
```

3. Pastikan service compose normal:

```bash
docker compose --env-file .env.docker ps
```

## 5) Jalankan Backup Manual

```bash
./scripts/dr/backup.sh
```

Output default tersimpan di:
- `./backups/<timestamp>/mongo.archive.gz`
- `./backups/<timestamp>/storage.tar.gz`
- `./backups/<timestamp>/env.snapshot`
- `./backups/<timestamp>/checksums.sha256`

## 6) Opsi Backup

Environment variable yang bisa di-set:

- `PROJECT_DIR` (default: root project)
- `ENV_FILE` (default: `PROJECT_DIR/.env.docker`)
- `COMPOSE_FILE` (default: `PROJECT_DIR/docker-compose.yml`)
- `BACKUP_BASE_DIR` (default: `PROJECT_DIR/backups`)
- `KEEP_LAST` (default: `14`)
- `OFFSITE_REMOTE` (opsional; jika isi, script akan upload via `rclone`)

Contoh:

```bash
KEEP_LAST=30 BACKUP_BASE_DIR=/data/backups ./scripts/dr/backup.sh
```

## 7) Jadwal Otomatis (Cron)

Contoh backup harian jam 01:30:

```bash
30 1 * * * cd /home/fando/arsipkpu && ./scripts/dr/backup.sh >> /var/log/arsipkpu-backup.log 2>&1
```

## 8) Restore Full

Contoh restore full dari folder backup tertentu:

```bash
./scripts/dr/restore.sh --backup-dir /home/fando/arsipkpu/backups/20260417-120000 --yes
```

Perilaku restore:
- Stop `app` dan `ocr-worker`.
- Restore MongoDB (`mongorestore --drop`).
- Replace isi folder arsip dengan isi backup.
- Start ulang `app` dan `ocr-worker`.

## 9) Restore Partial

Restore DB saja:

```bash
./scripts/dr/restore.sh --backup-dir /home/fando/arsipkpu/backups/20260417-120000 --db-only --yes
```

Restore file saja:

```bash
./scripts/dr/restore.sh --backup-dir /home/fando/arsipkpu/backups/20260417-120000 --files-only --yes
```

## 10) Validasi Pasca Restore

1. Cek status container:

```bash
docker compose --env-file .env.docker ps
```

2. Cek endpoint aplikasi:

```bash
curl -I http://127.0.0.1:3000/files
```

3. Cek login dan buka sampel dokumen dari UI.
4. Cek OCR worker log:

```bash
docker compose --env-file .env.docker logs --tail=50 ocr-worker
```

## 11) Rekomendasi Operasional

- Terapkan pola `3-2-1`:
  - 3 salinan data
  - 2 media berbeda
  - 1 salinan offsite
- Lakukan uji restore minimal 1x/bulan.
- Simpan log backup dan audit hasil restore.

