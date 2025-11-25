import { type SelectHTMLAttributes, forwardRef } from 'react';

interface SelectOption {
  id: string;
  name: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, value, onChange, className = '', ...props }, ref) => {
    const id = props.id || `select-${label.toLowerCase().replace(/\s+/g, '-')}`;

    return (
      <div className={className}>
        <label
          htmlFor={id}
          className="block text-sm font-medium text-neutral-700 mb-1"
        >
          {label}
        </label>
        <select
          ref={ref}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-base py-2 px-3 border"
          {...props}
        >
          {options.map(option => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </div>
    );
  }
);

Select.displayName = 'Select';
