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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ObjectiveForm } from './objective-form';
import { InitiativeForm } from './initiative-form';
import { ActivityForm } from './activity-form';
import { useEffect } from 'react';

interface OKRCreationDialogProps {
  objectives?: Array<{ id: string; title: string }>;
  initiatives?: Array<{ id: string; title: string }>;
  buttonText?: string;
  buttonVariant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  showIcon?: boolean;
}

export function OKRCreationDialog({
  objectives: initialObjectives,
  initiatives: initialInitiatives,
  buttonText = 'Crear OKR',
  buttonVariant = 'default',
  showIcon = true
}: OKRCreationDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('objective');
  const [objectives, setObjectives] = useState(initialObjectives || []);
  const [initiatives, setInitiatives] = useState(initialInitiatives || []);

  // Fetch objectives and initiatives when dialog opens
  useEffect(() => {
    if (open) {
      fetchObjectives();
      fetchInitiatives();
    }
  }, [open]);

  const fetchObjectives = async () => {
    try {
      const response = await fetch('/api/objectives');
      if (response.ok) {
        const data = await response.json();
        setObjectives(data.map((obj: any) => ({ id: obj.id, title: obj.title })));
      }
    } catch (error) {
      console.error('Error fetching objectives:', error);
    }
  };

  const fetchInitiatives = async () => {
    try {
      const response = await fetch('/api/initiatives');
      if (response.ok) {
        const data = await response.json();
        setInitiatives(data.map((ini: any) => ({ id: ini.id, title: ini.title })));
      }
    } catch (error) {
      console.error('Error fetching initiatives:', error);
    }
  };

  const handleSuccess = () => {
    setOpen(false);
    // Refresh data after successful creation
    fetchObjectives();
    fetchInitiatives();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant}>
          {showIcon && <Plus className="mr-2 h-4 w-4" />}
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nuevo OKR</DialogTitle>
          <DialogDescription>
            Crea objetivos, iniciativas y actividades para tu estrategia OKR
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="objective">Objetivo</TabsTrigger>
            <TabsTrigger value="initiative" disabled={objectives.length === 0}>
              Iniciativa
            </TabsTrigger>
            <TabsTrigger value="activity" disabled={initiatives.length === 0}>
              Actividad
            </TabsTrigger>
          </TabsList>

          <TabsContent value="objective" className="mt-4">
            <ObjectiveForm
              onSuccess={() => {
                handleSuccess();
                setActiveTab('initiative');
              }}
              onCancel={() => setOpen(false)}
            />
          </TabsContent>

          <TabsContent value="initiative" className="mt-4">
            {objectives.length > 0 ? (
              <InitiativeForm
                objectives={objectives}
                onSuccess={() => {
                  handleSuccess();
                  setActiveTab('activity');
                }}
                onCancel={() => setOpen(false)}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Primero debes crear un objetivo
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            {initiatives.length > 0 ? (
              <ActivityForm
                initiatives={initiatives}
                onSuccess={handleSuccess}
                onCancel={() => setOpen(false)}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Primero debes crear una iniciativa
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}