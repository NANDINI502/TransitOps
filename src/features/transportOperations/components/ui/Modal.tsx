// Modal component - wrapper around dialog for consistent modals
import * as React from 'react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: ModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} className={className}>
      <DialogTrigger asChild>
        <div className="hidden">Trigger</div>
      </DialogTrigger>
      <DialogContent className="w-96 sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogContent>{children}</DialogContent>
        <DialogFooter>{/* Actions will be placed by parent */}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

Modal.displayName = 'Modal';