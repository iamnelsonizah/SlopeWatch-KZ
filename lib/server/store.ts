import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID, timingSafeEqual } from 'crypto';
import type { Report } from '../types';

/**
 * File-based store: fine for one server (local, VPS, Docker with a volume).
 * On serverless hosts (Vercel) the disk is not persistent, so swap these functions for a database
 * (Supabase, Neon, Vercel KV) and object storage for photos. The API routes only use this file.
 */
const DIR = path.join(process.cwd(), 'data');
const FILE = path.join(DIR, 'reports.json');
export const UPLOADS = path.join(DIR, 'uploads');

let chain: Promise<unknown> = Promise.resolve();
export function locked<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => undefined);
  return run;
}

export async function readAll(): Promise<Report[]> {
  try { return JSON.parse(await fs.readFile(FILE, 'utf8')) as Report[]; } catch { return []; }
}
export async function writeAll(list: Report[]) {
  await fs.mkdir(DIR, { recursive: true });
  const tmp = FILE + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(list, null, 1));
  await fs.rename(tmp, FILE);
}
export async function saveUpload(buf: Buffer, ext: string): Promise<string> {
  await fs.mkdir(UPLOADS, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  await fs.writeFile(path.join(UPLOADS, name), buf);
  return name;
}
export const newId = () => randomUUID();

export function isAdmin(req: Request): boolean {
  const token = process.env.ADMIN_TOKEN;
  const given = req.headers.get('x-admin-token') ?? '';
  if (!token || token.length < 16) return false;
  const a = Buffer.from(token), b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ---- tiny in-memory rate limit: 5 reports per hour per IP ----
const hits = new Map<string, number[]>();
export function rateLimited(ip: string, max = 5, windowMs = 3600_000): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) { hits.set(ip, arr); return true; }
  arr.push(now); hits.set(ip, arr);
  return false;
}

// ---- inside-Kazakhstan check ----
let border: GeoJSON.Geometry | null = null;
export async function insideKazakhstan(lon: number, lat: number): Promise<boolean> {
  if (!border) {
    const fc = JSON.parse(await fs.readFile(path.join(process.cwd(), 'public/data/kz-context.geojson'), 'utf8'));
    border = fc.features[0].geometry;
  }
  const { geomContains } = await import('../geo');
  return geomContains(border, lon, lat);
}
