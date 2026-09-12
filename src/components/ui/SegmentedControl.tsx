import React from 'react';

export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = 'md',
  className = '',
}: SegmentedControlProps<T>) {
  const sizeStyles = {
    sm: 'p-0.5 text-xs',
    md: 'p-1 text-xs',
  };

  const itemSizeStyles = {
    sm: 'py-1 px-2.5 gap-1.5',
    md: 'py-1.5 px-3 gap-2',
  };

  return (
    <div
      className={`inline-flex items-center bg-slate-100 border border-slate-200/80 rounded-lg select-none ${sizeStyles[size]} ${className}`}
      role="tablist"
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        const isDisabled = Boolean(option.disabled);
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            disabled={isDisabled}
            onClick={() => !isDisabled && onChange(option.value)}
            className={`inline-flex items-center justify-center font-medium rounded-md transition-all ${itemSizeStyles[size]} ${
              isDisabled
                ? 'opacity-40 cursor-not-allowed text-slate-400'
                : isSelected
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-semibold cursor-default'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/50 cursor-pointer'
            }`}
          >
            {option.icon}
            <span>{option.label}</span>
            {option.badge !== undefined && (
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  isSelected
                    ? 'bg-slate-100 text-slate-700 font-semibold'
                    : 'bg-slate-200/70 text-slate-600'
                }`}
              >
                {option.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
