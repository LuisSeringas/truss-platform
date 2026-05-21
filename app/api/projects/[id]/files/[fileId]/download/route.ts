import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { getFileById, getProjectById } from '@/lib/db/repository';
import { signedDownloadUrl } from '@/lib/storage';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, fileId } = await params;

  const project = await getProjectById(db, id);
  if (!project || project.ownerId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const file = await getFileById(db, fileId);
  if (!file || file.projectId !== id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const url = await signedDownloadUrl(file.storagePath);
  return NextResponse.redirect(url);
}
