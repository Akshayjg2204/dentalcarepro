"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getCurrentUser, signOut } from "@/lib/auth"
import { PatientDashboard } from "@/components/patient-dashboard"
import { DoctorDashboard } from "@/components/doctor-dashboard"
import { StaffDashboard } from "@/components/staff-dashboard"
import { Button } from "@/components/ui/button"
import { ArrowLeft, LogOut } from 'lucide-react'
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
      toast.success("Signed out successfully")
      router.push("/")
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
      <div className="bg-white border-b px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <Link href="/" className="flex items-center text-gray-600 hover:text-gray-800">
              <ArrowLeft className="w-5 h-5" />
              <span className="sr-only">Back Home</span>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                {currentUser?.profile?.role === "patient" && "Patient Dashboard"}
                {currentUser?.profile?.role === "doctor" && "Doctor Dashboard"}
                {currentUser?.profile?.role === "staff" && "Staff Dashboard"}
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                Welcome back, {currentUser?.profile?.first_name}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="flex items-center bg-transparent p-2 sm:px-3 sm:py-2"
            size="sm"
          >
            <LogOut className="w-4 h-4" />
            <span className="sr-only sm:not-sr-only sm:ml-2">Sign Out</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">{renderDashboard()}</div>
    </div>
  )
}
