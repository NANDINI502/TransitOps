// Custom Badge component for status indicators
import { cn } from '@/lib/utils';
import * as React from 'react';
import { VariantProps } from 'class-variance-authority';
import { badgeVariant, type BadgeVariantProps } from './badge.variants';

interface BadgeProps extends React.ComponentPropsWithoutRef<'span'> {
  variant?: BadgeVariantProps;
}

export const Badge = React.forwardRef<
  HTMLSpanElement,
  BadgeProps
>(({ className, variant = 'default', ...props }, ref) => {
  return (
    <span
      className={cn(badgeVariant({ variant }), className)}
      ref={ref}
      {...props}
    />
  );
});
Badge.displayName = 'Badge';