import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import {
  addRationaleRevision,
  deleteRationaleEntry,
  getLatestRationaleByEntryId,
  getProjectById,
} from '@/lib/db/repository';

type Params = { params: Promise<{ id: string; entryId: string }> };

async function resolveEntry(projectId: string, entryId: string, userId: string) {
  const project = await getProjectById(db, projectId);
  if (!project || project.ownerId !== userId) return null;

  const latest = await getLatestRationaleByEntryId(db, entryId);
  if (!latest) return null;

  // Verify the entry belongs to this project (directly or may be file-level; file FK cascades project).
  // For project-level entries projectId must match. File-level entries are not accessible via this route.
  if (latest.projectId !== projectId) return null;

  return { project, latest };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, entryId } = await params;
  const resolved = await resolveEntry(id, entryId, session.user.id);
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

  const { id, entryId } = await params;
  const resolved = await resolveEntry(id, entryId, session.user.id);
  if (!resolved) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await deleteRationaleEntry(db, entryId);
  return new NextResponse(null, { status: 204 });
}
