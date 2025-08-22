"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Calendar,
  Users,
  Clock,
  Phone,
  FileText,
  Plus,
  AlertTriangle,
  User,
  TrendingUp,
  CheckCircle,
} from "lucide-react"
import { getAllAppointments } from "@/lib/appointments"
import { getLeadsByAssignedUser, type Lead } from "@/lib/leads"
import { toast } from "sonner"
import { PatientManagementSection } from "@/components/patient-management"
import { LeadsManagement } from "@/components/leads-management"
import { DueAppointmentsModal } from "@/components/due-appointments-modal"
import { EmergencyAppointmentModal } from "@/components/emergency-appointment-modal"

interface StaffDashboardProps {
  user: any
}

interface DashboardStats {
  totalLeads: number
  newLeads: number
  convertedLeads: number
  assignedAppointments: number
}

export function StaffDashboard({ user }: StaffDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    newLeads: 0,
    convertedLeads: 0,
    assignedAppointments: 0,
  })
  const [recentLeads, setRecentLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dueAppointmentsModal, setDueAppointmentsModal] = useState(false)
  const [walkInModal, setWalkInModal] = useState(false)

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData()
    }
  }, [user?.id])

  const fetchDashboardData = async () => {
    if (!user?.id) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)

      // Fetch staff's assigned leads
      const leads = await getLeadsByAssignedUser(user.id)

      // Fetch all appointments to count staff assignments
      const allAppointments = await getAllAppointments()
      const assignedAppointments = allAppointments.filter((apt) => apt.staff_id === user.id)

      // Calculate stats
      const totalLeads = leads.length
      const newLeads = leads.filter((lead) => lead.status === "new").length
      const convertedLeads = leads.filter((lead) => lead.status === "converted").length

      setStats({
        totalLeads,
        newLeads,
        convertedLeads,
        assignedAppointments: assignedAppointments.length,
      })

      // Set recent leads (last 5)
      setRecentLeads(leads.slice(0, 5))
    } catch (error: any) {
      console.error("Failed to fetch dashboard data:", error)
      toast.error("Failed to load dashboard data")
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800"
      case "contacted":
        return "bg-yellow-100 text-yellow-800"
      case "qualified":
        return "bg-purple-100 text-purple-800"
      case "converted":
        return "bg-green-100 text-green-800"
      case "not_interested":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user data...</p>
        </div>
      </div>
    )
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Welcome back, {user.first_name}</h1>
        </div>

        {/* Stats Cards - Above Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Leads</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.totalLeads}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">New Leads</p>
                  <p className="text-2xl sm:text-3xl font-bold text-yellow-600">{stats.newLeads}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Converted</p>
                  <p className="text-2xl sm:text-3xl font-bold text-green-600">{stats.convertedLeads}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Appointments</p>
                  <p className="text-2xl sm:text-3xl font-bold text-purple-600">{stats.assignedAppointments}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="appointments" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Appointments</span>
              {stats.assignedAppointments > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                  {stats.assignedAppointments}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="patients" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Patient Management</span>
            </TabsTrigger>
            <TabsTrigger value="leads" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Leads</span>
              {stats.newLeads > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                  {stats.newLeads}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Actions */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <p className="text-sm text-gray-600">Common tasks for staff</p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Button
                        variant="outline"
                        className="h-20 flex flex-col items-center justify-center space-y-2 bg-transparent hover:bg-orange-50 border-orange-200"
                        onClick={() => setDueAppointmentsModal(true)}
                      >
                        <AlertTriangle className="w-6 h-6 text-orange-600" />
                        <div className="text-center">
                          <div className="font-medium text-orange-900">Due Assignments</div>
                          <div className="text-xs text-orange-600">Appointments not completed today</div>
                        </div>
                      </Button>

                      <Button
                        variant="outline"
                        className="h-20 flex flex-col items-center justify-center space-y-2 bg-transparent hover:bg-green-50 border-green-200"
                        onClick={() => setActiveTab("patients")}
                      >
                        <FileText className="w-6 h-6 text-green-600" />
                        <div className="text-center">
                          <div className="font-medium text-green-900">Patient Records</div>
                          <div className="text-xs text-green-600">View patient information</div>
                        </div>
                      </Button>

                      <Button
                        variant="outline"
                        className="h-20 flex flex-col items-center justify-center space-y-2 bg-transparent hover:bg-red-50 border-red-200"
                        onClick={() => setWalkInModal(true)}
                      >
                        <Plus className="w-6 h-6 text-red-600" />
                        <div className="text-center">
                          <div className="font-medium text-red-900">Walk-in</div>
                          <div className="text-xs text-red-600">Schedule urgent care</div>
                        </div>
                      </Button>

                      <Button
                        variant="outline"
                        className="h-20 flex flex-col items-center justify-center space-y-2 bg-transparent hover:bg-blue-50 border-blue-200"
                        onClick={() => setActiveTab("leads")}
                      >
                        <Phone className="w-6 h-6 text-blue-600" />
                        <div className="text-center">
                          <div className="font-medium text-blue-900">Call Patients</div>
                          <div className="text-xs text-blue-600">Follow up with leads</div>
                        </div>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Leads */}
              <div>
                <Card>
                  <CardHeader>
                    <div className="flex items-center space-x-2">
                      <User className="w-5 h-5" />
                      <CardTitle>Recent Leads</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {recentLeads.length === 0 ? (
                      <div className="text-center py-6">
                        <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No leads assigned</h3>
                        <p className="text-gray-600 text-sm">Your assigned leads will appear here</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {recentLeads.map((lead) => (
                          <div key={lead.id} className="border rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm truncate">
                                  {lead.first_name} {lead.last_name}
                                </h4>
                                <p className="text-xs text-gray-600 mt-1">{lead.email}</p>
                                {lead.phone && <p className="text-xs text-gray-500 mt-1">{lead.phone}</p>}
                                <div className="flex items-center text-xs text-gray-500 mt-1">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {formatDate(lead.created_at)}
                                </div>
                              </div>
                              <Badge className={`${getStatusColor(lead.status)} text-xs ml-2`}>
                                {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Appointments Tab */}
          <TabsContent value="appointments">
            <Card>
              <CardHeader>
                <CardTitle>My Appointments</CardTitle>
                <p className="text-sm text-gray-600">Appointments assigned to you</p>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Appointments Management</h3>
                  <p className="text-gray-600 mb-4">
                    View and manage your assigned appointments. This feature will show all appointments where you are
                    the assigned staff member.
                  </p>
                  <Button onClick={() => setActiveTab("overview")} className="bg-blue-600 hover:bg-blue-700">
                    Back to Overview
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Patient Management Tab */}
          <TabsContent value="patients">
            <PatientManagementSection currentUserId={user.id} currentUserRole={user.role} />
          </TabsContent>

          {/* Leads Tab */}
          <TabsContent value="leads">
            <LeadsManagement currentUserId={user.id} currentUserRole={user.role} />
          </TabsContent>
        </Tabs>

        {/* Modals */}
        <DueAppointmentsModal
          isOpen={dueAppointmentsModal}
          onClose={() => setDueAppointmentsModal(false)}
          currentUserId={user.id}
          currentUserRole={user.role}
        />

        <EmergencyAppointmentModal
          isOpen={walkInModal}
          onClose={() => setWalkInModal(false)}
          onAppointmentCreated={fetchDashboardData}
        />
      </div>
    </div>
  )
}
