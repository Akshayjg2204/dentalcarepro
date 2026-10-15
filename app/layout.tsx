import type React from "react"
import type { Metadata } from "next"
import ClientLayout from "./client"
import "./globals.css"

export const metadata: Metadata = {
  title: "DentalCare Pro — Dental Clinic Management System",
  description:
    "Comprehensive dental clinic management system with appointment scheduling, patient records, staff management, and billing workflows.",
  authors: [{ name: "Akshay Gaikwad", url: "https://stream-line.dev/" }],
  keywords: [
    "dental clinic",
    "clinic management",
    "healthcare SaaS",
    "appointment booking",
    "patient management",
    "Next.js",
    "Supabase",
    "PostgreSQL",
    "Tailwind CSS",
  ],
  viewport: "width=device-width, initial-scale=1",
  robots: "index, follow",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ClientLayout>{children}</ClientLayout>
}