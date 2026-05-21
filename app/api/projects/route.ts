import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { createProject } from '@/lib/db/repository';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name, description } = await req.json();
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const [project] = await createProject(db, {
    name: name as string,
    description: description ? (description as string) : null,
    ownerId: session.user.id,
  });

  return NextResponse.json(project, { status: 201 });
}
