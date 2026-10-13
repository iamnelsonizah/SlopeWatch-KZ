import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { isAdmin, locked, readAll, UPLOADS, writeAll } from '@/lib/server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Moderation. Requires the x-admin-token header to match ADMIN_TOKEN (16+ characters). */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const out = await locked(async () => {
    const list = await readAll();
    const r = list.find((x) => x.id === params.id);
    if (!r) return null;
    if (['A', 'B', 'C'].includes(body.verification)) r.verification = body.verification;
    if (['published', 'hidden'].includes(body.status)) r.status = body.status;
    await writeAll(list);
    return r;
  });
  return out ? NextResponse.json({ report: out }) : NextResponse.json({ error: 'Not found.' }, { status: 404 });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
  const removed = await locked(async () => {
    const list = await readAll();
    const r = list.find((x) => x.id === params.id);
    if (!r) return null;
    await writeAll(list.filter((x) => x.id !== params.id));
    return r;
  });
  if (!removed) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  if (removed.photo && /^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(removed.photo)) await fs.rm(path.join(UPLOADS, removed.photo), { force: true });
  return NextResponse.json({ ok: true });
}
