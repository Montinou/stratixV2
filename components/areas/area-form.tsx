'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

interface AreaFormProps {
  area?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AreaForm({ area, onSuccess, onCancel }: AreaFormProps) {
  const [loading, setLoading] = useState(false);
  const [areas, setAreas] = useState<Array<{ id: string; name: string }>>([]);
  const [formData, setFormData] = useState({
    name: area?.name || '',
    description: area?.description || '',
    code: area?.code || '',
    parent_area_id: area?.parent_area_id || '',
    budget: area?.budget || '',
    headcount: area?.headcount || 0,
    status: area?.status || 'active',
    color: area?.color || '#6B7280',
    icon: area?.icon || 'Building'
  });

  useEffect(() => {
    fetchAreas();
  }, []);

  const fetchAreas = async () => {
    try {
      const response = await fetch('/api/areas');
      if (response.ok) {
        const data = await response.json();
        // Filter out current area to prevent self-reference
        setAreas(data.filter((a: any) => a.id !== area?.id));
      }
    } catch (error) {
      console.error('Error fetching areas:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = area ? `/api/areas/${area.id}` : '/api/areas';
      const method = area ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to save area');
      }

      toast({
        title: area ? 'Área actualizada' : 'Área creada',
        description: area
          ? 'El área ha sido actualizada exitosamente.'
          : 'El área ha sido creada exitosamente.',
      });

      onSuccess();
    } catch (error) {
      console.error('Error saving area:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar el área. Por favor intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const statusOptions = [
    { value: 'active', label: 'Activa' },
    { value: 'inactive', label: 'Inactiva' },
    { value: 'planning', label: 'En Planificación' }
  ];

  const iconOptions = [
    { value: 'Building', label: '🏢 Edificio' },
    { value: 'Users', label: '👥 Usuarios' },
    { value: 'Briefcase', label: '💼 Maletín' },
    { value: 'Code', label: '💻 Código' },
    { value: 'DollarSign', label: '💰 Finanzas' },
    { value: 'ShoppingCart', label: '🛒 Ventas' },
    { value: 'HeadphonesIcon', label: '🎧 Soporte' },
    { value: 'Megaphone', label: '📢 Marketing' },
    { value: 'Shield', label: '🛡️ Seguridad' },
    { value: 'Cog', label: '⚙️ Operaciones' }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre del Área *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Ej: Desarrollo de Software"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="code">Código</Label>
        <Input
          id="code"
          value={formData.code}
          onChange={(e) => handleChange('code', e.target.value)}
          placeholder="Ej: DEV-001"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Describe las responsabilidades y alcance del área..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="parent_area">Área Padre</Label>
          <Select value={formData.parent_area_id} onValueChange={(value) => handleChange('parent_area_id', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona área padre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Sin área padre</SelectItem>
              {areas.map(area => (
                <SelectItem key={area.id} value={area.id}>
                  {area.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Estado</Label>
          <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona estado" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="budget">Presupuesto</Label>
          <Input
            id="budget"
            type="number"
            value={formData.budget}
            onChange={(e) => handleChange('budget', e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="headcount">Personal</Label>
          <Input
            id="headcount"
            type="number"
            value={formData.headcount}
            onChange={(e) => handleChange('headcount', parseInt(e.target.value) || 0)}
            placeholder="0"
            min="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="icon">Icono</Label>
          <Select value={formData.icon} onValueChange={(value) => handleChange('icon', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona icono" />
            </SelectTrigger>
            <SelectContent>
              {iconOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="color">Color</Label>
          <div className="flex gap-2">
            <Input
              id="color"
              type="color"
              value={formData.color}
              onChange={(e) => handleChange('color', e.target.value)}
              className="w-20 h-10"
            />
            <Input
              value={formData.color}
              onChange={(e) => handleChange('color', e.target.value)}
              placeholder="#6B7280"
              className="flex-1"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : area ? 'Actualizar Área' : 'Crear Área'}
        </Button>
      </div>
    </form>
  );
}