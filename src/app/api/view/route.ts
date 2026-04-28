import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getFileStream, getAbsolutePath } from '@/lib/storage';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    // Optional: add auth check if files are private
    // For feedback photos, we might want them to be accessible by admin
    const me = await requireAuth();
    
    const { searchParams } = new URL(req.url);
    const relativePath = searchParams.get('path');

    if (!relativePath) {
      return NextResponse.json({ error: 'Missing path' }, { status: 400 });
    }

    const absPath = getAbsolutePath(relativePath);
    
    try {
      const stats = await fs.stat(absPath);
      const stream = getFileStream(relativePath);
      
      const ext = path.extname(absPath).toLowerCase();
      let contentType = 'application/octet-stream';
      if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.gif') contentType = 'image/gif';
      else if (ext === '.pdf') contentType = 'application/pdf';

      return new NextResponse(stream as any, {
        headers: {
          'Content-Type': contentType,
          'Content-Length': stats.size.toString(),
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      });
    } catch (err) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}
