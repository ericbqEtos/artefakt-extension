/**
 * Settings database operations
 */

import { db } from './index';
import { ExtensionSettings, DEFAULT_SETTINGS } from '../../types/settings';

const SETTINGS_KEY = 'user_settings';

/**
 * Get current extension settings, returns defaults if not set
 */
export async function getSettings(): Promise<ExtensionSettings> {
  const stored = await db.settings.get(SETTINGS_KEY);
  if (!stored) {
    return { ...DEFAULT_SETTINGS };
  }
  // Merge with defaults to handle any new fields added in updates
  return { ...DEFAULT_SETTINGS, ...stored.value };
}

/**
 * Update extension settings with partial updates
 */
export async function updateSettings(
  updates: Partial<ExtensionSettings>
): Promise<ExtensionSettings> {
  const current = await getSettings();
  const updated: ExtensionSettings = {
    ...current,
    ...updates,
    updatedAt: new Date(),
  };

  await db.settings.put({
    key: SETTINGS_KEY,
    value: updated,
  });

  return updated;
}

/**
 * Reset all settings to defaults
 */
export async function resetSettings(): Promise<ExtensionSettings> {
  const defaults = { ...DEFAULT_SETTINGS, updatedAt: new Date() };
  await db.settings.put({
    key: SETTINGS_KEY,
    value: defaults,
  });
  return defaults;
}
