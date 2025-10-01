import UserTableController from '@/components/admin/UserTable/UserTableController';
import AccessListController from '@/components/admin/accessLists/AccessListController';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, Users, Shield, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  return (
    <div className="mx-auto mt-8 w-[90%] space-y-12">
      {/* Quick Actions */}
      <div>
        <h1 className="mb-6 text-3xl font-bold text-gray-800 dark:text-gray-200">
          Administración
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link href="/tools/admin/company-settings">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Configuración de Empresa
                </CardTitle>
                <CardDescription>
                  Personaliza el logo y colores de tu plataforma
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-muted-foreground">
                  Gestionar apariencia
                  <ArrowRight className="h-4 w-4 ml-1" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card className="opacity-75">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Gestión de Usuarios
              </CardTitle>
              <CardDescription>
                Administra usuarios y permisos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Ver sección abajo
              </div>
            </CardContent>
          </Card>

          <Card className="opacity-75">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Control de Acceso
              </CardTitle>
              <CardDescription>
                Administra listas de acceso
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Ver sección abajo
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h1 className="mb-6 text-3xl font-bold text-gray-800 dark:text-gray-200">
          Access Management
        </h1>
        <AccessListController />
      </div>

      <div>
        <h1 className="mb-6 text-3xl font-bold text-gray-800 dark:text-gray-200">
          User Management
        </h1>
        <UserTableController />
      </div>
    </div>
  );
}
