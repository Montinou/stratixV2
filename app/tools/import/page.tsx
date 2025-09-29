import { stackServerApp } from '@/stack/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Download,
  Settings,
  FileSpreadsheet,
  Database
} from 'lucide-react';

export default async function ImportPage() {
  const user = await stackServerApp.getUser({ or: 'redirect' });

  // TODO: Implementar queries para obtener historial de importaciones reales
  const importHistory = [
    {
      id: '1',
      fileName: 'objetivos_q1_2024.xlsx',
      type: 'objectives',
      status: 'completed',
      recordsProcessed: 25,
      recordsSuccessful: 23,
      recordsErrors: 2,
      uploadedAt: '2024-02-14T10:30:00Z',
      completedAt: '2024-02-14T10:32:00Z',
      uploadedBy: 'María García',
    },
    {
      id: '2',
      fileName: 'iniciativas_desarrollo.csv',
      type: 'initiatives',
      status: 'processing',
      recordsProcessed: 15,
      recordsSuccessful: 12,
      recordsErrors: 0,
      uploadedAt: '2024-02-15T09:15:00Z',
      completedAt: null,
      uploadedBy: 'Carlos López',
    },
    {
      id: '3',
      fileName: 'actividades_enero.xlsx',
      type: 'activities',
      status: 'failed',
      recordsProcessed: 50,
      recordsSuccessful: 0,
      recordsErrors: 50,
      uploadedAt: '2024-02-13T14:20:00Z',
      completedAt: '2024-02-13T14:22:00Z',
      uploadedBy: 'Ana Torres',
    },
    {
      id: '4',
      fileName: 'estructura_organizacional.csv',
      type: 'users',
      status: 'completed',
      recordsProcessed: 120,
      recordsSuccessful: 118,
      recordsErrors: 2,
      uploadedAt: '2024-02-12T11:45:00Z',
      completedAt: '2024-02-12T11:48:00Z',
      uploadedBy: 'Luis Herrera',
    },
  ];

  const supportedFormats = [
    {
      type: 'objectives',
      name: 'Objetivos',
      description: 'Importar objetivos estratégicos con metas y responsables',
      formats: ['.xlsx', '.csv'],
      icon: <FileSpreadsheet className="h-6 w-6" />,
      requiredFields: ['título', 'descripción', 'departamento', 'fecha_inicio', 'fecha_fin'],
    },
    {
      type: 'initiatives',
      name: 'Iniciativas',
      description: 'Cargar iniciativas vinculadas a objetivos específicos',
      formats: ['.xlsx', '.csv'],
      icon: <FileSpreadsheet className="h-6 w-6" />,
      requiredFields: ['título', 'descripción', 'objetivo_id', 'presupuesto', 'responsable'],
    },
    {
      type: 'activities',
      name: 'Actividades',
      description: 'Importar tareas y actividades de las iniciativas',
      formats: ['.xlsx', '.csv'],
      icon: <FileSpreadsheet className="h-6 w-6" />,
      requiredFields: ['título', 'descripción', 'iniciativa_id', 'horas_estimadas', 'fecha_vencimiento'],
    },
    {
      type: 'users',
      name: 'Usuarios',
      description: 'Cargar estructura organizacional y roles',
      formats: ['.xlsx', '.csv'],
      icon: <Database className="h-6 w-6" />,
      requiredFields: ['nombre_completo', 'email', 'departamento', 'rol', 'empresa_id'],
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completado';
      case 'processing':
        return 'Procesando';
      case 'failed':
        return 'Fallido';
      default:
        return status;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'objectives':
        return 'Objetivos';
      case 'initiatives':
        return 'Iniciativas';
      case 'activities':
        return 'Actividades';
      case 'users':
        return 'Usuarios';
      default:
        return type;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Importar Datos
          </h1>
          <p className="text-muted-foreground">
            Carga masiva de objetivos, iniciativas, actividades y usuarios
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Plantillas
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configuración
          </Button>
        </div>
      </div>

      {/* Resumen de estadísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Importaciones</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{importHistory.length}</div>
            <p className="text-xs text-muted-foreground">
              Este mes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exitosas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {importHistory.filter(imp => imp.status === 'completed').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Completadas sin errores
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registros Procesados</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {importHistory.reduce((acc, imp) => acc + imp.recordsProcessed, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total de registros
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Éxito</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(
                (importHistory.reduce((acc, imp) => acc + imp.recordsSuccessful, 0) /
                importHistory.reduce((acc, imp) => acc + imp.recordsProcessed, 0)) * 100
              )}%
            </div>
            <p className="text-xs text-muted-foreground">
              Registros exitosos
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Formatos soportados */}
        <Card>
          <CardHeader>
            <CardTitle>Tipos de Importación</CardTitle>
            <CardDescription>
              Formatos de datos soportados para carga masiva
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {supportedFormats.map((format) => (
                <div key={format.type} className="p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-start space-x-3">
                    <div className="text-primary">{format.icon}</div>
                    <div className="flex-1">
                      <h4 className="font-medium">{format.name}</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        {format.description}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-2">
                        <span>Formatos:</span>
                        {format.formats.map((fmt) => (
                          <Badge key={fmt} variant="outline" className="text-xs">
                            {fmt}
                          </Badge>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Campos requeridos:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {format.requiredFields.map((field) => (
                            <Badge key={field} variant="secondary" className="text-xs">
                              {field}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Button size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Importar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Historial de importaciones */}
        <Card>
          <CardHeader>
            <CardTitle>Historial de Importaciones</CardTitle>
            <CardDescription>
              Registro de cargas masivas recientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {importHistory.map((importItem) => (
                <div key={importItem.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(importItem.status)}
                      <div>
                        <h4 className="font-medium text-sm">{importItem.fileName}</h4>
                        <p className="text-xs text-muted-foreground">
                          {getTypeLabel(importItem.type)} • {importItem.uploadedBy}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(importItem.status)}>
                      {getStatusLabel(importItem.status)}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {importItem.status === 'processing' && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Progreso</span>
                          <span>{Math.round((importItem.recordsSuccessful / importItem.recordsProcessed) * 100)}%</span>
                        </div>
                        <Progress
                          value={(importItem.recordsSuccessful / importItem.recordsProcessed) * 100}
                          className="h-2"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <div>
                        <span className="font-medium">{importItem.recordsProcessed}</span>
                        <div>Procesados</div>
                      </div>
                      <div>
                        <span className="font-medium text-green-600">{importItem.recordsSuccessful}</span>
                        <div>Exitosos</div>
                      </div>
                      <div>
                        <span className="font-medium text-red-600">{importItem.recordsErrors}</span>
                        <div>Errores</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>Iniciado: {formatDate(importItem.uploadedAt)}</span>
                      {importItem.completedAt && (
                        <span>Completado: {formatDate(importItem.completedAt)}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Zona de carga */}
      <Card>
        <CardHeader>
          <CardTitle>Cargar Archivo</CardTitle>
          <CardDescription>
            Arrastra y suelta tu archivo o haz clic para seleccionar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors cursor-pointer">
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Seleccionar archivo</h3>
            <p className="text-muted-foreground mb-4">
              Soporta archivos .xlsx, .csv hasta 10MB
            </p>
            <Button>
              Seleccionar Archivo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Instrucciones */}
      <Card>
        <CardHeader>
          <CardTitle>Instrucciones de Importación</CardTitle>
          <CardDescription>
            Guía para preparar tus archivos correctamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">Preparación del Archivo</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Usa la primera fila para los encabezados</li>
                <li>• Evita celdas combinadas</li>
                <li>• Formato de fechas: DD/MM/AAAA</li>
                <li>• Números sin formato de moneda</li>
                <li>• Texto sin caracteres especiales</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Validaciones</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Campos obligatorios completos</li>
                <li>• Referencias válidas (IDs existentes)</li>
                <li>• Formatos de email correctos</li>
                <li>• Fechas dentro del rango válido</li>
                <li>• Valores numéricos positivos</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}