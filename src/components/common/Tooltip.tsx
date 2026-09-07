import React, { useState, useRef } from 'react';
import { HelpCircle, Info, Sparkles } from 'lucide-react';

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
    }, 150);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  // Position classes
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
          className={`absolute ${positionClasses[position]} z-50 w-72 p-3.5 bg-slate-900/95 text-white rounded-xl shadow-2xl border border-slate-700/80 backdrop-blur-md pointer-events-none transition-all duration-200 animate-in fade-in zoom-in-95 text-left`}
        >
          {title && (
            <div className="flex items-center space-x-1.5 font-bold text-slate-100 text-xs pb-1.5 border-b border-slate-700/60 mb-1.5">
              <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{title}</span>
            </div>
          )}

          <p className="text-xs text-slate-300 leading-relaxed">
            {content}
          </p>

          {howToUse && (
            <div className="mt-2 pt-2 border-t border-slate-800 flex items-start space-x-1.5 text-[11px] text-emerald-300">
              <Sparkles className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-emerald-200">How to use:</strong> {howToUse}
              </span>
            </div>
          )}

          {/* Arrow */}
          <div
            className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`}
          />
        </div>
      )}
    </div>
  );
};
