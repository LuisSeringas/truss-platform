import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { createUser, getUserByEmail } from '@/lib/db/repository';

export async function POST(req: NextRequest) {
  const { email, password, name } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const existing = await getUserByEmail(db, email as string);
  if (existing) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password as string, 12);
  const [user] = await createUser(db, {
    email: email as string,
    name: name ? (name as string) : null,
    passwordHash,
  });

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
}
