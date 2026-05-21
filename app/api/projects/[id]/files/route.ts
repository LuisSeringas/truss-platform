import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { createFile, getFilesByProject, getProjectById } from '@/lib/db/repository';
import { MAX_FILE_BYTES, signedUploadUrl, storagePath } from '@/lib/storage';

async function resolveProject(projectId: string, userId: string) {
  const project = await getProjectById(db, projectId);
  if (!project || project.ownerId !== userId) return null;
  return project;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const project = await resolveProject(id, session.user.id);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const files = await getFilesByProject(db, id);
  return NextResponse.json(files);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const project = await resolveProject(id, session.user.id);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const { name, mimeType, sizeBytes } = body as {
    name: string;
    mimeType?: string;
    sizeBytes?: number;
  };

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  if (typeof sizeBytes === 'number' && sizeBytes > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'File exceeds 100 MB limit' }, { status: 413 });
  }

  const fileId = randomUUID();
  const path = storagePath(id, fileId, name);
  const uploadUrl = await signedUploadUrl(path);

  const [file] = await createFile(db, {
    id: fileId,
    projectId: id,
    name,
    mimeType: mimeType ?? null,
    storagePath: path,
    sizeBytes: sizeBytes ?? null,
  });

  return NextResponse.json({ file, uploadUrl }, { status: 201 });
}
