import Dexie, { type Table } from 'dexie';
import type { SourceCapture, ResearchSession } from '@/types/source';

export class ArtefaktDatabase extends Dexie {
  sources!: Table<SourceCapture>;
  sessions!: Table<ResearchSession>;

  constructor() {
    super('ArtefaktDB');

    this.version(1).stores({
      sources: '++id, createdAt, sourceType, platform, sessionId, [sessionId+createdAt]',
      sessions: '++id, createdAt, userId, isActive'
    });
  }
}

export const db = new ArtefaktDatabase();
