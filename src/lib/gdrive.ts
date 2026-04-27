import { readFile } from 'node:fs/promises';
import { SignJWT } from 'jose';

import { getAbsolutePath } from '@/lib/storage';

type ShareMode = 'anyone' | 'domain' | 'private';

type GDriveUploadResult = {
  fileId: string;
  webViewLink: string;
};

type AccessTokenSource = 'oauth' | 'service_account';

function getRequiredEnv(name: string) {
  const value = String(process.env[name] ?? '').trim();
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function getShareMode(): ShareMode {
  const raw = String(process.env.GDRIVE_SHARE_MODE ?? 'anyone').trim().toLowerCase();
  if (raw === 'domain' || raw === 'private') return raw;
  return 'anyone';
}

async function getGoogleAccessToken() {
  const hasOAuth =
    String(process.env.GDRIVE_OAUTH_CLIENT_ID ?? '').trim() &&
    String(process.env.GDRIVE_OAUTH_CLIENT_SECRET ?? '').trim() &&
    String(process.env.GDRIVE_OAUTH_REFRESH_TOKEN ?? '').trim();

  if (hasOAuth) {
    return getGoogleAccessTokenFromOAuth();
  }
  return getGoogleAccessTokenFromServiceAccount();
}

async function getGoogleAccessTokenFromOAuth() {
  const clientId = getRequiredEnv('GDRIVE_OAUTH_CLIENT_ID');
  const clientSecret = getRequiredEnv('GDRIVE_OAUTH_CLIENT_SECRET');
  const refreshToken = getRequiredEnv('GDRIVE_OAUTH_REFRESH_TOKEN');
  const body = new URLSearchParams();
  body.set('client_id', clientId);
  body.set('client_secret', clientSecret);
  body.set('refresh_token', refreshToken);
  body.set('grant_type', 'refresh_token');

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  const json = (await resp.json().catch(() => ({}))) as { access_token?: string; error_description?: string; error?: string };
  if (!resp.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || 'Failed to get OAuth access token');
  }
  return { accessToken: json.access_token, source: 'oauth' as AccessTokenSource };
}

async function getGoogleAccessTokenFromServiceAccount() {
  const email = getRequiredEnv('GDRIVE_SERVICE_ACCOUNT_EMAIL');
  const privateKeyRaw = getRequiredEnv('GDRIVE_PRIVATE_KEY');
  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
  const scope = String(process.env.GDRIVE_SCOPE ?? 'https://www.googleapis.com/auth/drive').trim();

  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(email)
    .setSubject(email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .setJti(`${now}-${Math.random().toString(36).slice(2)}`)
    .sign(await importPKCS8(privateKey, 'RS256'));

  const body = new URLSearchParams();
  body.set('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
  body.set('assertion', assertion);

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  const json = (await resp.json().catch(() => ({}))) as { access_token?: string; error_description?: string; error?: string };
  if (!resp.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || 'Failed to get Google OAuth token');
  }
  return { accessToken: json.access_token, source: 'service_account' as AccessTokenSource };
}

async function importPKCS8(key: string, alg: 'RS256') {
  const { importPKCS8 } = await import('jose');
  return importPKCS8(key, alg);
}

async function ensureFilePermission(fileId: string, accessToken: string) {
  const mode = getShareMode();
  if (mode === 'private') return;

  const payload: Record<string, string> =
    mode === 'domain'
      ? { type: 'domain', role: 'reader', domain: getRequiredEnv('GDRIVE_SHARE_DOMAIN') }
      : { type: 'anyone', role: 'reader' };

  const resp = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions?supportsAllDrives=true`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`Failed to set Google Drive permission: ${txt || resp.statusText}`);
  }
}

async function ensureTargetFolderAccessible(folderId: string, accessToken: string, source: AccessTokenSource) {
  const url =
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}` +
    '?supportsAllDrives=true&fields=id,name,mimeType,capabilities(canAddChildren)';
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const json = (await resp.json().catch(() => ({}))) as {
    id?: string;
    mimeType?: string;
    capabilities?: { canAddChildren?: boolean };
    error?: { message?: string };
  };
  if (!resp.ok || !json.id) {
    const msg = json?.error?.message || 'Cannot access GDRIVE_FOLDER_ID';
    throw new Error(`GDRIVE_FOLDER_ID is not accessible by ${source}: ${msg}`);
  }
  if (json.mimeType !== 'application/vnd.google-apps.folder') {
    throw new Error('GDRIVE_FOLDER_ID is not a folder');
  }
  if (json.capabilities?.canAddChildren === false) {
    throw new Error('Service account cannot upload into GDRIVE_FOLDER_ID (no write permission)');
  }
}

export async function uploadArchiveFileToGoogleDrive(args: {
  relativePath: string;
  originalName: string;
  mimeType: string;
}) {
  const folderId = String(process.env.GDRIVE_FOLDER_ID ?? '').trim();
  if (!folderId) {
    throw new Error('GDRIVE_FOLDER_ID is required');
  }
  const token = await getGoogleAccessToken();
  const accessToken = token.accessToken;
  await ensureTargetFolderAccessible(folderId, accessToken, token.source);
  const absPath = getAbsolutePath(args.relativePath);
  const fileBuffer = await readFile(absPath);

  const metadata: Record<string, unknown> = { name: args.originalName, parents: [folderId] };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([fileBuffer], { type: args.mimeType || 'application/octet-stream' }), args.originalName);

  const resp = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      body: form
    }
  );
  const json = (await resp.json().catch(() => ({}))) as { id?: string; webViewLink?: string; error?: { message?: string } };
  if (!resp.ok || !json.id) {
    const msg = json?.error?.message || `Google Drive upload failed (${resp.status})`;
    throw new Error(msg);
  }

  await ensureFilePermission(json.id, accessToken);

  const webViewLink = String(json.webViewLink ?? `https://drive.google.com/file/d/${json.id}/view`).trim();
  const result: GDriveUploadResult = { fileId: json.id, webViewLink };
  return result;
}

export async function deleteGoogleDriveFile(fileId: string) {
  const id = String(fileId ?? '').trim();
  if (!id) return;

  const token = await getGoogleAccessToken();
  const resp = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?supportsAllDrives=true`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token.accessToken}` }
  });

  // Treat "already deleted or inaccessible" as non-fatal for unlink flow.
  if (resp.status === 404 || resp.status === 410) return;
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`Failed to delete Google Drive file: ${txt || resp.statusText}`);
  }
}
