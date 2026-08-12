import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Marmara Lider Kimya',
  description: 'Yönetim Sistemi',
  manifest: '/manifest.json',
  themeColor: '#0e1720',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MLK" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: 'Inter, system-ui, sans-serif', margin: 0 }}>
        {children}
      </body>
    </html>
  )
}
