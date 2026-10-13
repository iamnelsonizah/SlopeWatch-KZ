import { NextResponse } from 'next/server';
import type { Report, ReportCategory } from '@/lib/types';
import { insideKazakhstan, locked, newId, rateLimited, readAll, saveUpload, writeAll } from '@/lib/server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CATEGORIES: ReportCategory[] = ['landslide', 'mudflow', 'rockfall', 'cracks', 'drainage', 'other'];
const MAX_PHOTO = 3 * 1024 * 1024;

function imageExt(b: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length > 12 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (b.length > 12 && b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}

export async function GET() {
  const list = (await readAll()).filter((r) => r.status === 'published');
  return NextResponse.json({ reports: list }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  const ip = (req.headers.get('x-forwarded-for') ?? 'local').split(',')[0].trim();
  if (rateLimited(ip)) return NextResponse.json({ error: 'Too many reports from this connection. Try again later.' }, { status: 429 });

  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 }); }
  if (String(form.get('website') ?? '') !== '') return NextResponse.json({ ok: true }, { status: 201 }); // honeypot: pretend success

  const category = String(form.get('category') ?? '') as ReportCategory;
  const description = String(form.get('description') ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim();
  const lat = Number(form.get('lat')), lon = Number(form.get('lon'));
  if (!CATEGORIES.includes(category)) return NextResponse.json({ error: 'Choose a category.' }, { status: 400 });
  if (description.length < 10 || description.length > 600) return NextResponse.json({ error: 'Describe what you saw in 10 to 600 characters.' }, { status: 400 });
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return NextResponse.json({ error: 'Pick a location on the map.' }, { status: 400 });
  if (!(await insideKazakhstan(lon, lat))) return NextResponse.json({ error: 'The location must be in or near Kazakhstan.' }, { status: 400 });

  let photo: string | undefined;
  const file = form.get('photo');
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_PHOTO) return NextResponse.json({ error: 'Photo is larger than 3 MB.' }, { status: 400 });
    const buf = Buffer.from(await file.arrayBuffer());
    const ext = imageExt(buf);
    if (!ext) return NextResponse.json({ error: 'Photo must be a JPEG, PNG or WebP image.' }, { status: 400 });
    photo = await saveUpload(buf, ext);
  }

  const report: Report = {
    id: newId(), category, description, lat: +lat.toFixed(5), lon: +lon.toFixed(5), createdAt: new Date().toISOString(),
    photo, verification: 'C', status: 'published',
  };
  await locked(async () => writeAll([report, ...(await readAll())]));
  return NextResponse.json({ report }, { status: 201 });
}
