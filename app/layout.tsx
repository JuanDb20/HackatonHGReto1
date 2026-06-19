import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LitigIA — Automatización de Contestaciones | Hurtado Gandini',
  description:
    'Sistema de IA para generación automática de borradores de contestación de demanda conforme al Código General del Proceso colombiano.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  )
}
