import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Family Tree',
  description: 'Know your family connections',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-black">{children}</body>
    </html>
  )
}
