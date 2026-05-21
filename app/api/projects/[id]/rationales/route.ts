import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { createRationale, getLatestRationalesByProject, getProjectById } from '@/lib/db/repository';

async function resolveProject(projectId: string, userId: string) {
  const project = await getProjectById(db, projectId);
  if (!project || project.ownerId !== userId) return null;
  return project;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const project = await resolveProject(id, session.user.id);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const entries = await getLatestRationalesByProject(db, id);
  return NextResponse.json(entries);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const project = await resolveProject(id, session.user.id);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const { body: rationaleBody } = body as { body: string };

  if (!rationaleBody || typeof rationaleBody !== 'string' || !rationaleBody.trim()) {
    return NextResponse.json({ error: 'body is required' }, { status: 400 });
  }

  const entryId = randomUUID();
  const [entry] = await createRationale(db, {
    entryId,
    projectId: id,
    fileId: null,
    body: rationaleBody.trim(),
    version: 1,
    createdBy: session.user.id,
  });

  return NextResponse.json(entry, { status: 201 });
}
