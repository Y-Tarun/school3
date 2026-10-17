import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { basename, join } from 'node:path';
import sharp from 'sharp';
import { HttpError } from './errors.js';

const photoTypes = new Map([
  ['image/jpeg', { extension: 'jpg', signature: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff }],
  ['image/png', { extension: 'png', signature: (buffer) => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) }],
  ['image/webp', { extension: 'webp', signature: (buffer) => buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP' }],
]);
const locatorPattern = /^local:([0-9a-f-]{36})\.(jpg|png|webp)$/;

export function createLocalPhotoStorage({ directory }) {
  return {
    async store(buffer, declaredType) {
      const type = photoTypes.get(declaredType);
      if (!type || !type.signature(buffer)) {
        throw new HttpError(415, 'INVALID_PHOTO_CONTENT', 'The uploaded file is not a valid JPEG, PNG, or WebP image.');
      }

      let sanitizedImage;
      try {
        sanitizedImage = await sharp(buffer, {
          failOn: 'error',
          limitInputPixels: 25_000_000,
        })
          .rotate()
          .webp({ quality: 85, effort: 4 })
          .toBuffer();
      } catch {
        throw new HttpError(415, 'INVALID_PHOTO_CONTENT', 'The uploaded file is not a valid JPEG, PNG, or WebP image.');
      }

      const photoId = randomUUID();
      const locator = `local:${photoId}.webp`;
      const path = join(directory, basename(`${photoId}.webp`));
      await mkdir(directory, { recursive: true, mode: 0o700 });
      await writeFile(path, sanitizedImage, { flag: 'wx', mode: 0o600 });
      return { locator, photoId };
    },

    async read(locator) {
      const match = locatorPattern.exec(locator ?? '');
      if (!match) throw new HttpError(404, 'PHOTO_NOT_FOUND', 'The requested photo was not found.');

      try {
        const buffer = await readFile(join(directory, basename(`${match[1]}.${match[2]}`)));
        const contentType = [...photoTypes.entries()].find(([, type]) => type.extension === match[2])?.[0];
        if (!contentType) throw new Error('Stored photo extension is unsupported.');
        return { buffer, contentType };
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw new HttpError(404, 'PHOTO_NOT_FOUND', 'The requested photo was not found.');
        }
        throw error;
      }
    },

    async remove(locator) {
      const match = locatorPattern.exec(locator ?? '');
      if (!match) return;
      await rm(join(directory, basename(`${match[1]}.${match[2]}`)), { force: true });
    },

    photoIdFromLocator(locator) {
      return locatorPattern.exec(locator ?? '')?.[1] ?? null;
    },
  };
}

export function createPhotoStorage(options) {
  return createLocalPhotoStorage(options);
}
