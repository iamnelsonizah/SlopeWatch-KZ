import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { UPLOADS } from '@/lib/server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const TYPES: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

export async function GET(_: Request, { params }: { params: { name: string } }) {
  const m = params.name.match(/^[a-f0-9-]{36}\.(jpg|png|webp)$/);
  if (!m) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  try {
    const buf = await fs.readFile(path.join(UPLOADS, params.name));
    return new NextResponse(new Uint8Array(buf), { headers: { 'Content-Type': TYPES[m[1]], 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'public, max-age=31536000, immutable', 'Content-Security-Policy': "default-src 'none'" } });
  } catch {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }
}
