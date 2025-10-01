'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AreaForm } from './area-form';

interface AreaDialogProps {
  area?: any;
  onSuccess?: () => void;
  buttonText?: string;
  buttonVariant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  showIcon?: boolean;
  triggerElement?: React.ReactNode;
}

export function AreaDialog({
  area,
  onSuccess,
  buttonText = 'Nueva Área',
  buttonVariant = 'default',
  showIcon = true,
  triggerElement
}: AreaDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
    if (onSuccess) {
      onSuccess();
    }
    // Reload the page to show updated data
    window.location.reload();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerElement || (
          <Button variant={buttonVariant}>
            {showIcon && <Plus className="mr-2 h-4 w-4" />}
            {buttonText}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{area ? 'Editar Área' : 'Crear Nueva Área'}</DialogTitle>
          <DialogDescription>
            {area
              ? 'Modifica la información del área organizacional.'
              : 'Crea una nueva área o departamento en tu organización.'}
          </DialogDescription>
        </DialogHeader>
        <AreaForm
          area={area}
          onSuccess={handleSuccess}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}