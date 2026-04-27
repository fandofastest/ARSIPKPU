import { createReadStream, promises as fs } from 'node:fs';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import type { Readable } from 'node:stream';

const ARCHIVE_BASE_PATH_ENV = process.env.ARCHIVE_BASE_PATH;

if (!ARCHIVE_BASE_PATH_ENV) {
  throw new Error('Missing ARCHIVE_BASE_PATH env var');
}

const ARCHIVE_BASE_PATH: string = ARCHIVE_BASE_PATH_ENV;

function ensureRelativePathSafe(relativePath: string) {
  if (!relativePath.startsWith('/')) throw new Error('Invalid relativePath');
  const normalized = path.posix.normalize(relativePath);
  if (!normalized.startsWith('/')) throw new Error('Invalid relativePath');
  if (normalized.includes('..')) throw new Error('Invalid relativePath');
  return normalized;
}

function getDateParts(d = new Date()) {
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return { yyyy, mm, dd };
}

function sanitizeOriginalName(name: string) {
  const base = path.basename(name);
  return base.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function saveFile(buffer: Buffer, originalName: string, mimeType: string) {
  const { yyyy, mm, dd } = getDateParts();

  const safeOriginal = sanitizeOriginalName(originalName);
  const ext = path.extname(safeOriginal);
  const filename = `${randomUUID()}${ext}`;

  const relativePath = `/${yyyy}/${mm}/${dd}/${filename}`;
  const absDir = path.join(ARCHIVE_BASE_PATH, yyyy, mm, dd);
  const absPath = path.join(absDir, filename);

  await fs.mkdir(absDir, { recursive: true });
  await fs.writeFile(absPath, buffer);

  const st = await fs.stat(absPath);
  if (st.size <= 0) {
    await fs.unlink(absPath).catch(() => {
      // ignore
    });
    throw new Error('Failed to write file');
  }

  return { relativePath, filename, safeOriginal, mimeType, size: st.size };
}

export async function saveFileStream(readable: Readable, originalName: string, mimeType: string) {
  const { yyyy, mm, dd } = getDateParts();

  const safeOriginal = sanitizeOriginalName(originalName);
  const ext = path.extname(safeOriginal);
  const filename = `${randomUUID()}${ext}`;

  const relativePath = `/${yyyy}/${mm}/${dd}/${filename}`;
  const absDir = path.join(ARCHIVE_BASE_PATH, yyyy, mm, dd);
  const absPath = path.join(absDir, filename);

  await fs.mkdir(absDir, { recursive: true });
  const ws = createWriteStream(absPath, { flags: 'wx' });

  try {
    await pipeline(readable, ws);
    const st = await fs.stat(absPath);
    if (st.size <= 0) {
      throw new Error('Failed to write file');
    }
    return { relativePath, filename, safeOriginal, mimeType, size: st.size };
  } catch (err) {
    await fs.unlink(absPath).catch(() => {
      // ignore
    });
    throw err;
  }
}

export function getFileStream(relativePath: string) {
  const normalized = ensureRelativePathSafe(relativePath);
  const absPath = path.join(ARCHIVE_BASE_PATH, normalized.slice(1));
  return createReadStream(absPath);
}

export function getAbsolutePath(relativePath: string) {
  const normalized = ensureRelativePathSafe(relativePath);
  return path.join(ARCHIVE_BASE_PATH, normalized.slice(1));
}

export async function moveToTrash(relativePath: string) {
  const normalized = ensureRelativePathSafe(relativePath);

  const absSource = path.join(ARCHIVE_BASE_PATH, normalized.slice(1));
  const trashDir = path.join(ARCHIVE_BASE_PATH, '_trash');
  await fs.mkdir(trashDir, { recursive: true });

  const trashName = `${Date.now()}-${path.basename(normalized)}`;
  const absDest = path.join(trashDir, trashName);

  await fs.rename(absSource, absDest);
  return `/_trash/${trashName}`;
}

export async function deleteFile(relativePath: string) {
  const normalized = ensureRelativePathSafe(relativePath);
  const absPath = path.join(ARCHIVE_BASE_PATH, normalized.slice(1));
  await fs.unlink(absPath);
}

export async function restoreFromTrash(trashRelativePath: string, originalName: string) {
  const normalized = ensureRelativePathSafe(trashRelativePath);
  if (!normalized.startsWith('/_trash/')) {
    throw new Error('Invalid trash path');
  }

  const ext =
    path.extname(path.basename(originalName || '')) ||
    path.extname(path.basename(normalized)) ||
    '';
  const filename = `${randomUUID()}${ext}`;
  const { yyyy, mm, dd } = getDateParts();
  const restoredRelativePath = `/${yyyy}/${mm}/${dd}/${filename}`;

  const sourceAbsPath = path.join(ARCHIVE_BASE_PATH, normalized.slice(1));
  const destAbsDir = path.join(ARCHIVE_BASE_PATH, yyyy, mm, dd);
  const destAbsPath = path.join(destAbsDir, filename);

  await fs.mkdir(destAbsDir, { recursive: true });
  await fs.rename(sourceAbsPath, destAbsPath);
  return restoredRelativePath;
}

export async function sha256ByRelativePath(relativePath: string) {
  const normalized = ensureRelativePathSafe(relativePath);
  const absPath = path.join(ARCHIVE_BASE_PATH, normalized.slice(1));
  const rs = createReadStream(absPath);
  const hash = createHash('sha256');
  await pipeline(rs, hash as never);
  return hash.digest('hex');
}
