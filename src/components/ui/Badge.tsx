import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
  ...props
}) => {
  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5 rounded',
    md: 'text-xs px-2 py-0.5 rounded-md',
  };

  const variantStyles = {
    neutral:
      'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200/80',
    success:
      'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-600/20',
    warning:
      'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20',
    danger:
      'bg-rose-50 text-rose-800 ring-1 ring-inset ring-rose-600/20',
    info:
      'bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-600/20',
  };

  const dotColors = {
    neutral: 'bg-slate-400',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-blue-500',
  };

  return (
    <span
      className={`inline-flex items-center font-medium tracking-tight whitespace-nowrap select-none ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${dotColors[variant]}`}
        />
      )}
      <span>{children}</span>
    </span>
  );
};
