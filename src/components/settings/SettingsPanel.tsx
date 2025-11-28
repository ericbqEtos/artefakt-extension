import React, { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { useToast } from '../ui/Toast';
import { SettingsSection } from './SettingsSection';
import { SettingsRow } from './SettingsRow';
import { KeybindInput, openBrowserShortcutSettings } from './KeybindInput';
import { InstitutionalConnect } from './InstitutionalConnect';
import { getSettings, updateSettings, resetSettings } from '../../lib/db/settings';
import {
  ExtensionSettings,
  SUPPORTED_LANGUAGES,
  CITATION_STYLES,
  CitationStyle,
  SupportedLanguage,
} from '../../types/settings';

export function SettingsPanel() {
  const { addToast } = useToast();
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const loaded = await getSettings();
      setSettings(loaded);
    } catch (error) {
      console.error('Failed to load settings:', error);
      addToast('error', 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLanguageChange = async (languageId: string) => {
    if (!settings) return;
    setIsSaving(true);
    try {
      const updated = await updateSettings({ language: languageId as SupportedLanguage });
      setSettings(updated);
      if (languageId !== 'en') {
        addToast('info', 'Language support coming soon. Interface will remain in English for now.');
      } else {
        addToast('success', 'Language preference saved');
      }
    } catch (error) {
      console.error('Failed to save language:', error);
      addToast('error', 'Failed to save language preference');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCitationStyleChange = async (styleId: string) => {
    if (!settings) return;
    setIsSaving(true);
    try {
      const updated = await updateSettings({ defaultCitationStyle: styleId as CitationStyle });
      setSettings(updated);
      addToast('success', 'Default citation style saved');
    } catch (error) {
      console.error('Failed to save citation style:', error);
      addToast('error', 'Failed to save citation style');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmailChange = async (email: string) => {
    if (!settings) return;
    try {
      const updated = await updateSettings({ institutionalEmail: email });
      setSettings(updated);
    } catch (error) {
      console.error('Failed to save email:', error);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all settings to defaults?')) return;
    setIsSaving(true);
    try {
      const defaults = await resetSettings();
      setSettings(defaults);
      addToast('success', 'Settings reset to defaults');
    } catch (error) {
      console.error('Failed to reset settings:', error);
      addToast('error', 'Failed to reset settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-neutral-600">Loading settings...</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-red-600">Failed to load settings</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-xl">
        {/* Language */}
        <SettingsSection
          title="Language"
          description="Choose your preferred language for the extension interface."
        >
          <SettingsRow
            label="Display Language"
            htmlFor="language-select"
            helpText={settings.language !== 'en' ? 'Translation coming soon' : undefined}
          >
            <Select
              id="language-select"
              label=""
              options={SUPPORTED_LANGUAGES}
              value={settings.language}
              onChange={handleLanguageChange}
              disabled={isSaving}
            />
          </SettingsRow>
        </SettingsSection>

        {/* Keyboard Shortcuts */}
        <SettingsSection
          title="Keyboard Shortcuts"
          description="Quickly capture sources without using the mouse."
        >
          <SettingsRow
            label="Capture Source"
            helpText="Press this shortcut to save the current page as a source"
          >
            <KeybindInput
              value={settings.captureShortcut}
              onOpenBrowserSettings={openBrowserShortcutSettings}
            />
          </SettingsRow>
          <p className="text-xs text-neutral-500 mt-2">
            Keyboard shortcuts are managed by your browser for security. Click "Change" to open your browser's extension shortcuts settings.
          </p>
        </SettingsSection>

        {/* Citation Preferences */}
        <SettingsSection
          title="Citation Preferences"
          description="Set your default citation format for generating references."
        >
          <SettingsRow
            label="Default Citation Style"
            htmlFor="citation-style-select"
            helpText="This style will be pre-selected when generating citations"
          >
            <Select
              id="citation-style-select"
              label=""
              options={CITATION_STYLES}
              value={settings.defaultCitationStyle}
              onChange={handleCitationStyleChange}
              disabled={isSaving}
            />
          </SettingsRow>
        </SettingsSection>

        {/* Institutional Account */}
        <SettingsSection
          title="Institutional Account"
          description="Connect your academic institution for enhanced features."
        >
          <InstitutionalConnect
            email={settings.institutionalEmail}
            isConnected={settings.isConnected}
            onEmailChange={handleEmailChange}
          />
        </SettingsSection>

        {/* Advanced */}
        <SettingsSection
          title="Advanced"
          description="Additional browser and extension settings."
        >
          <div className="flex flex-col gap-3">
            <button
              onClick={() => browser.runtime.openOptionsPage()}
              className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors text-left"
            >
              <svg className="w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open Extension Settings in Browser
            </button>
          </div>
        </SettingsSection>

        {/* Actions */}
        <div className="mt-8 pt-6 border-t border-neutral-200 flex justify-end">
          <Button
            variant="ghost"
            onClick={handleReset}
            disabled={isSaving}
          >
            Reset to Defaults
          </Button>
        </div>

        {/* Footer */}
        <footer className="mt-8 pt-6 border-t border-neutral-200 text-center text-xs text-neutral-500">
          <p>Artefakt v0.1.0</p>
          <p className="mt-1">
            Helping students and educators document their research journey
          </p>
        </footer>
      </div>
    </div>
  );
}
