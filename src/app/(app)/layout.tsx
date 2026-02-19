import type { ReactNode } from 'react'

export default function AppLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="it">
      <body style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif', margin: 0 }}>
        {children}
      </body>
    </html>
  )
}
