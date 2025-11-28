import React from 'react';

interface SettingsRowProps {
  label: string;
  htmlFor?: string;
  helpText?: string;
  children: React.ReactNode;
}

export function SettingsRow({ label, htmlFor, helpText, children }: SettingsRowProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3 border-b border-neutral-200 last:border-b-0">
      <div className="flex-1">
        <label
          htmlFor={htmlFor}
          className="block text-sm font-medium text-neutral-800"
        >
          {label}
        </label>
        {helpText && (
          <p className="text-xs text-neutral-500 mt-0.5">{helpText}</p>
        )}
      </div>
      <div className="sm:w-64 flex-shrink-0">{children}</div>
    </div>
  );
}
