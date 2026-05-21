import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Medisystem — Control de Asistencia',
  description: 'Sistema de control de asistencia GPS para el personal de Medisystem',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        <div className="bg-gradient-radial" aria-hidden="true" />
        {children}
      </body>
    </html>
  )
}
