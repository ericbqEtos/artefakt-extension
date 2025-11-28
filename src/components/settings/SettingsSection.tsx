import React from 'react';

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-neutral-900 mb-1">{title}</h2>
      {description && (
        <p className="text-sm text-neutral-600 mb-4">{description}</p>
      )}
      <div className="space-y-4">{children}</div>
    </section>
  );
}
