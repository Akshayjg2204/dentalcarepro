"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getCurrentUser, signOut } from "@/lib/auth"
import { getClinicSettings, updateClinicSettings } from "@/lib/clinic-settings"
import { toast } from "sonner"
import { ArrowLeft, LogOut, Save, Building, Phone, Globe, Clock } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { TimeSlotManager } from "@/components/time-slot-manager"

const defaultWorkingHours = {
  monday: { open: "09:00", close: "18:00", closed: false },
  tuesday: { open: "09:00", close: "18:00", closed: false },
  wednesday: { open: "09:00", close: "18:00", closed: false },
  thursday: { open: "09:00", close: "18:00", closed: false },
  friday: { open: "09:00", close: "18:00", closed: false },
  saturday: { open: "09:00", close: "14:00", closed: false },
  sunday: { open: "09:00", close: "18:00", closed: true },
}

const defaultSettings = {
  clinic_name: "",
  description: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  postal_code: "",
  google_maps_link: "",
  website: "",
  facebook: "",
  instagram: "",
  twitter: "",
  working_hours: defaultWorkingHours,
}

export default function AdminSettings() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState(defaultSettings)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
    fetchSettings()
  }, [])

  const checkAuth = async () => {
    try {
      const user = await getCurrentUser()
      if (!user || user.profile.role !== "admin") {
        toast.error("Access denied. Admin privileges required.")
        router.push("/login")
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

  const fetchSettings = async () => {
    try {
      const clinicSettings = await getClinicSettings()
      if (clinicSettings) {
        // Ensure working_hours exists and has all required properties
        const workingHours = clinicSettings.working_hours || {}
        const mergedWorkingHours = { ...defaultWorkingHours }

        // Merge existing working hours with defaults
        Object.keys(defaultWorkingHours).forEach((day) => {
          if (workingHours[day]) {
            mergedWorkingHours[day] = {
              ...defaultWorkingHours[day],
              ...workingHours[day],
            }
          }
        })

        setSettings({
          ...defaultSettings,
          ...clinicSettings,
          working_hours: mergedWorkingHours,
        })
      }
    } catch (error: any) {
      console.error("Failed to fetch settings:", error)
      toast.error("Failed to load settings")
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

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateClinicSettings(settings)
      toast.success("Settings saved successfully!")
    } catch (error: any) {
      toast.error("Failed to save settings: " + (error.message || "Unknown error"))
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleWorkingHoursChange = (day: string, field: string, value: string | boolean) => {
    setSettings((prev) => ({
      ...prev,
      working_hours: {
        ...prev.working_hours,
        [day]: {
          ...prev.working_hours[day],
          [field]: value,
        },
      },
    }))
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/admin" className="flex items-center text-gray-600 hover:text-gray-800">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Clinic Settings</h1>
              <p className="text-gray-600">Configure your clinic information</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
              {isSaving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
            <Button variant="outline" onClick={handleSignOut} className="bg-transparent">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="basic" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic" className="flex items-center space-x-2">
                <Building className="w-4 h-4" />
                <span>Basic Info</span>
              </TabsTrigger>
              <TabsTrigger value="contact" className="flex items-center space-x-2">
                <Phone className="w-4 h-4" />
                <span>Contact</span>
              </TabsTrigger>
              <TabsTrigger value="availability" className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Availability</span>
              </TabsTrigger>
              <TabsTrigger value="social" className="flex items-center space-x-2">
                <Globe className="w-4 h-4" />
                <span>Social & Web</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building className="w-5 h-5 mr-2" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="clinic_name">Clinic Name</Label>
                      <Input
                        id="clinic_name"
                        value={settings.clinic_name || ""}
                        onChange={(e) => handleInputChange("clinic_name", e.target.value)}
                        placeholder="Enter clinic name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Tagline/Description</Label>
                      <Input
                        id="description"
                        value={settings.description || ""}
                        onChange={(e) => handleInputChange("description", e.target.value)}
                        placeholder="e.g., Best Dentist in KoparKhairane"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contact">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Phone className="w-5 h-5 mr-2" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={settings.phone || ""}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        placeholder="+91 1234567890"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={settings.email || ""}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        placeholder="info@clinic.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Street Address</Label>
                    <Textarea
                      id="address"
                      value={settings.address || ""}
                      onChange={(e) => handleInputChange("address", e.target.value)}
                      placeholder="Enter full street address"
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={settings.city || ""}
                        onChange={(e) => handleInputChange("city", e.target.value)}
                        placeholder="City"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={settings.state || ""}
                        onChange={(e) => handleInputChange("state", e.target.value)}
                        placeholder="State"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postal_code">Postal Code</Label>
                      <Input
                        id="postal_code"
                        value={settings.postal_code || ""}
                        onChange={(e) => handleInputChange("postal_code", e.target.value)}
                        placeholder="400709"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="google_maps_link">Google Maps Link</Label>
                    <Input
                      id="google_maps_link"
                      value={settings.google_maps_link || ""}
                      onChange={(e) => handleInputChange("google_maps_link", e.target.value)}
                      placeholder="https://maps.google.com/?q=Your+Clinic+Location"
                    />
                    <p className="text-sm text-gray-500">
                      Paste the Google Maps link for your clinic location. This will be used for the "Get Directions"
                      button.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="availability">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Working Hours & Availability
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Working Hours</h3>
                      <div className="space-y-4">
                        {Object.entries(settings.working_hours || defaultWorkingHours).map(([day, hours]) => (
                          <div key={day} className="flex items-center space-x-4">
                            <div className="w-24">
                              <Label className="capitalize">{day}</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={!hours.closed}
                                onChange={(e) => handleWorkingHoursChange(day, "closed", !e.target.checked)}
                                className="rounded"
                              />
                              <Label className="text-sm">Open</Label>
                            </div>
                            {!hours.closed && (
                              <>
                                <Input
                                  type="time"
                                  value={hours.open || "09:00"}
                                  onChange={(e) => handleWorkingHoursChange(day, "open", e.target.value)}
                                  className="w-32"
                                />
                                <span className="text-gray-500">to</span>
                                <Input
                                  type="time"
                                  value={hours.close || "18:00"}
                                  onChange={(e) => handleWorkingHoursChange(day, "close", e.target.value)}
                                  className="w-32"
                                />
                              </>
                            )}
                            {hours.closed && <span className="text-gray-500 italic">Closed</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium mb-4">Time Slot Management</h3>
                      <TimeSlotManager />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="social">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Globe className="w-5 h-5 mr-2" />
                    Social Media & Website
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="website">Website URL</Label>
                    <Input
                      id="website"
                      value={settings.website || ""}
                      onChange={(e) => handleInputChange("website", e.target.value)}
                      placeholder="https://www.yourclinic.com"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="facebook">Facebook</Label>
                      <Input
                        id="facebook"
                        value={settings.facebook || ""}
                        onChange={(e) => handleInputChange("facebook", e.target.value)}
                        placeholder="https://facebook.com/yourclinic"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="instagram">Instagram</Label>
                      <Input
                        id="instagram"
                        value={settings.instagram || ""}
                        onChange={(e) => handleInputChange("instagram", e.target.value)}
                        placeholder="https://instagram.com/yourclinic"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="twitter">Twitter</Label>
                      <Input
                        id="twitter"
                        value={settings.twitter || ""}
                        onChange={(e) => handleInputChange("twitter", e.target.value)}
                        placeholder="https://twitter.com/yourclinic"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
