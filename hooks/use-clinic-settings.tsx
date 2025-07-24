"use client"

import { useState, useEffect } from "react"
import { getClinicSettings, type ClinicSettings } from "@/lib/clinic-settings"

export function useClinicSettings() {
  const [settings, setSettings] = useState<ClinicSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const clinicSettings = await getClinicSettings()
      setSettings(clinicSettings)
    } catch (err: any) {
      console.error("Error fetching clinic settings:", err)
      setError(err.message || "Failed to load clinic settings")
    } finally {
      setIsLoading(false)
    }
  }

  const refreshSettings = () => {
    fetchSettings()
  }

  return {
    settings,
    isLoading,
    error,
    refreshSettings,
  }
}
