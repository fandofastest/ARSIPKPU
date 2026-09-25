import { readFile } from 'node:fs/promises';
import { SignJWT } from 'jose';

import { getAbsolutePath } from '@/lib/storage';
import { dbConnect } from '@/lib/mongodb';
import { GDriveSetting } from '@/models/GDriveSetting';

export type ShareMode = 'anyone' | 'domain' | 'private';

export type GDriveUploadResult = {
  fileId: string;
  webViewLink: string;
};

export type AccessTokenSource = 'oauth' | 'service_account';

export type GDriveResolvedConfig = {
  enabled: boolean;
  authType: 'oauth' | 'service_account';
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  folderId: string;
  serviceAccountEmail: string;
  privateKey: string;
  shareMode: ShareMode;
  shareDomain: string;
};

export async function getGDriveConfig(): Promise<GDriveResolvedConfig> {
  let dbSetting: any = null;
  try {
    await dbConnect();
    dbSetting = await GDriveSetting.findOne({ singletonKey: 'default' }).lean();
  } catch {
    // ignore db error, fallback to env
  }

  if (dbSetting) {
    return {
      enabled: Boolean(dbSetting.enabled),
      authType: (dbSetting.authType || 'oauth') as 'oauth' | 'service_account',
      clientId: String(dbSetting.clientId || process.env.GDRIVE_OAUTH_CLIENT_ID || '').trim(),
      clientSecret: String(dbSetting.clientSecret || process.env.GDRIVE_OAUTH_CLIENT_SECRET || '').trim(),
      refreshToken: String(dbSetting.refreshToken || process.env.GDRIVE_OAUTH_REFRESH_TOKEN || '').trim(),
      folderId: String(dbSetting.folderId || process.env.GDRIVE_FOLDER_ID || '').trim(),
      serviceAccountEmail: String(dbSetting.serviceAccountEmail || process.env.GDRIVE_SERVICE_ACCOUNT_EMAIL || '').trim(),
      privateKey: String(dbSetting.privateKey || process.env.GDRIVE_PRIVATE_KEY || '').trim(),
      shareMode: (dbSetting.shareMode || process.env.GDRIVE_SHARE_MODE || 'anyone') as ShareMode,
      shareDomain: String(dbSetting.shareDomain || process.env.GDRIVE_SHARE_DOMAIN || '').trim()
    };
  }

  // If no DB setting exists yet, default enabled is FALSE so GDrive features are hidden until configured
  const envEnabled = String(process.env.GDRIVE_ENABLED ?? '').trim().toLowerCase() === 'true';
  return {
    enabled: envEnabled,
    authType: 'oauth',
    clientId: String(process.env.GDRIVE_OAUTH_CLIENT_ID || '').trim(),
    clientSecret: String(process.env.GDRIVE_OAUTH_CLIENT_SECRET || '').trim(),
    refreshToken: String(process.env.GDRIVE_OAUTH_REFRESH_TOKEN || '').trim(),
    folderId: String(process.env.GDRIVE_FOLDER_ID || '').trim(),
    serviceAccountEmail: String(process.env.GDRIVE_SERVICE_ACCOUNT_EMAIL || '').trim(),
    privateKey: String(process.env.GDRIVE_PRIVATE_KEY || '').trim(),
    shareMode: (process.env.GDRIVE_SHARE_MODE || 'anyone') as ShareMode,
    shareDomain: String(process.env.GDRIVE_SHARE_DOMAIN || '').trim()
  };
}

async function getGoogleAccessToken(explicitConfig?: GDriveResolvedConfig) {
  const cfg = explicitConfig || (await getGDriveConfig());
  if (!cfg.enabled && !explicitConfig) {
    throw new Error('Integrasi Google Drive dinonaktifkan di pengaturan sistem.');
  }

  if (cfg.authType === 'service_account') {
    return getGoogleAccessTokenFromServiceAccount(cfg);
  }

  const hasOAuth = Boolean(cfg.clientId && cfg.clientSecret && cfg.refreshToken);
  if (hasOAuth) {
    return getGoogleAccessTokenFromOAuth(cfg);
  }

  if (cfg.serviceAccountEmail && cfg.privateKey) {
    return getGoogleAccessTokenFromServiceAccount(cfg);
  }

  throw new Error('Kredensial Google Drive belum lengkap (Client ID/Secret/Refresh Token atau Service Account).');
}

async function getGoogleAccessTokenFromOAuth(cfg: GDriveResolvedConfig) {
  if (!cfg.clientId || !cfg.clientSecret || !cfg.refreshToken) {
    throw new Error('GDRIVE_OAUTH_CLIENT_ID, GDRIVE_OAUTH_CLIENT_SECRET, dan GDRIVE_OAUTH_REFRESH_TOKEN wajib diisi.');
  }
  const body = new URLSearchParams();
  body.set('client_id', cfg.clientId);
  body.set('client_secret', cfg.clientSecret);
  body.set('refresh_token', cfg.refreshToken);
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

async function getGoogleAccessTokenFromServiceAccount(cfg: GDriveResolvedConfig) {
  if (!cfg.serviceAccountEmail || !cfg.privateKey) {
    throw new Error('GDRIVE_SERVICE_ACCOUNT_EMAIL dan GDRIVE_PRIVATE_KEY wajib diisi.');
  }
  const email = cfg.serviceAccountEmail;
  const privateKey = cfg.privateKey.replace(/\\n/g, '\n');
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

async function ensureFilePermission(fileId: string, accessToken: string, mode: ShareMode, domain?: string) {
  if (mode === 'private') return;

  const payload: Record<string, string> =
    mode === 'domain'
      ? { type: 'domain', role: 'reader', domain: domain || 'kpu.go.id' }
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
    name?: string;
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
    throw new Error('Service account/OAuth cannot upload into GDRIVE_FOLDER_ID (no write permission)');
  }
  return json;
}

export async function testGoogleDriveConnection(explicitConfig?: GDriveResolvedConfig) {
  const cfg = explicitConfig || (await getGDriveConfig());
  const token = await getGoogleAccessToken(cfg);
  if (!cfg.folderId) {
    return { ok: true, source: token.source, folderName: null, message: 'Autentikasi token berhasil (Folder ID belum diisi)' };
  }
  const folder = await ensureTargetFolderAccessible(cfg.folderId, token.accessToken, token.source);
  return { ok: true, source: token.source, folderId: cfg.folderId, folderName: folder.name || null, message: 'Koneksi & akses folder Google Drive berhasil!' };
}

export async function uploadArchiveFileToGoogleDrive(args: {
  relativePath: string;
  originalName: string;
  mimeType: string;
}) {
  const cfg = await getGDriveConfig();
  if (!cfg.enabled) {
    throw new Error('Integrasi Google Drive dinonaktifkan di pengaturan sistem.');
  }
  const folderId = cfg.folderId;
  if (!folderId) {
    throw new Error('Folder ID Google Drive belum dikonfigurasi di pengaturan.');
  }
  const token = await getGoogleAccessToken(cfg);
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

  await ensureFilePermission(json.id, accessToken, cfg.shareMode, cfg.shareDomain);

  const webViewLink = String(json.webViewLink ?? `https://drive.google.com/file/d/${json.id}/view`).trim();
  const result: GDriveUploadResult = { fileId: json.id, webViewLink };
  return result;
}

export async function deleteGoogleDriveFile(fileId: string) {
  const id = String(fileId ?? '').trim();
  if (!id) return;

  const cfg = await getGDriveConfig();
  const token = await getGoogleAccessToken(cfg);
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
