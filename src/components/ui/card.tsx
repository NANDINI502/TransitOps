import * as React from "react";

export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`}
    ref={ref}
    {...props}
  />
));
Card.displayName = "Card";

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div className={`p-6 pt-0 ${className}`} ref={ref} {...props} />
));
CardContent.displayName = "CardContent";

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div className={`flex flex-col space-y-1.5 p-6 pb-0 ${className}`} ref={ref} {...props} />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    className={`text-2xl font-semibold leading-none tracking-tight ${className}`}
    ref={ref}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";
