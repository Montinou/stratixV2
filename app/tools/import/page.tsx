import { stackServerApp } from '@/stack/server';
import { ImportServiceV2 as ImportService } from '@/lib/services/import-service-v2';
import { ImportClient } from '@/components/import/import-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Upload,
  CheckCircle,
  Database,
  FileText,
} from 'lucide-react';

export default async function ImportPage() {
  const user = await stackServerApp.getUser({ or: 'redirect' });

  // Get user permissions
  const userPermissions = await ImportService.getUserPermissions(user.id);

  if (!userPermissions) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-red-500">User profile not found</p>
        </div>
      </div>
    );
  }

  const { role: userRole, company_id: companyId } = userPermissions as {
    role: string;
    company_id: string;
  };

  // Restrict access to employees
  if (userRole === 'empleado') {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Acceso Restringido</h1>
          <p className="text-muted-foreground">
            Los empleados no tienen permisos para importar datos.
            Solo usuarios Corporativos y Gerentes pueden realizar importaciones masivas.
          </p>
        </div>
      </div>
    );
  }

  // Get import history for statistics
  const history = await ImportService.getImportHistory(companyId, 100);

  // Calculate statistics
  const totalImports = history.length;
  const successfulImports = history.filter((h: any) => h.status === 'completed').length;
  const totalRecords = history.reduce((acc: number, h: any) => acc + (h.total_records || 0), 0);
  const successfulRecords = history.reduce((acc: number, h: any) => acc + (h.successful_records || 0), 0);
  const successRate = totalRecords > 0 ? Math.round((successfulRecords / totalRecords) * 100) : 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Importar Datos
          </h1>
          <p className="text-muted-foreground">
            Carga masiva de objetivos, iniciativas, actividades
            {userRole === 'corporativo' && ' y usuarios'}
          </p>
        </div>
      </div>

      {/* Statistics Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Importaciones</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalImports}</div>
            <p className="text-xs text-muted-foreground">
              Histórico total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exitosas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successfulImports}</div>
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
            <div className="text-2xl font-bold">{totalRecords.toLocaleString()}</div>
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
            <div className="text-2xl font-bold">{successRate}%</div>
            <p className="text-xs text-muted-foreground">
              Registros exitosos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Import Client Component */}
      <ImportClient
        userRole={userRole}
        userDepartment={userDepartment}
      />

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Instrucciones de Importación</CardTitle>
          <p className="text-sm text-muted-foreground">
            Guía para preparar tus archivos correctamente
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-3">Preparación del Archivo</h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Usa la primera fila para los encabezados de columna</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Evita celdas combinadas o formatos especiales</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Formato de fechas: DD/MM/AAAA</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Números sin formato de moneda o símbolos</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Texto sin caracteres especiales innecesarios</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-3">Validaciones y Permisos</h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Campos obligatorios deben estar completos</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Referencias válidas (IDs o títulos existentes)</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Emails con formato correcto para responsables</span>
                </li>
                {userRole === 'gerente' && (
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span className="text-amber-600">
                      Como gerente, solo puedes importar datos de tu departamento ({userDepartment})
                    </span>
                  </li>
                )}
                {userRole === 'corporativo' && (
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span className="text-green-600">
                      Como usuario corporativo, puedes importar datos de toda la empresa
                    </span>
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h4 className="font-medium text-amber-900 mb-2">Notas Importantes</h4>
            <ul className="text-sm text-amber-800 space-y-1">
              <li className="flex items-start">
                <span className="mr-2">⚠️</span>
                <span>Los estados válidos son: no_iniciado, en_progreso, completo</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">⚠️</span>
                <span>El progreso debe ser un número entre 0 y 100</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">⚠️</span>
                <span>Las fechas deben ser futuras o actuales, no pasadas</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">⚠️</span>
                <span>La importación de usuarios actualmente no está disponible (requiere integración con Stack Auth)</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}