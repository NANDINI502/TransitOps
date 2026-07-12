// ButtonGroup component for grouping related actions
import * as React from 'react';
import { Button } from '@/components/ui/button';

interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
  size?: 'default' | 'sm' | 'lg';
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

export const ButtonGroup = React.forwardRef<
  HTMLDivElement,
  ButtonGroupProps
>(({ children, className, size, variant = 'default', ...props }, ref) => {
  const baseClass = 'inline-flex items-center rounded-md shadow';
  const sizeClass =
    size === 'sm'
      ? 'h-9 px-3 text-sm'
      : size === 'lg'
        ? 'h-11 px-8 text-lg'
        : 'h-10 px-4 text-base';
  const variantClass =
    variant === 'default'
      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
      : variant === 'destructive'
        ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
        : variant === 'outline'
          ? 'border border-input hover:bg-accent hover:text-accent-foreground'
          : variant === 'secondary'
            ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            : variant === 'ghost'
              ? 'hover:bg-accent hover:text-accent-foreground'
              : 'link';

  return (
    <div
      className={`${baseClass} ${sizeClass} ${variantClass} ${className}`}
      ref={ref}
      {...props}
    >
      {children}
    </div>
  );
});
ButtonGroup.displayName = 'ButtonGroup';