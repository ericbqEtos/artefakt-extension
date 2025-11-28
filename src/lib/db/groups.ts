import { db } from './index';
import type { SourceGroup } from '../../types/source';

// Default colors for groups (accessible, distinguishable palette)
export const GROUP_COLORS: string[] = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#f97316', // Orange
  '#6366f1', // Indigo
];

/**
 * Generate a UUID for new groups
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Get a random color from the palette
 */
function getRandomColor(): string {
  return GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)];
}

// ============================================
// Group CRUD Operations
// ============================================

/**
 * Create a new source group
 */
export async function createGroup(
  name: string,
  description?: string,
  color?: string
): Promise<SourceGroup> {
  const group: SourceGroup = {
    id: generateId(),
    name: name.trim(),
    description: description?.trim(),
    color: color || getRandomColor(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.groups.add(group);
  return group;
}

/**
 * Get all groups ordered by creation date
 */
export async function getAllGroups(): Promise<SourceGroup[]> {
  return db.groups.orderBy('createdAt').toArray();
}

/**
 * Get a single group by ID
 */
export async function getGroupById(id: string): Promise<SourceGroup | undefined> {
  return db.groups.get(id);
}

/**
 * Update a group's properties
 */
export async function updateGroup(
  id: string,
  updates: Partial<Pick<SourceGroup, 'name' | 'description' | 'color'>>
): Promise<void> {
  await db.groups.update(id, {
    ...updates,
    name: updates.name?.trim(),
    description: updates.description?.trim(),
    updatedAt: new Date(),
  });
}

/**
 * Delete a group and remove its ID from all sources
 */
export async function deleteGroup(id: string): Promise<void> {
  await db.transaction('rw', [db.groups, db.sources], async () => {
    // Remove group ID from all sources that have it
    await db.sources
      .where('groupIds')
      .equals(id)
      .modify(source => {
        source.groupIds = (source.groupIds || []).filter(gid => gid !== id);
        source.updatedAt = new Date();
      });

    // Delete the group
    await db.groups.delete(id);
  });
}

/**
 * Get source count for a group
 */
export async function getGroupSourceCount(groupId: string): Promise<number> {
  return db.sources
    .where('groupIds')
    .equals(groupId)
    .and(s => !s.isDeleted)
    .count();
}

/**
 * Get all groups with their source counts
 */
export async function getGroupsWithCounts(): Promise<Array<SourceGroup & { sourceCount: number }>> {
  const groups = await getAllGroups();
  const counts = await Promise.all(
    groups.map(async group => ({
      ...group,
      sourceCount: await getGroupSourceCount(group.id!),
    }))
  );
  return counts;
}

// ============================================
// Source-Group Association Operations
// ============================================

/**
 * Add a source to a group
 */
export async function addSourceToGroup(sourceId: string, groupId: string): Promise<void> {
  await db.sources.where('id').equals(sourceId).modify(source => {
    const currentGroups = source.groupIds || [];
    if (!currentGroups.includes(groupId)) {
      source.groupIds = [...currentGroups, groupId];
      source.updatedAt = new Date();
    }
  });
}

/**
 * Add multiple sources to a group (bulk operation)
 */
export async function addSourcesToGroup(sourceIds: string[], groupId: string): Promise<void> {
  await db.transaction('rw', db.sources, async () => {
    for (const sourceId of sourceIds) {
      await addSourceToGroup(sourceId, groupId);
    }
  });
}

/**
 * Remove a source from a specific group
 */
export async function removeSourceFromGroup(sourceId: string, groupId: string): Promise<void> {
  await db.sources.where('id').equals(sourceId).modify(source => {
    source.groupIds = (source.groupIds || []).filter(gid => gid !== groupId);
    source.updatedAt = new Date();
  });
}

/**
 * Remove a source from all groups
 */
export async function removeSourceFromAllGroups(sourceId: string): Promise<void> {
  await db.sources.where('id').equals(sourceId).modify(source => {
    source.groupIds = [];
    source.updatedAt = new Date();
  });
}

/**
 * Get all sources in a group (excluding deleted sources)
 */
export async function getSourcesByGroup(groupId: string): Promise<string[]> {
  const sources = await db.sources
    .where('groupIds')
    .equals(groupId)
    .and(s => !s.isDeleted)
    .toArray();
  return sources.map(s => s.id!);
}

/**
 * Get all groups that a source belongs to
 */
export async function getGroupsForSource(sourceId: string): Promise<SourceGroup[]> {
  const source = await db.sources.get(sourceId);
  if (!source || !source.groupIds || source.groupIds.length === 0) {
    return [];
  }

  const groups = await db.groups.where('id').anyOf(source.groupIds).toArray();
  return groups;
}

/**
 * Set the groups for a source (replaces all existing group assignments)
 */
export async function setSourceGroups(sourceId: string, groupIds: string[]): Promise<void> {
  await db.sources.where('id').equals(sourceId).modify(source => {
    source.groupIds = groupIds;
    source.updatedAt = new Date();
  });
}
