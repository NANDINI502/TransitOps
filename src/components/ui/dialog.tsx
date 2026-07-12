import * as React from "react";
import { Dialog, DialogContent, Description, Footer, Header, Title, Trigger } from "@/components/ui/dialog";

interface DialogProps {
  children: React.ReactNode;
  trigger: React.ReactNode;
  title: string;
  description?: string;
}

const DialogComponent: React.FC<DialogProps> = ({ children, trigger, title, description }) => {
  return (
    <Dialog>
      <Trigger asChild>
        <div className="hidden">{trigger}</div>
      </Trigger>
      <DialogContent className="w-96 sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogContent>{children}</DialogContent>
        <DialogFooter>
          <DialogFooter>{/* Actions will be placed here by parent */}</DialogFooter>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DialogComponent;