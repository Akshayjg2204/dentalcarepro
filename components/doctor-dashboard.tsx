"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Users, FileText, Clock, Stethoscope } from "lucide-react"
import { getDoctorStats } from "@/lib/doctor-stats"
import { toast } from "sonner"

interface DoctorDashboardProps {
  user: any
}

export function DoctorDashboard({ user }: DoctorDashboardProps) {
  const [stats, setStats] = useState({
    todayAppointments: 0,
    totalPatients: 0,
    monthlyCompleted: 0,
    pendingReviews: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [user.profile.id])

  const fetchStats = async () => {
    try {
      const doctorStats = await getDoctorStats(user.profile.id)
      setStats(doctorStats)
    } catch (error: any) {
      console.error("Error fetching doctor stats:", error)
      toast.error("Failed to load dashboard stats")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Doctor Dashboard</h1>
          <p className="text-gray-600">Welcome back, Dr. {user.profile.first_name}!</p>
        </div>
      </div>

      {/* Doctor Stats Cards */}
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
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Patients</p>
                <p className="text-3xl font-bold">{isLoading ? "..." : stats.totalPatients}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Stethoscope className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Monthly Completed</p>
                <p className="text-3xl font-bold">{isLoading ? "..." : stats.monthlyCompleted}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending Reviews</p>
                <p className="text-3xl font-bold">{isLoading ? "..." : stats.pendingReviews}</p>
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
              <span>View Schedule</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col space-y-2 bg-transparent">
              <Users className="w-6 h-6" />
              <span>Patient List</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col space-y-2 bg-transparent">
              <FileText className="w-6 h-6" />
              <span>Medical Records</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col space-y-2 bg-transparent">
              <Clock className="w-6 h-6" />
              <span>Treatment Plans</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
