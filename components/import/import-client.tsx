'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Download,
  FileSpreadsheet,
  Database,
  X,
  RefreshCw,
  FileDown,
  Table,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImportHistoryItem {
  id: string;
  file_name: string;
  file_type: string;
  status: string;
  total_records: number;
  successful_records: number;
  failed_records: number;
  error_details: any;
  created_at: string;
  updated_at: string;
  uploaded_by_name: string;
}

interface ImportError {
  row: number;
  field?: string;
  message: string;
}

interface ImportProps {
  userRole: string;
}

export function ImportClient({ userRole }: ImportProps) {
  const [selectedType, setSelectedType] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importHistory, setImportHistory] = useState<ImportHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const supportedFormats = [
    {
      type: 'objectives',
      name: 'Objetivos',
      description: 'Importar objetivos estratégicos con metas y responsables',
      formats: ['.xlsx', '.csv'],
      icon: <FileSpreadsheet className="h-6 w-6" />,
      requiredFields: ['título', 'fecha_inicio', 'fecha_fin'],
      optionalFields: ['descripción', 'area_nombre', 'responsable_email', 'estado', 'progreso'],
      restricted: false,
    },
    {
      type: 'initiatives',
      name: 'Iniciativas',
      description: 'Cargar iniciativas vinculadas a objetivos específicos',
      formats: ['.xlsx', '.csv'],
      icon: <FileSpreadsheet className="h-6 w-6" />,
      requiredFields: ['título', 'objetivo_titulo o objetivo_id', 'fecha_inicio', 'fecha_fin'],
      optionalFields: ['descripción', 'presupuesto', 'responsable_email', 'estado', 'progreso'],
      restricted: false,
    },
    {
      type: 'activities',
      name: 'Actividades',
      description: 'Importar tareas y actividades de las iniciativas',
      formats: ['.xlsx', '.csv'],
      icon: <FileSpreadsheet className="h-6 w-6" />,
      requiredFields: ['título', 'iniciativa_titulo o iniciativa_id', 'fecha_inicio', 'fecha_fin'],
      optionalFields: ['descripción', 'responsable_email', 'estado', 'progreso'],
      restricted: false,
    },
    {
      type: 'users',
      name: 'Usuarios',
      description: 'Cargar estructura organizacional y roles (Solo corporativo)',
      formats: ['.xlsx', '.csv'],
      icon: <Database className="h-6 w-6" />,
      requiredFields: ['nombre_completo', 'email', 'rol'],
      optionalFields: ['departamento', 'manager_email'],
      restricted: userRole !== 'corporativo',
    },
  ];

  // Fetch import history on mount
  useEffect(() => {
    fetchImportHistory();
  }, []);

  const fetchImportHistory = async () => {
    try {
      const response = await fetch('/api/import');
      if (response.ok) {
        const data = await response.json();
        setImportHistory(data);
      }
    } catch (error) {
      console.error('Error fetching import history:', error);
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setErrors([]);
      setImportResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    disabled: !selectedType || importing,
  });

  const handleImport = async () => {
    if (!file || !selectedType) return;

    setImporting(true);
    setErrors([]);
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', selectedType);

    try {
      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setImportResult(data);

      if (data.errors && data.errors.length > 0) {
        setErrors(data.errors);
        if (data.failedRecords > 0) {
          setShowErrorDialog(true);
        }
      }

      // Refresh history
      await fetchImportHistory();

      // Clear file if successful
      if (data.success) {
        setFile(null);
        setSelectedType('');
      }
    } catch (error: any) {
      console.error('Import error:', error);
      setErrors([{ row: 0, message: error.message }]);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = async (type: string, format: 'csv' | 'xlsx' = 'csv') => {
    try {
      const response = await fetch(`/api/templates?type=${type}&format=${format}`, {
        method: 'GET',
        credentials: 'include', // Importante: incluir las cookies de autenticación
        headers: {
          'Accept': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }
      });

      if (!response.ok) {
        let errorMessage = 'Error al descargar la plantilla';
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch {
          // Si no se puede parsear el JSON, usar el mensaje por defecto
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();

      // Verificar que realmente obtuvimos un archivo y no un JSON de error
      if (blob.type === 'application/json') {
        const text = await blob.text();
        try {
          const error = JSON.parse(text);
          throw new Error(error.error || 'Error al descargar la plantilla');
        } catch {
          throw new Error('Error al descargar la plantilla');
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Obtener el nombre del archivo desde los headers si está disponible
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `plantilla_${type}_${new Date().toISOString().split('T')[0]}.${format}`;

      if (contentDisposition) {
        // Buscar filename*= primero (UTF-8 encoded)
        const utf8Match = contentDisposition.match(/filename\*=UTF-8''(.+?)(?:;|$)/);
        if (utf8Match) {
          filename = decodeURIComponent(utf8Match[1]);
        } else {
          // Fallback a filename= regular
          const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }
      }

      a.download = filename;
      document.body.appendChild(a); // Necesario para Firefox
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log(`Template downloaded successfully: ${filename}`);
    } catch (error: any) {
      console.error('Error downloading template:', error);
      alert(`Error al descargar la plantilla: ${error.message}`);
    }
  };

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
    <div className="space-y-6">
      {/* Import Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Tipo de Importación</CardTitle>
          <CardDescription>
            Selecciona el tipo de datos que deseas importar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {supportedFormats.map((format) => (
              <div
                key={format.type}
                className={cn(
                  "p-4 border rounded-lg cursor-pointer transition-all",
                  selectedType === format.type ? "border-primary bg-primary/5" : "hover:bg-gray-50",
                  format.restricted && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => !format.restricted && setSelectedType(format.type)}
              >
                <div className="flex items-start space-x-3">
                  <div className="text-primary">{format.icon}</div>
                  <div className="flex-1">
                    <h4 className="font-medium">{format.name}</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      {format.description}
                    </p>
                    {format.restricted && (
                      <Badge variant="destructive" className="text-xs">
                        Sin permisos
                      </Badge>
                    )}
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-2">
                      <span>Formatos:</span>
                      {format.formats.map((fmt) => (
                        <Badge key={fmt} variant="outline" className="text-xs">
                          {fmt}
                        </Badge>
                      ))}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => e.stopPropagation()}
                          disabled={format.restricted}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Plantilla
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadTemplate(format.type, 'csv');
                          }}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Descargar CSV
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadTemplate(format.type, 'xlsx');
                          }}
                        >
                          <Table className="h-4 w-4 mr-2" />
                          Descargar Excel
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {userRole === 'gerente' && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Como gerente, solo puedes importar datos para tu área
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* File Upload Zone */}
      <Card>
        <CardHeader>
          <CardTitle>Cargar Archivo</CardTitle>
          <CardDescription>
            {selectedType
              ? 'Arrastra y suelta tu archivo o haz clic para seleccionar'
              : 'Primero selecciona un tipo de importación'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-12 text-center transition-colors",
              isDragActive && "border-primary bg-primary/5",
              selectedType && "hover:border-gray-400 cursor-pointer",
              !selectedType && "opacity-50 cursor-not-allowed"
            )}
          >
            <input {...getInputProps()} />
            {file ? (
              <div className="space-y-4">
                <FileText className="h-12 w-12 text-primary mx-auto" />
                <div>
                  <h3 className="text-lg font-medium">{file.name}</h3>
                  <p className="text-muted-foreground">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <div className="flex justify-center space-x-2">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleImport();
                    }}
                    disabled={importing}
                  >
                    {importing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Importar
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setErrors([]);
                      setImportResult(null);
                    }}
                    disabled={importing}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {isDragActive ? 'Suelta el archivo aquí' : 'Seleccionar archivo'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  Soporta archivos .xlsx, .csv hasta 10MB
                </p>
              </>
            )}
          </div>

          {/* Import Result */}
          {importResult && (
            <Alert className={cn("mt-4", importResult.success ? "border-green-500" : "border-yellow-500")}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Resultados de la importación</span>
                  {importResult.success ? (
                    <Badge className="bg-green-100 text-green-800">Exitoso</Badge>
                  ) : (
                    <Badge className="bg-yellow-100 text-yellow-800">Con advertencias</Badge>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total:</span>
                    <span className="ml-2 font-medium">{importResult.totalRecords}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Exitosos:</span>
                    <span className="ml-2 font-medium text-green-600">
                      {importResult.successfulRecords}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Errores:</span>
                    <span className="ml-2 font-medium text-red-600">
                      {importResult.failedRecords}
                    </span>
                  </div>
                </div>
                {importResult.failedRecords > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowErrorDialog(true)}
                    className="mt-2"
                  >
                    Ver errores
                  </Button>
                )}
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Import History */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Importaciones</CardTitle>
          <CardDescription>
            Registro de cargas masivas recientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
              <p className="text-muted-foreground mt-2">Cargando historial...</p>
            </div>
          ) : importHistory.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground mt-2">No hay importaciones previas</p>
            </div>
          ) : (
            <div className="space-y-4">
              {importHistory.map((item) => (
                <div key={item.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(item.status)}
                      <div>
                        <h4 className="font-medium text-sm">{item.file_name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {item.file_type.toUpperCase()} • {item.uploaded_by_name}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(item.status)}>
                      {item.status === 'completed' ? 'Completado' :
                       item.status === 'processing' ? 'Procesando' : 'Fallido'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <div>
                      <span className="font-medium">{item.total_records}</span>
                      <div>Procesados</div>
                    </div>
                    <div>
                      <span className="font-medium text-green-600">{item.successful_records}</span>
                      <div>Exitosos</div>
                    </div>
                    <div>
                      <span className="font-medium text-red-600">{item.failed_records}</span>
                      <div>Errores</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs text-muted-foreground mt-2">
                    <span>Iniciado: {formatDate(item.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Dialog */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Errores de Importación</DialogTitle>
            <DialogDescription>
              Se encontraron los siguientes errores durante la importación
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {errors.map((error, index) => (
              <Alert key={index} variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <span className="font-medium">Fila {error.row}:</span> {error.message}
                </AlertDescription>
              </Alert>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowErrorDialog(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}