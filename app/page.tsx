"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Phone, MapPin, Clock, Stethoscope } from 'lucide-react'
import Link from "next/link"
import { getClinicSettings } from "@/lib/clinic-settings"
import { getCurrentUser } from "@/lib/auth"

interface ClinicSettings {
  clinic_name: string
  description: string
  phone: string
  email: string
  address: string
  city: string
  state: string
  postal_code: string
  google_maps_link?: string
  working_hours: {
    [key: string]: { open: string; close: string; closed: boolean }
  }
}

export default function HomePage() {
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    Promise.all([fetchClinicSettings(), checkAuthentication()])
  }, [])

  const checkAuthentication = async () => {
    try {
      const user = await getCurrentUser()
      setCurrentUser(user)
    } catch (error) {
      console.error("Auth check error:", error)
      // Don't show error toast on home page, just set user to null
      setCurrentUser(null)
    } finally {
      setIsCheckingAuth(false)
    }
  }

  const fetchClinicSettings = async () => {
    try {
      const settings = await getClinicSettings()
      setClinicSettings(settings)
    } catch (error) {
      console.error("Failed to fetch clinic settings:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCallNow = () => {
    if (clinicSettings?.phone) {
      window.open(`tel:${clinicSettings.phone}`, "_self")
    }
  }

  const handleGetDirections = () => {
    if (clinicSettings?.google_maps_link) {
      window.open(clinicSettings.google_maps_link, "_blank")
    } else if (clinicSettings?.address) {
      const address = `${clinicSettings.address}, ${clinicSettings.city}, ${clinicSettings.state} ${clinicSettings.postal_code}`
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
      window.open(googleMapsUrl, "_blank")
    }
  }

  const formatWorkingHours = () => {
    if (!clinicSettings?.working_hours) return "Contact for hours"

    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    const groupedHours: { [key: string]: string[] } = {}

    days.forEach((day, index) => {
      const hours = clinicSettings.working_hours[day]
      if (hours && !hours.closed) {
        const timeRange = `${hours.open} - ${hours.close}`
        if (!groupedHours[timeRange]) {
          groupedHours[timeRange] = []
        }
        groupedHours[timeRange].push(dayNames[index])
      }
    })

    const formatted = Object.entries(groupedHours).map(([timeRange, days]) => {
      if (days.length === 1) {
        return `${days[0]}: ${timeRange}`
      } else if (days.length > 1) {
        const consecutive = areConsecutive(days, dayNames)
        if (consecutive) {
          return `${days[0]}-${days[days.length - 1]}: ${timeRange}`
        } else {
          return `${days.join(", ")}: ${timeRange}`
        }
      }
      return ""
    })

    // Add closed days
    const closedDays = days
      .filter((day, index) => {
        const hours = clinicSettings.working_hours[day]
        return !hours || hours.closed
      })
      .map((day, index) => dayNames[days.indexOf(day)])

    if (closedDays.length > 0) {
      formatted.push(`${closedDays.join(", ")}: Closed`)
    }

    return formatted.join("\n")
  }

  const areConsecutive = (selectedDays: string[], allDays: string[]) => {
    const indices = selectedDays.map((day) => allDays.indexOf(day)).sort((a, b) => a - b)
    for (let i = 1; i < indices.length; i++) {
      if (indices[i] !== indices[i - 1] + 1) {
        return false
      }
    }
    return true
  }

  const getDashboardLink = () => {
    if (!currentUser) return "/login"
    
    // Redirect based on role
    if (currentUser.profile.role === "admin") {
      return "/admin"
    } else {
      return "/dashboard"
    }
  }

  const getButtonText = () => {
    if (isCheckingAuth) return "Loading..."
    if (!currentUser) return "Login"
    
    // Show role-specific text
    switch (currentUser.profile.role) {
      case "admin":
        return "Admin Dashboard"
      case "doctor":
        return "Doctor Dashboard"
      case "staff":
        return "Staff Dashboard"
      case "patient":
        return "Patient Dashboard"
      default:
        return "Dashboard"
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white">
        <div className="container mx-auto px-4 py-16 text-center">
          {/* Stethoscope Icon */}
          <div className="mb-8">
            <div className="w-16 h-16 mx-auto bg-white/20 rounded-full flex items-center justify-center">
              <Stethoscope className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Clinic Name */}
          <h2 className="text-lg font-medium mb-2 opacity-90">
            {clinicSettings?.clinic_name?.toUpperCase() || "SHREE MULTISPECIALITY DENTAL CLINIC"}
            {clinicSettings?.description && ` (${clinicSettings.description})`}
          </h2>

          {/* Main Heading */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            Your Smile is Our <span className="text-yellow-400">Priority</span>
          </h1>

          {/* Subtext */}
          <p className="text-xl mb-8 opacity-90">{clinicSettings?.description || "Best Dentist in KoparKhairane"}</p>

          {/* Dynamic Login/Dashboard Button */}
          <Link href={getDashboardLink()}>
            <Button
              size="lg"
              className="bg-white text-blue-700 hover:bg-gray-100 font-semibold px-8 py-3 rounded-lg text-lg"
              disabled={isCheckingAuth}
            >
              {getButtonText()}
            </Button>
          </Link>

          {/* Show user info if logged in */}
          {currentUser && !isCheckingAuth && (
            <p className="mt-4 text-sm opacity-75">
              Welcome back, {currentUser.profile.first_name} {currentUser.profile.last_name}
            </p>
          )}
        </div>
      </div>

      {/* Contact Cards Section */}
      <div className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Call Us Card */}
            <Card className="text-center p-8 hover:shadow-lg transition-shadow">
              <CardContent className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                  <Phone className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">Call Us</h3>
                <p className="text-gray-600">Ready to help you</p>
                <p className="text-lg font-medium text-gray-800">{clinicSettings?.phone || "+91 7263025220"}</p>
                <Button
                  onClick={handleCallNow}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call Now
                </Button>
              </CardContent>
            </Card>

            {/* Visit Us Card */}
            <Card className="text-center p-8 hover:shadow-lg transition-shadow">
              <CardContent className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">Visit Us</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>{clinicSettings?.address || "Shop No. 10, SS 2-A, near Annasaheb"}</p>
                  <p>{clinicSettings?.address ? "" : "Patil Garden, Sector 8, Kopar"}</p>
                  <p>
                    {clinicSettings?.city || "Khairane"}, {clinicSettings?.state || "Navi Mumbai"},{" "}
                    {clinicSettings?.state || "Maharashtra"}
                  </p>
                  <p>{clinicSettings?.postal_code || "400709"}</p>
                </div>
                <Button
                  onClick={handleGetDirections}
                  variant="outline"
                  className="border-green-600 text-green-600 hover:bg-green-50 px-6 py-2 rounded-lg font-medium bg-transparent"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Get Directions
                </Button>
              </CardContent>
            </Card>

            {/* Working Hours Card */}
            <Card className="text-center p-8 hover:shadow-lg transition-shadow">
              <CardContent className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-yellow-100 rounded-full flex items-center justify-center">
                  <Clock className="w-8 h-8 text-yellow-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">Working Hours</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  {clinicSettings?.working_hours ? (
                    <pre className="whitespace-pre-line font-sans">{formatWorkingHours()}</pre>
                  ) : (
                    <>
                      <p>Mon-Fri: 10:00 AM - 10:00 PM</p>
                      <p>Sat: 10:00 AM - 6:00 PM</p>
                      <p>Sun: Closed</p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
