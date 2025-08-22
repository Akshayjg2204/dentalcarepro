import type React from "react"
import type { Metadata } from "next"
import ClientLayout from "./client"

export const metadata: Metadata = {
  title: "DentalCare - Modern Dental Clinic Management",
  description: "Complete dental clinic management system with appointment scheduling, patient records, and billing",
  viewport: "width=device-width, initial-scale=1",
  robots: "index, follow",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ClientLayout>{children}</ClientLayout>
}


import './globals.css'