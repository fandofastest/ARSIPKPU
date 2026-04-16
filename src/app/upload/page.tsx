'use client';

import { useMemo, useRef, useState } from 'react';
import { AppShell } from '@/components/AppShell';

export default function UploadPage() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [progress, setProgress] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canUpload = useMemo(() => !!file && !loading, [file, loading]);

  function onPickFile(f: File | null) {
    setFile(f);
    setProgress(0);
    setMessage(null);
    setError(null);
  }

  async function upload() {
    if (!file) return;
    setLoading(true);
    setMessage(null);
    setError(null);

    const form = new FormData();
    form.append('file', file);
    form.append('type', type);
    form.append('description', description);
    form.append('tags', tags);

    await new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload');
      xhr.withCredentials = true;

      xhr.upload.onprogress = (evt) => {
        if (!evt.lengthComputable) return;
        setProgress(Math.round((evt.loaded / evt.total) * 100));
      };

      xhr.onload = () => {
        try {
          const json = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            setMessage('Upload successful');
            setFile(null);
            setType('');
            setDescription('');
            setTags('');
            setProgress(100);
          } else {
            setError(json?.error || 'Upload failed');
          }
        } catch {
          setError('Upload failed');
        } finally {
          setLoading(false);
          resolve();
        }
      };

      xhr.onerror = () => {
        setError('Network error');
        setLoading(false);
        resolve();
      };

      xhr.send(form);
    });
  }

  return (
    <AppShell>
      <div className="container" style={{ maxWidth: 720 }}>
        <h1>Upload</h1>

        <div
          className="card"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0] ?? null;
            onPickFile(f);
          }}
          style={{ borderStyle: 'dashed' }}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700 }}>Drag & drop a file here</div>
              <div style={{ color: '#9ca3af', fontSize: 14 }}>Or pick a file using the button</div>
            </div>
            <button className="btn btnSecondary" type="button" onClick={() => fileRef.current?.click()}>
              Choose File
            </button>
          </div>

          <input
            ref={fileRef}
            type="file"
            style={{ display: 'none' }}
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
          />

          <div style={{ height: 16 }} />

          <div>
            <div style={{ color: '#9ca3af', fontSize: 14 }}>Selected</div>
            <div>{file ? `${file.name} (${Math.round(file.size / 1024)} KB)` : 'None'}</div>
          </div>

          <div style={{ height: 16 }} />

          <label>
            Type
            <input className="input" value={type} onChange={(e) => setType(e.target.value)} placeholder="e.g. surat_masuk" />
          </label>

          <div style={{ height: 16 }} />

          <label>
            Description
            <textarea
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </label>

          <div style={{ height: 16 }} />

          <label>
            Tags (comma separated)
            <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. penting, 2026, kecamatan" />
          </label>

          <div style={{ height: 16 }} />

          <button className="btn" disabled={!canUpload} onClick={upload}>
            {loading ? 'Uploading…' : 'Upload'}
          </button>

          <div style={{ height: 12 }} />

          {loading ? <div style={{ color: '#9ca3af' }}>Progress: {progress}%</div> : null}
          {message ? <div style={{ color: '#86efac' }}>{message}</div> : null}
          {error ? <div style={{ color: '#fca5a5' }}>{error}</div> : null}
        </div>
      </div>
    </AppShell>
  );
}
