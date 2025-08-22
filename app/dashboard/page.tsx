"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { PatientDashboard } from "@/components/patient-dashboard"
import { DoctorDashboard } from "@/components/doctor-dashboard"
import { StaffDashboard } from "@/components/staff-dashboard"

export default function DashboardPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    if (loading || redirecting) return

    if (!user || !profile) {
      console.log("No user or profile, redirecting to login")
      setRedirecting(true)
      router.push("/login")
      return
    }

    console.log("Dashboard: User role is", profile.role)

    // Redirect based on role
    if (profile.role === "admin") {
      console.log("Admin user detected, redirecting to admin dashboard")
      setRedirecting(true)
      router.push("/admin")
      return
    }

    // For other roles, stay on this page
    console.log(`${profile.role} user staying on dashboard`)
  }, [user, profile, loading, router, redirecting])

  if (loading || redirecting) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !profile) {
    return null // Will redirect to login
  }

  // Render appropriate dashboard based on role
  switch (profile.role) {
    case "patient":
      return <PatientDashboard />
    case "doctor":
      return <DoctorDashboard user={profile} />
    case "staff":
      return <StaffDashboard user={profile} />
    case "admin":
      // This shouldn't happen due to redirect above, but just in case
      return null
    default:
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Unknown Role</h1>
            <p className="text-gray-600">Your account role is not recognized. Please contact support.</p>
          </div>
        </div>
      )
  }
}
