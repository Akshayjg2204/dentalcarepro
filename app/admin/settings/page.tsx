"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { getClinicSettings, updateClinicSettings, type ClinicSettings } from "@/lib/clinic-settings"
import { toast } from "sonner"
import {
  ArrowLeft,
  Save,
  Building2,
  Phone,
  Mail,
  MapPin,
  Clock,
  Globe,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import Link from "next/link"

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [settings, setSettings] = useState<ClinicSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
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
    }
  }

  const fetchSettings = async () => {
    try {
      const settingsData = await getClinicSettings()
      setSettings(settingsData)
    } catch (error: any) {
      console.error("Failed to fetch settings:", error)
      toast.error("Failed to fetch clinic settings")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!settings) return

    setIsSaving(true)
    try {
      await updateClinicSettings(settings)
      toast.success("Clinic settings updated successfully!")
    } catch (error: any) {
      console.error("Failed to update settings:", error)
      toast.error("Failed to update clinic settings")
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (field: keyof ClinicSettings, value: string) => {
    if (!settings) return
    setSettings({ ...settings, [field]: value })
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

  if (!settings) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Failed to load clinic settings</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
            <Link href="/admin" className="flex items-center text-gray-600 hover:text-gray-800 flex-shrink-0">
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline ml-2">Back to Admin</span>
            </Link>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-800 truncate">Clinic Settings</h1>
              <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                Manage your clinic information and preferences
              </p>
            </div>
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0"
            size="sm"
          >
            {isSaving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Save className="w-4 h-4 mr-1 sm:mr-2" />
            )}
            <span className="hidden sm:inline">Save Changes</span>
            <span className="sm:hidden">Save</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <div className="flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-lg sm:text-xl">Basic Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clinic_name" className="text-sm font-medium">
                  Clinic Name *
                </Label>
                <Input
                  id="clinic_name"
                  value={settings.clinic_name || ""}
                  onChange={(e) => handleInputChange("clinic_name", e.target.value)}
                  placeholder="Enter clinic name"
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  Phone Number *
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="phone"
                    value={settings.phone || ""}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="Enter phone number"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address *
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="email"
                    type="email"
                    value={settings.email || ""}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="Enter email address"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="website" className="text-sm font-medium">
                  Website
                </Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="website"
                    value={settings.website || ""}
                    onChange={(e) => handleInputChange("website", e.target.value)}
                    placeholder="https://www.example.com"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="text-sm font-medium">
                Address *
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                <Textarea
                  id="address"
                  value={settings.address || ""}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Enter complete address"
                  className="pl-10 min-h-[80px] resize-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="google_maps_link" className="text-sm font-medium">
                Google Maps Link
              </Label>
              <Input
                id="google_maps_link"
                value={settings.google_maps_link || ""}
                onChange={(e) => handleInputChange("google_maps_link", e.target.value)}
                placeholder="https://maps.google.com/..."
                className="w-full"
              />
              <p className="text-xs text-gray-500">Paste the Google Maps link for your clinic location</p>
            </div>
          </CardContent>
        </Card>

        {/* Operating Hours */}
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-green-600" />
              <CardTitle className="text-lg sm:text-xl">Operating Hours</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="opening_time" className="text-sm font-medium">
                  Opening Time
                </Label>
                <Input
                  id="opening_time"
                  type="time"
                  value={settings.opening_time || ""}
                  onChange={(e) => handleInputChange("opening_time", e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="closing_time" className="text-sm font-medium">
                  Closing Time
                </Label>
                <Input
                  id="closing_time"
                  type="time"
                  value={settings.closing_time || ""}
                  onChange={(e) => handleInputChange("closing_time", e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="working_days" className="text-sm font-medium">
                Working Days
              </Label>
              <Input
                id="working_days"
                value={settings.working_days || ""}
                onChange={(e) => handleInputChange("working_days", e.target.value)}
                placeholder="e.g., Monday - Saturday"
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* Social Media */}
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <div className="flex items-center space-x-2">
              <Globe className="w-5 h-5 text-purple-600" />
              <CardTitle className="text-lg sm:text-xl">Social Media</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="facebook_url" className="text-sm font-medium">
                  Facebook
                </Label>
                <div className="relative">
                  <Facebook className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="facebook_url"
                    value={settings.facebook_url || ""}
                    onChange={(e) => handleInputChange("facebook_url", e.target.value)}
                    placeholder="https://facebook.com/..."
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram_url" className="text-sm font-medium">
                  Instagram
                </Label>
                <div className="relative">
                  <Instagram className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="instagram_url"
                    value={settings.instagram_url || ""}
                    onChange={(e) => handleInputChange("instagram_url", e.target.value)}
                    placeholder="https://instagram.com/..."
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="twitter_url" className="text-sm font-medium">
                  Twitter
                </Label>
                <div className="relative">
                  <Twitter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="twitter_url"
                    value={settings.twitter_url || ""}
                    onChange={(e) => handleInputChange("twitter_url", e.target.value)}
                    placeholder="https://twitter.com/..."
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin_url" className="text-sm font-medium">
                  LinkedIn
                </Label>
                <div className="relative">
                  <Linkedin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="linkedin_url"
                    value={settings.linkedin_url || ""}
                    onChange={(e) => handleInputChange("linkedin_url", e.target.value)}
                    placeholder="https://linkedin.com/..."
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-lg sm:text-xl">Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Clinic Description
              </Label>
              <Textarea
                id="description"
                value={settings.description || ""}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Brief description about your clinic, services, and specialties..."
                className="min-h-[100px] resize-none"
              />
              <p className="text-xs text-gray-500">This description will be displayed on your clinic's public pages</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergency_contact" className="text-sm font-medium">
                Emergency Contact
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="emergency_contact"
                  value={settings.emergency_contact || ""}
                  onChange={(e) => handleInputChange("emergency_contact", e.target.value)}
                  placeholder="Emergency contact number"
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button - Mobile */}
        <div className="block sm:hidden">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
