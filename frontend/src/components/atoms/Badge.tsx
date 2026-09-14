import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    // v3 §7/§8: status labels are tinted chips (semantic bg + border + fg),
    // never solid colour fills. States are never colour-only — consumers
    // pair the chip with a text label.
    const variants = {
      default: 'bg-muted text-foreground border-border',
      success: 'bg-success-bg text-success-fg border-success-border',
      warning: 'bg-warning-bg text-warning-fg border-warning-border',
      error: 'bg-error-bg text-error-fg border-error-border',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-xs font-medium transition-colors',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';
