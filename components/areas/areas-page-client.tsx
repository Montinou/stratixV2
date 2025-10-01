'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Building, Users, DollarSign, MoreHorizontal, Edit, Trash, Building2 } from 'lucide-react';
import { AreaDialog } from './area-dialog';
import { useToast } from '@/hooks/use-toast';

interface AreasPageClientProps {
  areas: any[];
  stats: {
    total: number;
    active: number;
    inactive: number;
    planning: number;
    totalBudget: number;
    totalHeadcount: number;
  };
}

export function AreasPageClient({ areas: initialAreas, stats }: AreasPageClientProps) {
  const { toast } = useToast();
  const [areas, setAreas] = useState(initialAreas);
  const [deleteAreaId, setDeleteAreaId] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'planning':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activa';
      case 'inactive':
        return 'Inactiva';
      case 'planning':
        return 'En Planificación';
      default:
        return status;
    }
  };

  const formatCurrency = (amount: number | string | null) => {
    if (!amount) return '€0';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(numAmount);
  };

  const handleDelete = async () => {
    if (!deleteAreaId) return;

    try {
      const response = await fetch(`/api/areas/${deleteAreaId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete area');
      }

      toast({
        title: 'Área eliminada',
        description: 'El área ha sido eliminada exitosamente.',
      });

      // Update local state
      setAreas(areas.filter(area => area.id !== deleteAreaId));
      setDeleteAreaId(null);
    } catch (error) {
      console.error('Error deleting area:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el área. Por favor intenta de nuevo.',
        variant: 'destructive',
      });
    }
  };

  const getIconComponent = (icon: string) => {
    // In a real app, you'd map these to actual icon components
    const iconMap: { [key: string]: string } = {
      'Building': '🏢',
      'Users': '👥',
      'Briefcase': '💼',
      'Code': '💻',
      'DollarSign': '💰',
      'ShoppingCart': '🛒',
      'HeadphonesIcon': '🎧',
      'Megaphone': '📢',
      'Shield': '🛡️',
      'Cog': '⚙️'
    };
    return iconMap[icon] || '🏢';
  };

  // Build hierarchy tree
  const buildHierarchy = (areas: any[]) => {
    const rootAreas = areas.filter(area => !area.parentAreaId);
    const getChildren = (parentId: string) => areas.filter(area => area.parentAreaId === parentId);

    const buildTree = (area: any, level: number = 0): any => ({
      ...area,
      level,
      children: getChildren(area.id).map(child => buildTree(child, level + 1))
    });

    return rootAreas.map(area => buildTree(area));
  };

  const hierarchicalAreas = buildHierarchy(areas);

  const renderAreaCard = (area: any) => (
    <Card
      key={area.id}
      className="hover:shadow-md transition-shadow"
      style={{ marginLeft: `${area.level * 2}rem` }}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div
              className="text-2xl p-2 rounded-lg"
              style={{ backgroundColor: area.color ? `${area.color}20` : '#f3f4f6' }}
            >
              {getIconComponent(area.icon)}
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                {area.name}
                {area.code && (
                  <Badge variant="outline" className="text-xs">
                    {area.code}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>{area.description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(area.status)}>
              {getStatusLabel(area.status)}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <AreaDialog
                    area={area}
                    triggerElement={
                      <button className="flex items-center w-full px-2 py-1.5 text-sm">
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </button>
                    }
                  />
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => setDeleteAreaId(area.id)}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-sm">
          {area.budget && (
            <div className="flex items-center space-x-1 text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>Presupuesto: {formatCurrency(area.budget)}</span>
            </div>
          )}
          <div className="flex items-center space-x-1 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>Personal: {area.headcount || 0}</span>
          </div>
          {area.manager_name && (
            <div className="flex items-center space-x-1 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>Manager: {area.manager_name}</span>
            </div>
          )}
        </div>
      </CardContent>

      {/* Render children recursively */}
      {area.children && area.children.length > 0 && (
        <div className="mt-2">
          {area.children.map(renderAreaCard)}
        </div>
      )}
    </Card>
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Áreas Organizacionales
          </h1>
          <p className="text-muted-foreground">
            Gestiona la estructura organizacional de tu empresa
          </p>
        </div>
        <AreaDialog />
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Áreas</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Departamentos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">
              En operación
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactivas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inactive}</div>
            <p className="text-xs text-muted-foreground">
              Sin operación
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Planificación</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.planning}</div>
            <p className="text-xs text-muted-foreground">
              Por implementar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Personal Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalHeadcount}</div>
            <p className="text-xs text-muted-foreground">
              Empleados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Presupuesto Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalBudget)}
            </div>
            <p className="text-xs text-muted-foreground">
              Asignado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Areas List/Hierarchy */}
      {hierarchicalAreas.length > 0 ? (
        <div className="space-y-4">
          {hierarchicalAreas.map(renderAreaCard)}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay áreas registradas</h3>
            <p className="text-muted-foreground text-center mb-4">
              Comienza creando la primera área de tu organización
            </p>
            <AreaDialog buttonText="Crear Primera Área" />
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteAreaId} onOpenChange={() => setDeleteAreaId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el área
              y toda su información asociada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}