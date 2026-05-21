import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import {
  getLatestRationaleByEntryId,
  getProjectById,
  getRationaleHistory,
} from '@/lib/db/repository';

type Params = { params: Promise<{ id: string; entryId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, entryId } = await params;
  const project = await getProjectById(db, id);
  if (!project || project.ownerId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const latest = await getLatestRationaleByEntryId(db, entryId);
  if (!latest || latest.projectId !== id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const history = await getRationaleHistory(db, entryId);
  return NextResponse.json(history);
}
