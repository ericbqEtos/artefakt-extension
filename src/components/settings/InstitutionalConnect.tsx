import React, { useState } from 'react';
import { Button } from '../ui/Button';

interface InstitutionalConnectProps {
  email?: string;
  isConnected: boolean;
  onEmailChange: (email: string) => void;
}

export function InstitutionalConnect({
  email,
  isConnected,
  onEmailChange,
}: InstitutionalConnectProps) {
  const [inputValue, setInputValue] = useState(email || '');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    onEmailChange(e.target.value);
  };

  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
          <svg
            className="w-5 h-5 text-primary-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-medium text-neutral-900">
              Connect Your Institution
            </h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
              Coming Soon
            </span>
          </div>
          <p className="text-xs text-neutral-600 mb-3">
            Link your academic or educational institution email to unlock the full Artefakt experience with cloud sync and collaboration features.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              id="institutional-email"
              value={inputValue}
              onChange={handleInputChange}
              placeholder="you@university.edu"
              disabled
              className="flex-1 px-3 py-2 text-sm border border-neutral-300 rounded-md bg-white disabled:bg-neutral-100 disabled:text-neutral-500 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              aria-label="Institutional email address"
            />
            <Button
              variant="primary"
              size="sm"
              disabled
              aria-describedby="connect-coming-soon"
            >
              Connect
            </Button>
          </div>
          <p id="connect-coming-soon" className="sr-only">
            This feature is coming soon and is currently disabled.
          </p>

          {isConnected && (
            <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Connected
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
