import Dexie, { type Table } from 'dexie';
import type { SourceCapture, ResearchSession } from '../../types/source';

export class ArtefaktDatabase extends Dexie {
  sources!: Table<SourceCapture>;
  sessions!: Table<ResearchSession>;

  constructor() {
    super('ArtefaktDB');

    this.version(1).stores({
      // Note: Dexie indexes don't support nested paths, so we index top-level fields
      // sessionId is accessed via provenance.sessionId in the data model
      sources: '++id, createdAt, sourceType, platform, provenance.sessionId',
      sessions: '++id, createdAt, userId, isActive'
    });
  }
}

export const db = new ArtefaktDatabase();
