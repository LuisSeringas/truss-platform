import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import {
  createRationale,
  getFileById,
  getLatestRationalesByFile,
  getProjectById,
  touchProject,
} from '@/lib/db/repository';

type Params = { params: Promise<{ id: string; fileId: string }> };

async function resolveFile(projectId: string, fileId: string, userId: string) {
  const project = await getProjectById(db, projectId);
  if (!project || project.ownerId !== userId) return null;

  const file = await getFileById(db, fileId);
  if (!file || file.projectId !== projectId) return null;

  return { project, file };
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, fileId } = await params;
  const resolved = await resolveFile(id, fileId, session.user.id);
  if (!resolved) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const entries = await getLatestRationalesByFile(db, fileId);
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, fileId } = await params;
  const resolved = await resolveFile(id, fileId, session.user.id);
  if (!resolved) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const { body: rationaleBody } = body as { body: string };

  if (!rationaleBody || typeof rationaleBody !== 'string' || !rationaleBody.trim()) {
    return NextResponse.json({ error: 'body is required' }, { status: 400 });
  }

  const entryId = randomUUID();
  const [entry] = await createRationale(db, {
    entryId,
    fileId,
    projectId: null,
    body: rationaleBody.trim(),
    version: 1,
    createdBy: session.user.id,
  });

  await touchProject(db, id);

  return NextResponse.json(entry, { status: 201 });
}
