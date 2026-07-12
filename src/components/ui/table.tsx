import * as React from "react";

export const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <table
    className={`w-full text-sm text-left rtl:text-right text-muted-foreground ${className}`}
    ref={ref}
    {...props}
  />
));
Table.displayName = "Table";

export const TableHeader = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <thead className={className} ref={ref} {...props} />
));
TableHeader.displayName = "TableHeader";

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody className={className} ref={ref} {...props} />
));
TableBody.displayName = "TableBody";

export const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot className={className} ref={ref} {...props} />
));
TableFooter.displayName = "TableFooter";

export const TableCell = React.forwardRef<
  HTMLTableDataCellElement,
  React.HTMLAttributes<HTMLTableDataCellElement>
>(({ className, ...props }, ref) => (
  <td className={`border-b p-4 ${className}`} ref={ref} {...props} />
));
TableCell.displayName = "TableCell";

export const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr className={className} ref={ref} {...props} />
));
TableRow.displayName = "TableRow";
