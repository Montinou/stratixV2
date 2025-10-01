'use client';

import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import Image from 'next/image';
import { appConfig } from '@/config/app';
import { useCompanyTheme } from '@/components/providers/company-theme-provider';
import { Building } from 'lucide-react';

export function SideNavHeader() {
  const { theme, loading } = useCompanyTheme();

  // Use company logo if available, otherwise default
  const logoSrc = theme?.logoUrl || appConfig.metadata.logo;
  const showDefaultIcon = !theme?.logoUrl && appConfig.metadata.logo === '/stratix-logo.png';

  return (
    <SidebarHeader className="border-sidebar-border border-r border-b">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg">
              {loading ? (
                <div className="w-6 h-6 bg-muted animate-pulse rounded" />
              ) : showDefaultIcon ? (
                <Building className="h-6 w-6" />
              ) : theme?.logoUrl ? (
                <img
                  src={theme.logoUrl}
                  alt="Company logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <Image
                  src={logoSrc}
                  alt="Company logo"
                  width={24}
                  height={24}
                />
              )}
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{appConfig.metadata.companyName}</span>
              <span className="text-muted-foreground truncate text-xs">{appConfig.metadata.internalToolName}</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  );
}
