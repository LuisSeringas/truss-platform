import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL) throw new Error('SUPABASE_URL is not set');
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export const BUCKET = 'project-files';
export const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 MB

export function storagePath(projectId: string, fileId: string, filename: string): string {
  const safe = filename.replace(/[/\\]/g, '_');
  return `${projectId}/${fileId}/${safe}`;
}

export async function signedUploadUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error) throw new Error(`Storage: ${error.message}`);
  return data.signedUrl;
}

export async function signedDownloadUrl(path: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error) throw new Error(`Storage: ${error.message}`);
  return data.signedUrl;
}
