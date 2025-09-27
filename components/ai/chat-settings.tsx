'use client'

import * as React from 'react'
import { Settings, Volume2, VolumeX, Eye, EyeOff, Palette, Monitor, Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

export interface ChatSettings {
  // Appearance
  theme: 'light' | 'dark' | 'auto'
  fontSize: 'small' | 'medium' | 'large'
  compactMode: boolean
  showTimestamps: boolean
  showAvatars: boolean

  // Behavior
  autoScroll: boolean
  enableSounds: boolean
  enableNotifications: boolean
  sendOnEnter: boolean

  // Privacy & Data
  saveConversations: boolean
  shareUsageData: boolean

  // AI Preferences
  responseStyle: 'concise' | 'balanced' | 'detailed'
  temperature: number // 0-1
  contextMemory: boolean
}

interface ChatSettingsProps {
  settings: ChatSettings
  onSettingsChange: (newSettings: ChatSettings) => void
  onClose?: () => void
  className?: string
}

const DEFAULT_SETTINGS: ChatSettings = {
  theme: 'auto',
  fontSize: 'medium',
  compactMode: false,
  showTimestamps: true,
  showAvatars: true,
  autoScroll: true,
  enableSounds: false,
  enableNotifications: true,
  sendOnEnter: true,
  saveConversations: true,
  shareUsageData: false,
  responseStyle: 'balanced',
  temperature: 0.7,
  contextMemory: true
}

export function ChatSettings({
  settings = DEFAULT_SETTINGS,
  onSettingsChange,
  onClose,
  className
}: ChatSettingsProps) {

  const updateSetting = <K extends keyof ChatSettings>(
    key: K,
    value: ChatSettings[K]
  ) => {
    onSettingsChange({
      ...settings,
      [key]: value
    })
  }

  const resetToDefaults = () => {
    onSettingsChange(DEFAULT_SETTINGS)
  }

  const fontSizeOptions = [
    { value: 'small', label: 'Pequeño', preview: 'text-xs' },
    { value: 'medium', label: 'Mediano', preview: 'text-sm' },
    { value: 'large', label: 'Grande', preview: 'text-base' }
  ]

  const responseStyleOptions = [
    { value: 'concise', label: 'Conciso', description: 'Respuestas breves y directas' },
    { value: 'balanced', label: 'Equilibrado', description: 'Balance entre detalle y brevedad' },
    { value: 'detailed', label: 'Detallado', description: 'Respuestas completas y explicativas' }
  ]

  return (
    <Card className={cn('w-full max-w-2xl mx-auto', className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <CardTitle>Configuración del Chat</CardTitle>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefaults}
          >
            Restablecer
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              Cerrar
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Appearance Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold flex items-center">
            <Palette className="h-4 w-4 mr-2" />
            Apariencia
          </h3>

          {/* Theme */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Tema</Label>
              <p className="text-xs text-muted-foreground">
                Elige el tema de colores
              </p>
            </div>
            <Select
              value={settings.theme}
              onValueChange={(value: 'light' | 'dark' | 'auto') => updateSetting('theme', value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center">
                    <Sun className="h-4 w-4 mr-2" />
                    Claro
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center">
                    <Moon className="h-4 w-4 mr-2" />
                    Oscuro
                  </div>
                </SelectItem>
                <SelectItem value="auto">
                  <div className="flex items-center">
                    <Monitor className="h-4 w-4 mr-2" />
                    Auto
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Font Size */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Tamaño de texto</Label>
              <p className="text-xs text-muted-foreground">
                Ajusta el tamaño de los mensajes
              </p>
            </div>
            <Select
              value={settings.fontSize}
              onValueChange={(value: 'small' | 'medium' | 'large') => updateSetting('fontSize', value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fontSizeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className={option.preview}>{option.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Visual Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="compact-mode">Modo compacto</Label>
              <Switch
                id="compact-mode"
                checked={settings.compactMode}
                onCheckedChange={(checked) => updateSetting('compactMode', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-timestamps">Mostrar marcas de tiempo</Label>
              <Switch
                id="show-timestamps"
                checked={settings.showTimestamps}
                onCheckedChange={(checked) => updateSetting('showTimestamps', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-avatars">Mostrar avatares</Label>
              <Switch
                id="show-avatars"
                checked={settings.showAvatars}
                onCheckedChange={(checked) => updateSetting('showAvatars', checked)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Behavior Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold flex items-center">
            <Monitor className="h-4 w-4 mr-2" />
            Comportamiento
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-scroll">Desplazamiento automático</Label>
                <p className="text-xs text-muted-foreground">
                  Desplazar automáticamente a nuevos mensajes
                </p>
              </div>
              <Switch
                id="auto-scroll"
                checked={settings.autoScroll}
                onCheckedChange={(checked) => updateSetting('autoScroll', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enable-sounds">Sonidos</Label>
                <p className="text-xs text-muted-foreground">
                  Reproducir sonidos para notificaciones
                </p>
              </div>
              <Switch
                id="enable-sounds"
                checked={settings.enableSounds}
                onCheckedChange={(checked) => updateSetting('enableSounds', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enable-notifications">Notificaciones</Label>
                <p className="text-xs text-muted-foreground">
                  Mostrar notificaciones del navegador
                </p>
              </div>
              <Switch
                id="enable-notifications"
                checked={settings.enableNotifications}
                onCheckedChange={(checked) => updateSetting('enableNotifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="send-on-enter">Enter para enviar</Label>
                <p className="text-xs text-muted-foreground">
                  Enviar mensaje al presionar Enter
                </p>
              </div>
              <Switch
                id="send-on-enter"
                checked={settings.sendOnEnter}
                onCheckedChange={(checked) => updateSetting('sendOnEnter', checked)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* AI Preferences Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Preferencias de IA</h3>

          {/* Response Style */}
          <div className="space-y-2">
            <Label>Estilo de respuesta</Label>
            <div className="grid grid-cols-1 gap-2">
              {responseStyleOptions.map((option) => (
                <div
                  key={option.value}
                  className={cn(
                    'p-3 rounded-lg border cursor-pointer transition-colors',
                    settings.responseStyle === option.value
                      ? 'border-primary bg-primary/10'
                      : 'border-muted hover:border-muted-foreground/50'
                  )}
                  onClick={() => updateSetting('responseStyle', option.value as any)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{option.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {option.description}
                      </div>
                    </div>
                    {settings.responseStyle === option.value && (
                      <Badge variant="default" className="text-xs">
                        Activo
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Creatividad ({Math.round(settings.temperature * 100)}%)</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateSetting('temperature', 0.7)}
                className="text-xs"
              >
                Por defecto
              </Button>
            </div>
            <Slider
              value={[settings.temperature]}
              onValueChange={([value]) => updateSetting('temperature', value)}
              max={1}
              min={0}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Más conservador</span>
              <span>Más creativo</span>
            </div>
          </div>

          {/* Context Memory */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="context-memory">Memoria contextual</Label>
              <p className="text-xs text-muted-foreground">
                Recordar contexto de conversaciones previas
              </p>
            </div>
            <Switch
              id="context-memory"
              checked={settings.contextMemory}
              onCheckedChange={(checked) => updateSetting('contextMemory', checked)}
            />
          </div>
        </div>

        <Separator />

        {/* Privacy Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Privacidad y Datos</h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="save-conversations">Guardar conversaciones</Label>
                <p className="text-xs text-muted-foreground">
                  Almacenar historial de chat localmente
                </p>
              </div>
              <Switch
                id="save-conversations"
                checked={settings.saveConversations}
                onCheckedChange={(checked) => updateSetting('saveConversations', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="share-usage-data">Compartir datos de uso</Label>
                <p className="text-xs text-muted-foreground">
                  Ayudar a mejorar el servicio (anónimo)
                </p>
              </div>
              <Switch
                id="share-usage-data"
                checked={settings.shareUsageData}
                onCheckedChange={(checked) => updateSetting('shareUsageData', checked)}
              />
            </div>
          </div>
        </div>

        {/* Settings Info */}
        <div className="mt-6 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            La configuración se guarda automáticamente y se aplica a todas las sesiones de chat.
            Puedes restablecer la configuración a los valores por defecto en cualquier momento.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export { DEFAULT_SETTINGS }
export type { ChatSettingsProps }