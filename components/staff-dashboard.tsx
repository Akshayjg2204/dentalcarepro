"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Phone, FileText, Users, UserPlus } from "lucide-react"
import { getStaffStats } from "@/lib/staff-stats"
import { toast } from "sonner"

interface StaffDashboardProps {
  user: any
}

export function StaffDashboard({ user }: StaffDashboardProps) {
  const [stats, setStats] = useState({
    todayAppointments: 0,
    pendingCalls: 0,
    newPatients: 0,
    tasks: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const staffStats = await getStaffStats()
      setStats(staffStats)
    } catch (error: any) {
      console.error("Error fetching staff stats:", error)
      toast.error("Failed to load dashboard stats")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Staff Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user.profile.first_name}!</p>
        </div>
      </div>

      {/* Staff Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Today's Appointments</p>
                <p className="text-3xl font-bold">{isLoading ? "..." : stats.todayAppointments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Phone className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending Calls</p>
                <p className="text-3xl font-bold">{isLoading ? "..." : stats.pendingCalls}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <UserPlus className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">New Patients</p>
                <p className="text-3xl font-bold">{isLoading ? "..." : stats.newPatients}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <FileText className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Tasks</p>
                <p className="text-3xl font-bold">{isLoading ? "..." : stats.tasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button className="h-20 flex-col space-y-2">
              <Calendar className="w-6 h-6" />
              <span>Schedule Appointment</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col space-y-2 bg-transparent">
              <Phone className="w-6 h-6" />
              <span>Call Patients</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col space-y-2 bg-transparent">
              <Users className="w-6 h-6" />
              <span>Patient Registration</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col space-y-2 bg-transparent">
              <FileText className="w-6 h-6" />
              <span>Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
