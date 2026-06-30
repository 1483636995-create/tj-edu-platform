import type { Readable } from 'node:stream';

export interface StoredFile {
  storageKey: string;
  size: number;
}

export abstract class FileStorage {
  abstract save(institutionId: string, originalName: string, contents: Buffer): Promise<StoredFile>;

  abstract open(storageKey: string): Promise<Readable>;

  abstract delete(storageKey: string): Promise<void>;
}
