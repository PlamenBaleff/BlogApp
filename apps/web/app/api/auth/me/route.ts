import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@bloghub/api';
import { db, users } from '@bloghub/db';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if ('error' in auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, auth.payload.sub),
    columns: {
      id: true,
      email: true,
      name: true,
      bio: true,
      avatar: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: user });
}
