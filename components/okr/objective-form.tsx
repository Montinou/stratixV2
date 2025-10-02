'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';

const formSchema = z.object({
  title: z.string().min(1, {
    message: 'El título es requerido',
  }),
  description: z.string().optional(),
  department: z.string().optional(),
  start_date: z.date({
    required_error: 'La fecha de inicio es requerida',
  }),
  end_date: z.date({
    required_error: 'La fecha de fin es requerida',
  }),
  status: z.enum(['no_iniciado', 'en_progreso', 'completado', 'cancelado']).default('no_iniciado'),
});

type ObjectiveFormValues = z.infer<typeof formSchema>;

interface ObjectiveFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ObjectiveForm({ onSuccess, onCancel }: ObjectiveFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enhancingDescription, setEnhancingDescription] = useState(false);

  const form = useForm<ObjectiveFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      department: '',
      status: 'no_iniciado',
    },
  });

  const enhanceDescription = async () => {
    const currentDescription = form.getValues('description');
    if (!currentDescription?.trim()) {
      sonnerToast.error('Por favor escribe una descripción breve primero');
      return;
    }

    setEnhancingDescription(true);

    try {
      const response = await fetch('/api/ai/enhance-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: currentDescription,
          context: 'objective',
        }),
      });

      if (!response.ok) {
        throw new Error('Error al mejorar la descripción');
      }

      const data = await response.json();

      if (data.enhancedText) {
        form.setValue('description', data.enhancedText);
        sonnerToast.success('¡Descripción mejorada exitosamente!');
      }
    } catch (error) {
      console.error('Error enhancing description:', error);
      sonnerToast.error('Error al mejorar la descripción. Por favor intenta de nuevo.');
    } finally {
      setEnhancingDescription(false);
    }
  };

  async function onSubmit(data: ObjectiveFormValues) {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/objectives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          start_date: format(data.start_date, 'yyyy-MM-dd'),
          end_date: format(data.end_date, 'yyyy-MM-dd'),
        }),
      });

      if (!response.ok) {
        throw new Error('Error al crear el objetivo');
      }

      const objective = await response.json();

      toast({
        title: 'Objetivo creado',
        description: 'El objetivo ha sido creado exitosamente',
      });

      form.reset();
      router.refresh();
      onSuccess?.();

      return objective;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo crear el objetivo',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título del Objetivo</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Incrementar ventas Q1 2025" {...field} />
              </FormControl>
              <FormDescription>
                Un título claro y conciso para tu objetivo
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Descripción</FormLabel>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={enhanceDescription}
                  disabled={isSubmitting || enhancingDescription || !field.value?.trim()}
                  className="h-7 px-2 text-xs"
                >
                  {enhancingDescription ? (
                    <>
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      Mejorando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-1 h-3 w-3" />
                      Mejorar con IA
                    </>
                  )}
                </Button>
              </div>
              <FormControl>
                <Textarea
                  placeholder="Describe el objetivo con más detalle..."
                  className="resize-none"
                  disabled={enhancingDescription}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Escribe una descripción breve y usa la IA para mejorarla
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="department"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Departamento</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un departamento" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="ventas">Ventas</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="desarrollo">Desarrollo</SelectItem>
                  <SelectItem value="operaciones">Operaciones</SelectItem>
                  <SelectItem value="rrhh">Recursos Humanos</SelectItem>
                  <SelectItem value="finanzas">Finanzas</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                El departamento responsable de este objetivo
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Fecha de Inicio</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? (
                          format(field.value, 'PPP')
                        ) : (
                          <span>Selecciona una fecha</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date(new Date().setHours(0, 0, 0, 0))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="end_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Fecha de Fin</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? (
                          format(field.value, 'PPP')
                        ) : (
                          <span>Selecciona una fecha</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => {
                        const startDate = form.getValues('start_date');
                        return startDate ? date < startDate : date < new Date();
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estado</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un estado" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="no_iniciado">No Iniciado</SelectItem>
                  <SelectItem value="en_progreso">En Progreso</SelectItem>
                  <SelectItem value="completado">Completado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                El estado actual del objetivo
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear Objetivo
          </Button>
        </div>
      </form>
    </Form>
  );
}