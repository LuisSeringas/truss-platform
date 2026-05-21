import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import {
  addRationaleRevision,
  deleteRationaleEntry,
  getFileById,
  getLatestRationaleByEntryId,
  getProjectById,
} from '@/lib/db/repository';

type Params = { params: Promise<{ id: string; fileId: string; entryId: string }> };

async function resolveEntry(projectId: string, fileId: string, entryId: string, userId: string) {
  const project = await getProjectById(db, projectId);
  if (!project || project.ownerId !== userId) return null;

  const file = await getFileById(db, fileId);
  if (!file || file.projectId !== projectId) return null;

  const latest = await getLatestRationaleByEntryId(db, entryId);
  if (!latest || latest.fileId !== fileId) return null;

  return { project, file, latest };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, fileId, entryId } = await params;
  const resolved = await resolveEntry(id, fileId, entryId, session.user.id);
  if (!resolved) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const { body: rationaleBody } = body as { body: string };

  if (!rationaleBody || typeof rationaleBody !== 'string' || !rationaleBody.trim()) {
    return NextResponse.json({ error: 'body is required' }, { status: 400 });
  }

  const revision = await addRationaleRevision(db, entryId, rationaleBody.trim(), session.user.id);
  return NextResponse.json(revision);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, fileId, entryId } = await params;
  const resolved = await resolveEntry(id, fileId, entryId, session.user.id);
  if (!resolved) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await deleteRationaleEntry(db, entryId);
  return new NextResponse(null, { status: 204 });
}
