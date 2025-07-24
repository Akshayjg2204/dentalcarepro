"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getCurrentUser, signOut } from "@/lib/auth"
import { PatientDashboard } from "@/components/patient-dashboard"
import { DoctorDashboard } from "@/components/doctor-dashboard"
import { StaffDashboard } from "@/components/staff-dashboard"
import { Button } from "@/components/ui/button"
import { ArrowLeft, LogOut } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push("/login")
        return
      }

      // Redirect admin to admin dashboard
      if (user.profile.role === "admin") {
        router.push("/admin")
        return
      }

      setCurrentUser(user)
    } catch (error: any) {
      console.error("Auth check error:", error)
      toast.error("Authentication failed")
      router.push("/login")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push("/login")
    } catch (error: any) {
      toast.error("Failed to sign out")
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const renderDashboard = () => {
    switch (currentUser?.profile?.role) {
      case "patient":
        return <PatientDashboard user={currentUser} />
      case "doctor":
        return <DoctorDashboard user={currentUser} />
      case "staff":
        return <StaffDashboard user={currentUser} />
      default:
        return <div>Invalid role</div>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      

      {/* Main Content */}
      <div className="p-6">{renderDashboard()}</div>
    </div>
  )
}
