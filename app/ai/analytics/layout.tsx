import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Analytics & Insights - StratixV2',
  description: 'Dashboard inteligente con análisis predictivo, recomendaciones personalizadas y monitoreo en tiempo real para OKRs',
  keywords: ['analytics', 'AI', 'insights', 'predictive analysis', 'OKR', 'dashboard', 'real-time monitoring'],
}

export default function AIAnalyticsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}