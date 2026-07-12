// Tooltip component for showing helpful hints on hover
import * as React from 'react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface CustomTooltipProps {
  children: React.ReactNode;
  content: string;
  className?: string;
}

export const CustomTooltip = ({
  children,
  content,
  className,
}: CustomTooltipProps) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent sideOffset={4} className={className}>
        {content}
      </TooltipContent>
    </Tooltip>
  );
};

CustomTooltip.displayName = 'CustomTooltip';