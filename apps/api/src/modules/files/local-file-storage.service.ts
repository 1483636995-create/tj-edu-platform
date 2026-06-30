import { Injectable, NotFoundException } from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { FileStorage, type StoredFile } from './file-storage';

@Injectable()
export class LocalFileStorageService extends FileStorage {
  private readonly root = resolve(process.env.FILE_STORAGE_ROOT ?? 'uploads');

  async save(institutionId: string, originalName: string, contents: Buffer): Promise<StoredFile> {
    const extension = extname(originalName)
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, '')
      .slice(0, 12);
    const now = new Date();
    const storageKey = [
      institutionId,
      String(now.getUTCFullYear()),
      String(now.getUTCMonth() + 1).padStart(2, '0'),
      `${randomUUID()}${extension}`
    ].join('/');
    const target = this.resolveKey(storageKey);

    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, contents);

    return { storageKey, size: contents.byteLength };
  }

  async open(storageKey: string) {
    const target = this.resolveKey(storageKey);

    return new Promise<ReturnType<typeof createReadStream>>((resolveStream, reject) => {
      const stream = createReadStream(target);
      stream.once('open', () => resolveStream(stream));
      stream.once('error', () => reject(new NotFoundException('文件内容不存在。')));
    });
  }

  async delete(storageKey: string) {
    await rm(this.resolveKey(storageKey), { force: true });
  }

  private resolveKey(storageKey: string) {
    const target = resolve(this.root, storageKey);
    const rootPrefix = this.root.endsWith(sep) ? this.root : `${this.root}${sep}`;

    if (!target.startsWith(rootPrefix)) {
      throw new NotFoundException('文件路径无效。');
    }

    return target;
  }
}
