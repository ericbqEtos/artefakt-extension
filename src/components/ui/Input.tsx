import { type InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    const id = props.id || `input-${label.toLowerCase().replace(/\s+/g, '-')}`;

    return (
      <div className={className}>
        <label
          htmlFor={id}
          className="block text-sm font-medium text-neutral-700 mb-1"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={id}
          className={`block w-full rounded-md shadow-sm text-base py-2 px-3 border ${
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
              : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500'
          }`}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
        />
        {error && (
          <p id={`${id}-error`} className="mt-1 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
