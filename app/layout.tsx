import type { Metadata } from 'next';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ClientStackProvider } from '@/components/providers/stack-provider';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { appConfig } from '@/config/app';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: appConfig.metadata.companyName,
  description: appConfig.metadata.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ClientStackProvider>
          <SidebarProvider defaultOpen={false}>{children}</SidebarProvider>
        </ClientStackProvider>
      </body>
    </html>
  );
}
