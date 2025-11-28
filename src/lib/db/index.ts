import Dexie, { type Table } from 'dexie';
import type { SourceCapture, ResearchSession, SourceGroup } from '../../types/source';
import type { ExtensionSettings } from '../../types/settings';

export interface SettingsRecord {
  key: string;
  value: ExtensionSettings;
}

export class ArtefaktDatabase extends Dexie {
  sources!: Table<SourceCapture>;
  sessions!: Table<ResearchSession>;
  groups!: Table<SourceGroup>;
  settings!: Table<SettingsRecord>;

  constructor() {
    super('ArtefaktDB');

    // Version 1: Original schema
    this.version(1).stores({
      sources: '++id, createdAt, sourceType, platform, provenance.sessionId',
      sessions: '++id, createdAt, userId, isActive'
    });

    // Version 2: Add groups table and group-related fields to sources
    this.version(2).stores({
      // *groupIds creates a multi-entry index for efficient filtering by group
      sources: '++id, createdAt, sourceType, platform, provenance.sessionId, *groupIds, isDeleted',
      sessions: '++id, createdAt, userId, isActive',
      groups: '++id, name, createdAt'
    }).upgrade(tx => {
      // Migrate existing sources: initialize new fields
      return tx.table('sources').toCollection().modify(source => {
        if (source.groupIds === undefined) {
          source.groupIds = [];
        }
        if (source.isDeleted === undefined) {
          source.isDeleted = false;
        }
      });
    });

    // Version 3: Add settings table
    this.version(3).stores({
      sources: '++id, createdAt, sourceType, platform, provenance.sessionId, *groupIds, isDeleted',
      sessions: '++id, createdAt, userId, isActive',
      groups: '++id, name, createdAt',
      settings: 'key'
    });
  }
}

export const db = new ArtefaktDatabase();
