import type React from "react"
import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { StackProvider, StackTheme } from '@stackframe/stack'
import { AuthProvider } from "@/lib/hooks/use-auth"
import { Suspense } from "react"
import "./globals.css"

export const dynamic = 'force-dynamic'

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "OKR Manager - Sistema de Gestión de Objetivos",
  description: "Sistema completo de gestión de OKRs con roles específicos y análisis inteligente",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">
        <StackProvider>
          <Suspense fallback={<div>Loading...</div>}>
            <AuthProvider>{children}</AuthProvider>
          </Suspense>
        </StackProvider>
        <Analytics />
      </body>
    </html>
  )
}
