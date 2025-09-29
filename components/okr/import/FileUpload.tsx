'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  File,
  FileX,
  CheckCircle,
  AlertCircle,
  Download,
  X
} from 'lucide-react';

interface FileUploadProps {
  onFileUpload: (file: File) => Promise<void>;
  acceptedTypes?: string[];
  maxSize?: number;
  isUploading?: boolean;
  uploadProgress?: number;
  lastUploadResult?: {
    success: boolean;
    message: string;
    processedRecords?: number;
    errors?: string[];
  };
}

const defaultAcceptedTypes = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

export function FileUpload({
  onFileUpload,
  acceptedTypes = defaultAcceptedTypes,
  maxSize = 10 * 1024 * 1024, // 10MB
  isUploading = false,
  uploadProgress = 0,
  lastUploadResult
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {} as Record<string, string[]>),
    maxSize,
    multiple: false,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false)
  });

  const handleUpload = async () => {
    if (selectedFile) {
      try {
        await onFileUpload(selectedFile);
        setSelectedFile(null);
      } catch (error) {
        console.error('Upload error:', error);
      }
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  const getFileTypeLabel = (type: string) => {
    switch (type) {
      case 'text/csv':
        return 'CSV';
      case 'application/vnd.ms-excel':
        return 'Excel (.xls)';
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        return 'Excel (.xlsx)';
      default:
        return type;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Subir Archivo de Datos
          </CardTitle>
          <CardDescription>
            Sube un archivo CSV o Excel con datos de objetivos, iniciativas o actividades
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive || dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
              }
              ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input {...getInputProps()} disabled={isUploading} />

            {!selectedFile ? (
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 text-gray-400">
                  <Upload className="w-full h-full" />
                </div>
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    {isDragActive ? 'Suelta el archivo aquí' : 'Arrastra un archivo o haz clic para seleccionar'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Archivos soportados: CSV, Excel (.xls, .xlsx)
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Tamaño máximo: {formatFileSize(maxSize)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <File className="h-8 w-8 text-blue-600" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(selectedFile.size)} • {getFileTypeLabel(selectedFile.type)}
                    </p>
                  </div>
                  {!isUploading && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile();
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {!isUploading && (
                  <Button onClick={handleUpload} className="w-full">
                    <Upload className="h-4 w-4 mr-2" />
                    Subir Archivo
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Procesando archivo...</span>
                <span className="text-sm text-gray-600">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* File Rejection Errors */}
          {fileRejections.length > 0 && (
            <Alert className="mt-4" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  {fileRejections.map(({ file, errors }) => (
                    <div key={file.name}>
                      <strong>{file.name}:</strong>
                      <ul className="list-disc list-inside ml-2">
                        {errors.map((error) => (
                          <li key={error.code} className="text-sm">
                            {error.code === 'file-too-large'
                              ? `Archivo demasiado grande (máximo ${formatFileSize(maxSize)})`
                              : error.code === 'file-invalid-type'
                              ? 'Tipo de archivo no soportado'
                              : error.message
                            }
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Accepted File Types */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Formatos Soportados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {acceptedTypes.map((type) => (
              <Badge key={type} variant="outline">
                {getFileTypeLabel(type)}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upload Result */}
      {lastUploadResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {lastUploadResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <FileX className="h-5 w-5 text-red-600" />
              )}
              Resultado de la Importación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant={lastUploadResult.success ? "default" : "destructive"}>
              <AlertDescription>
                <p className="font-medium">{lastUploadResult.message}</p>
                {lastUploadResult.processedRecords && (
                  <p className="text-sm mt-1">
                    Registros procesados: {lastUploadResult.processedRecords}
                  </p>
                )}
              </AlertDescription>
            </Alert>

            {lastUploadResult.errors && lastUploadResult.errors.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-red-900 mb-2">Errores encontrados:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-red-800">
                  {lastUploadResult.errors.slice(0, 10).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                  {lastUploadResult.errors.length > 10 && (
                    <li>... y {lastUploadResult.errors.length - 10} errores más</li>
                  )}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Download Template */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plantilla de Importación</CardTitle>
          <CardDescription>
            Descarga una plantilla para estructurar correctamente tus datos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Descargar Plantilla CSV
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}