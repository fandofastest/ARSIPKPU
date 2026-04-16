# Digital Archive System (Next.js 14 + MongoDB + Filesystem Storage)

Internal digital archive system for a government office.

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- MongoDB (Mongoose)
- JWT auth in HTTP-only cookies
- Linux filesystem storage (NAS-ready via `ARCHIVE_BASE_PATH`)

## Requirements

- Node.js 20+
- MongoDB reachable from the app server
- A Linux storage path (local disk or mounted NAS)

## Environment Variables

Create `.env.local` in the project root:

```
MONGODB_URI=mongodb://admin:Palang66@158.180.79.130:27017/kpuarchive?authSource=admin
ARCHIVE_BASE_PATH=/data/archive/raw
JWT_SECRET=change_this_secret
MAX_FILE_SIZE=104857600
```

Important:

- `ARCHIVE_BASE_PATH` must be writable by the user running the Next.js server.
- Storage path is never hardcoded. To migrate to NAS, only update `ARCHIVE_BASE_PATH`.

## Storage Folder Setup (Linux)

Create the folder and set permissions, for example:

```
sudo mkdir -p /data/archive/raw
sudo chown -R $USER:$USER /data/archive/raw
```

Soft deletes move files to:

- `${ARCHIVE_BASE_PATH}/_trash/`

## Install

```
npm install
```

## Seed Admin User

Creates:

- name: Administrator
- phone: 081234567890
- password: admin123
- role: admin

Run:

```
npm run seed
```

## Run Dev

```
npm run dev
```

Open:

- http://localhost:3000

## Usage

- Login: `/login`
- Dashboard: `/dashboard`
- Upload: `/upload`
- Browse/download: `/archive`

## API Summary

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/upload` (multipart/form-data, field name: `file`, optional `description`)
- `GET /api/archive` (pagination + search)
- `GET /api/archive/[id]` (stream download)
- `DELETE /api/archive/[id]` (soft delete -> move to trash)
