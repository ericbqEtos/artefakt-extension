import { db } from './index';
import type { SourceCapture } from '../../types/source';

// ============================================
// Soft Delete Operations
// ============================================

/**
 * Soft delete a source - marks it as deleted but keeps it in the database
 * for origin trail provenance tracking
 */
export async function softDeleteSource(sourceId: string): Promise<void> {
  await db.sources.where('id').equals(sourceId).modify(source => {
    source.isDeleted = true;
    source.deletedAt = new Date();
    source.updatedAt = new Date();
    // Clear group memberships when soft deleting
    source.groupIds = [];
  });
}

/**
 * Soft delete multiple sources
 */
export async function softDeleteSources(sourceIds: string[]): Promise<void> {
  await db.transaction('rw', db.sources, async () => {
    for (const sourceId of sourceIds) {
      await softDeleteSource(sourceId);
    }
  });
}

/**
 * Permanently delete a source from the database
 * Use with caution - this removes all trace of the source
 */
export async function permanentlyDeleteSource(sourceId: string): Promise<void> {
  await db.sources.delete(sourceId);
}

/**
 * Permanently delete multiple sources
 */
export async function permanentlyDeleteSources(sourceIds: string[]): Promise<void> {
  await db.sources.bulkDelete(sourceIds);
}

/**
 * Restore a soft-deleted source
 */
export async function restoreSource(sourceId: string): Promise<void> {
  await db.sources.where('id').equals(sourceId).modify(source => {
    source.isDeleted = false;
    source.deletedAt = undefined;
    source.updatedAt = new Date();
  });
}

/**
 * Restore multiple soft-deleted sources
 */
export async function restoreSources(sourceIds: string[]): Promise<void> {
  await db.transaction('rw', db.sources, async () => {
    for (const sourceId of sourceIds) {
      await restoreSource(sourceId);
    }
  });
}

// ============================================
// Query Operations
// ============================================

/**
 * Get all active (non-deleted) sources
 */
export async function getActiveSources(): Promise<SourceCapture[]> {
  return db.sources
    .orderBy('createdAt')
    .reverse()
    .filter(source => !source.isDeleted)
    .toArray();
}

/**
 * Get all soft-deleted sources
 */
export async function getDeletedSources(): Promise<SourceCapture[]> {
  return db.sources
    .orderBy('deletedAt')
    .reverse()
    .filter(source => source.isDeleted === true)
    .toArray();
}

/**
 * Get all sources (including deleted) - useful for origin trail
 */
export async function getAllSourcesIncludingDeleted(): Promise<SourceCapture[]> {
  return db.sources.orderBy('createdAt').reverse().toArray();
}

/**
 * Get sources by group (excluding deleted)
 */
export async function getSourcesByGroupId(groupId: string): Promise<SourceCapture[]> {
  return db.sources
    .where('groupIds')
    .equals(groupId)
    .and(source => !source.isDeleted)
    .reverse()
    .sortBy('createdAt');
}

/**
 * Get ungrouped sources (sources not in any group, excluding deleted)
 */
export async function getUngroupedSources(): Promise<SourceCapture[]> {
  return db.sources
    .filter(source => !source.isDeleted && (!source.groupIds || source.groupIds.length === 0))
    .reverse()
    .sortBy('createdAt');
}

/**
 * Count active sources
 */
export async function countActiveSources(): Promise<number> {
  return db.sources.filter(source => !source.isDeleted).count();
}

/**
 * Count deleted sources
 */
export async function countDeletedSources(): Promise<number> {
  return db.sources.filter(source => source.isDeleted === true).count();
}
