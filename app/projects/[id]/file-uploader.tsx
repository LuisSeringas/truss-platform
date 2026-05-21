'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const MAX_FILE_BYTES = 100 * 1024 * 1024;

export default function FileUploader({ projectId }: { projectId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function upload(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      setError('File exceeds 100 MB limit');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const initRes = await fetch(`/api/projects/${projectId}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, mimeType: file.type || null, sizeBytes: file.size }),
      });

      if (!initRes.ok) {
        const data = await initRes.json();
        throw new Error(data.error ?? 'Failed to initiate upload');
      }

      const { uploadUrl } = await initRes.json();

      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      });

      if (!putRes.ok) throw new Error('Upload to storage failed');

      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {uploading ? 'Uploading…' : 'Upload file'}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
