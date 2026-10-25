import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const UPLOAD_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'uploads');
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
export const IMAGE_URL = /^\/uploads\/[a-f0-9]{32}\.(jpg|png|webp)$/;

// Never trust the filename or the Content-Type the client sent: look at the first bytes of the file.
export function sniffImage(buf) {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 12 && buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return null;
}

// Saves under a random name with an extension WE chose, so an upload can never become a script or overwrite a file.
export async function saveImage(buf) {
  const ext = sniffImage(buf);
  if (!ext) return null;
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR, name), buf, { flag: 'wx' });
  return `/uploads/${name}`;
}
