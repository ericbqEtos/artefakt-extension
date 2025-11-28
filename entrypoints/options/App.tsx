import React, { useEffect, useState } from 'react';
import { Button } from '../../src/components/ui/Button';
import { Select } from '../../src/components/ui/Select';
import { useToast } from '../../src/components/ui/Toast';
import {
  SettingsSection,
  SettingsRow,
  KeybindInput,
  openBrowserShortcutSettings,
  InstitutionalConnect,
} from '../../src/components/settings';
import { getSettings, updateSettings, resetSettings } from '../../src/lib/db/settings';
import {
  ExtensionSettings,
  SUPPORTED_LANGUAGES,
  CITATION_STYLES,
  CitationStyle,
  SupportedLanguage,
} from '../../src/types/settings';

export default function App() {
  const { addToast } = useToast();
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings on mount
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
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-neutral-600">Loading settings...</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-red-600">Failed to load settings</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">Artefakt Settings</h1>
              <p className="text-sm text-neutral-600">
                Customize your research capture experience
              </p>
            </div>
          </div>
        </header>

        {/* Settings Sections */}
        <main>
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
        </main>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-neutral-200 text-center text-xs text-neutral-500">
          <p>Artefakt v0.1.0</p>
          <p className="mt-1">
            Helping students and educators document their research journey
          </p>
        </footer>
      </div>
    </div>
  );
}
