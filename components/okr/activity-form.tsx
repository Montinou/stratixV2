'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
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
import { Slider } from '@/components/ui/slider';

const formSchema = z.object({
  title: z.string().min(1, {
    message: 'El título es requerido',
  }),
  description: z.string().optional(),
  initiative_id: z.string().min(1, {
    message: 'Debes seleccionar una iniciativa',
  }),
  start_date: z.date({
    required_error: 'La fecha de inicio es requerida',
  }),
  end_date: z.date({
    required_error: 'La fecha de fin es requerida',
  }),
  status: z.enum(['no_iniciado', 'en_progreso', 'completado', 'cancelado']).default('no_iniciado'),
  progress: z.number().min(0).max(100).default(0),
});

type ActivityFormValues = z.infer<typeof formSchema>;

interface ActivityFormProps {
  initiativeId?: string;
  initiatives?: Array<{ id: string; title: string }>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ActivityForm({ initiativeId, initiatives, onSuccess, onCancel }: ActivityFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      initiative_id: initiativeId || '',
      status: 'no_iniciado',
      progress: 0,
    },
  });

  async function onSubmit(data: ActivityFormValues) {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/activities', {
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
        throw new Error('Error al crear la actividad');
      }

      const activity = await response.json();

      toast({
        title: 'Actividad creada',
        description: 'La actividad ha sido creada exitosamente',
      });

      form.reset();
      router.refresh();
      onSuccess?.();

      return activity;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo crear la actividad',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {!initiativeId && initiatives && initiatives.length > 0 && (
          <FormField
            control={form.control}
            name="initiative_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Iniciativa Asociada</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una iniciativa" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {initiatives.map((initiative) => (
                      <SelectItem key={initiative.id} value={initiative.id}>
                        {initiative.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  La iniciativa a la que pertenece esta actividad
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título de la Actividad</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Crear campaña en redes sociales" {...field} />
              </FormControl>
              <FormDescription>
                Un título claro y conciso para tu actividad
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
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe la actividad con más detalle..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Proporciona contexto adicional sobre la actividad
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
                El estado actual de la actividad
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="progress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Progreso: {field.value}%</FormLabel>
              <FormControl>
                <Slider
                  min={0}
                  max={100}
                  step={5}
                  value={[field.value]}
                  onValueChange={(value) => field.onChange(value[0])}
                  className="w-full"
                />
              </FormControl>
              <FormDescription>
                El porcentaje de progreso de la actividad
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
            Crear Actividad
          </Button>
        </div>
      </form>
    </Form>
  );
}