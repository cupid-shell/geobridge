import React, { useState, useRef } from 'react';
import { HelpCircle, Info } from 'lucide-react';

interface TooltipProps {
  title?: string;
  content: string;
  howToUse?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
  className?: string;
  showIcon?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({
  title,
  content,
  howToUse,
  position = 'top',
  children,
  className = '',
  showIcon = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, 120);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-slate-900 border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-900 border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-slate-900 border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-slate-900 border-y-transparent border-l-transparent',
  };

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}

      {showIcon && (
        <span className="ml-1 text-slate-400 hover:text-slate-600 cursor-help transition-colors">
          <HelpCircle className="w-3.5 h-3.5 inline" />
        </span>
      )}

      {isVisible && (
        <div
          role="tooltip"
          className={`absolute ${positionClasses[position]} z-50 w-64 p-2.5 bg-slate-900 text-white rounded-lg shadow-xl border border-slate-800 text-left pointer-events-none transition-all duration-150 animate-in fade-in-50 zoom-in-95`}
        >
          {title && (
            <div className="flex items-center space-x-1.5 font-semibold text-slate-100 text-xs pb-1 border-b border-slate-800 mb-1">
              <Info className="w-3 h-3 text-slate-400 shrink-0" />
              <span>{title}</span>
            </div>
          )}

          <p className="text-[11px] text-slate-300 leading-relaxed">
            {content}
          </p>

          {howToUse && (
            <div className="mt-1.5 pt-1.5 border-t border-slate-800 text-[10px] text-slate-400 leading-tight">
              <strong className="text-slate-200">Guidance:</strong> {howToUse}
            </div>
          )}

          <div
            className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`}
          />
        </div>
      )}
    </div>
  );
};
