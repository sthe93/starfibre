import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Star Fibre Billing & Account Management',
  description: 'Customer and manager portals for Starfibre Communications in Protea Glen.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA">
      <body>{children}</body>
    </html>
  )
}
