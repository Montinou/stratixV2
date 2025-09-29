import {
  Home,
  Hammer,
  Target,
  Rocket,
  Activity,
  BarChart3,
  Brain,
  Upload,
  Settings
} from 'lucide-react';

export const appConfig = {
  metadata: {
    companyName: 'StratixV2',
    internalToolName: 'Sistema OKR',
    description: 'Gestión de Objetivos y Resultados Clave',
    logo: '/stratix-logo.png',
  },
  navigation: {
    tools: [
      {
        title: 'Dashboard',
        icon: Home,
        url: '/tools/okr',
      },
      {
        title: 'Objetivos',
        icon: Target,
        url: '/tools/objectives',
      },
      {
        title: 'Iniciativas',
        icon: Rocket,
        url: '/tools/initiatives',
      },
      {
        title: 'Actividades',
        icon: Activity,
        url: '/tools/activities',
      },
      {
        title: 'Analytics',
        icon: BarChart3,
        url: '/tools/analytics',
      },
      {
        title: 'IA Insights',
        icon: Brain,
        url: '/tools/insights',
      },
      {
        title: 'Importar',
        icon: Upload,
        url: '/tools/import',
      },
      {
        title: 'Admin',
        icon: Settings,
        url: '/tools/admin',
      },
    ],
  }
} as const;

export type AppConfig = typeof appConfig; 