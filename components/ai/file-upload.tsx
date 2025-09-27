'use client'

import * as React from 'react'
import { Upload, X, FileText, Image as ImageIcon, File, AlertCircle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'

export interface FileUploadItem {
  id: string
  file: File
  status: 'pending' | 'uploading' | 'completed' | 'error'
  progress: number
  url?: string
  error?: string
  preview?: string
}

interface FileUploadProps {
  onFilesSelected: (files: FileUploadItem[]) => void
  onFileRemove: (fileId: string) => void
  acceptedTypes?: string[]
  maxFileSize?: number // in bytes
  maxFiles?: number
  uploadedFiles?: FileUploadItem[]
  isUploading?: boolean
  className?: string
}

const DEFAULT_ACCEPTED_TYPES = [
  'image/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'application/json'
]

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const DEFAULT_MAX_FILES = 5

export function FileUpload({
  onFilesSelected,
  onFileRemove,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  maxFiles = DEFAULT_MAX_FILES,
  uploadedFiles = [],
  isUploading = false,
  className
}: FileUploadProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = React.useState(false)

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon className="h-6 w-6" />
    }
    if (file.type === 'application/pdf') {
      return <FileText className="h-6 w-6 text-red-500" />
    }
    if (file.type.includes('word') || file.type.includes('document')) {
      return <FileText className="h-6 w-6 text-blue-500" />
    }
    if (file.type.startsWith('text/')) {
      return <FileText className="h-6 w-6 text-gray-500" />
    }
    return <File className="h-6 w-6" />
  }

  const getFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize) {
      return `El archivo es demasiado grande. Máximo ${getFileSize(maxFileSize)}`
    }

    // Check file type
    const isAccepted = acceptedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1))
      }
      return file.type === type
    })

    if (!isAccepted) {
      return 'Tipo de archivo no soportado'
    }

    return null
  }

  const processFiles = async (files: File[]) => {
    if (uploadedFiles.length + files.length > maxFiles) {
      toast.error(`Máximo ${maxFiles} archivos permitidos`)
      return
    }

    const validFiles: FileUploadItem[] = []
    const errors: string[] = []

    for (const file of files) {
      const error = validateFile(file)
      if (error) {
        errors.push(`${file.name}: ${error}`)
        continue
      }

      // Create file preview for images
      let preview: string | undefined
      if (file.type.startsWith('image/')) {
        try {
          preview = URL.createObjectURL(file)
        } catch (e) {
          console.warn('Could not create preview for', file.name)
        }
      }

      validFiles.push({
        id: crypto.randomUUID(),
        file,
        status: 'pending',
        progress: 0,
        preview
      })
    }

    if (errors.length > 0) {
      toast.error(`Archivos rechazados:\n${errors.join('\n')}`)
    }

    if (validFiles.length > 0) {
      onFilesSelected(validFiles)
      // Simulate upload process (replace with actual Supabase upload)
      simulateUpload(validFiles)
    }
  }

  const simulateUpload = async (files: FileUploadItem[]) => {
    // This is a simulation - replace with actual Supabase Storage upload
    for (const fileItem of files) {
      // Update status to uploading
      onFilesSelected(uploadedFiles.map(f =>
        f.id === fileItem.id ? { ...f, status: 'uploading' } : f
      ))

      // Simulate progress
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 100))
        onFilesSelected(uploadedFiles.map(f =>
          f.id === fileItem.id ? { ...f, progress } : f
        ))
      }

      // Mark as completed
      onFilesSelected(uploadedFiles.map(f =>
        f.id === fileItem.id ? {
          ...f,
          status: 'completed',
          url: URL.createObjectURL(fileItem.file) // Mock URL
        } : f
      ))
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      processFiles(files)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragIn = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true)
    }
  }

  const handleDragOut = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files)
      processFiles(files)
    }
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Area */}
      <Card
        className={cn(
          'border-2 border-dashed transition-colors cursor-pointer',
          dragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/25',
          isUploading && 'pointer-events-none opacity-50'
        )}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <CardContent className="flex flex-col items-center justify-center py-8 px-4">
          <Upload className={cn(
            'h-12 w-12 mb-4',
            dragActive ? 'text-primary' : 'text-muted-foreground'
          )} />

          <div className="text-center">
            <p className="text-sm font-medium mb-1">
              {dragActive ? 'Suelta los archivos aquí' : 'Arrastra archivos aquí o haz clic para seleccionar'}
            </p>
            <p className="text-xs text-muted-foreground">
              Máximo {maxFiles} archivos, {getFileSize(maxFileSize)} cada uno
            </p>
          </div>

          <div className="flex flex-wrap gap-1 mt-3 justify-center">
            <Badge variant="secondary" className="text-xs">PDF</Badge>
            <Badge variant="secondary" className="text-xs">Word</Badge>
            <Badge variant="secondary" className="text-xs">Texto</Badge>
            <Badge variant="secondary" className="text-xs">Imágenes</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Archivos adjuntos ({uploadedFiles.length})</h4>

          {uploadedFiles.map((fileItem) => (
            <Card key={fileItem.id} className="p-3">
              <div className="flex items-center space-x-3">
                {/* File Icon */}
                <div className="shrink-0">
                  {getFileIcon(fileItem.file)}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">
                      {fileItem.file.name}
                    </p>

                    <div className="flex items-center space-x-2">
                      {/* Status Badge */}
                      {fileItem.status === 'completed' && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {fileItem.status === 'error' && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}

                      {/* Remove Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onFileRemove(fileItem.id)}
                        disabled={fileItem.status === 'uploading'}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground">
                      {getFileSize(fileItem.file.size)}
                    </p>

                    {fileItem.status === 'uploading' && (
                      <p className="text-xs text-muted-foreground">
                        {fileItem.progress}%
                      </p>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {fileItem.status === 'uploading' && (
                    <Progress value={fileItem.progress} className="mt-2 h-1" />
                  )}

                  {/* Error Message */}
                  {fileItem.status === 'error' && fileItem.error && (
                    <Alert className="mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {fileItem.error}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Summary */}
      {uploadedFiles.length > 0 && (
        <div className="text-xs text-muted-foreground text-center">
          {uploadedFiles.filter(f => f.status === 'completed').length} de {uploadedFiles.length} archivos subidos
          {uploadedFiles.some(f => f.status === 'uploading') && ' • Subiendo...'}
        </div>
      )}
    </div>
  )
}

export type { FileUploadProps, FileUploadItem }