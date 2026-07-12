import * as React from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface DropdownMenuProps {
  children: React.ReactNode;
  trigger: React.ReactNode;
}

const DropdownComponent: React.FC<DropdownMenuProps> = ({ children, trigger }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent>{children}</DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DropdownComponent;