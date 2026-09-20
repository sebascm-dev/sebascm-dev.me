import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ViewTransition } from 'react'
import { Toaster } from 'sonner'
import './globals.css'
import { about } from '@/data/about'
import ScrollToTop from '@/components/ui/ScrollToTop'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://sebascm.dev'),
  title: `${about.name} — ${about.role}`,
  description: about.tagline,
  openGraph: {
    title: `${about.name} — ${about.role}`,
    description: about.tagline,
    url: 'https://sebascm.dev',
    siteName: 'sebascm.dev',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${about.name} — ${about.role}`,
    description: about.tagline,
    images: ['/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]" suppressHydrationWarning>
        <ViewTransition>{children}</ViewTransition>
        <ScrollToTop />
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  )
}
