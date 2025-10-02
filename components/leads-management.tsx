"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Search, UserPlus, Phone, Calendar, Stethoscope, Users, UserCheck, Trash2, UserX } from "lucide-react"
import { getAllLeads, updateLeadStatus, deleteLead, type Lead } from "@/lib/leads"
import { CreateLeadModal } from "@/components/create-lead-modal"
import { CreateUserModal } from "@/components/create-user-modal"

interface LeadsManagementProps {
  currentUserId: string
  currentUserRole: string
}

export function LeadsManagement({ currentUserId, currentUserRole }: LeadsManagementProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [convertModalLead, setConvertModalLead] = useState<Lead | null>(null)
  const [processingLeads, setProcessingLeads] = useState<Set<string>>(new Set())
  const [deletingLeads, setDeletingLeads] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchLeads()
  }, [])

  useEffect(() => {
    filterLeads()
  }, [leads, searchTerm, statusFilter])

  const fetchLeads = async () => {
    setIsLoading(true)
    try {
      const leadsData = await getAllLeads()
      setLeads(leadsData)
    } catch (error: any) {
      console.error("Failed to fetch leads:", error)
      toast.error("Failed to fetch leads")
    } finally {
      setIsLoading(false)
    }
  }

  const filterLeads = () => {
    let filtered = leads

    if (searchTerm) {
      filtered = filtered.filter(
        (lead) =>
          lead.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lead.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lead.phone.includes(searchTerm) ||
          lead.consultation_reason.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((lead) => lead.status === statusFilter)
    }

    setFilteredLeads(filtered)
  }

  const handleStatusUpdate = async (leadId: string, newStatus: Lead["status"]) => {
    setProcessingLeads((prev) => new Set(prev).add(leadId))
    try {
      await updateLeadStatus(leadId, newStatus)
      toast.success(`Lead marked as ${newStatus.replace("_", " ")}`)
      fetchLeads()
    } catch (error: any) {
      toast.error("Failed to update lead status: " + (error.message || "Unknown error"))
    } finally {
      setProcessingLeads((prev) => {
        const newSet = new Set(prev)
        newSet.delete(leadId)
        return newSet
      })
    }
  }

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm("Are you sure you want to delete this lead? This action cannot be undone.")) {
      return
    }

    setDeletingLeads((prev) => new Set(prev).add(leadId))
    try {
      await deleteLead(leadId)
      toast.success("Lead deleted successfully!")
      fetchLeads()
    } catch (error: any) {
      toast.error("Failed to delete lead: " + (error.message || "Unknown error"))
    } finally {
      setDeletingLeads((prev) => {
        const newSet = new Set(prev)
        newSet.delete(leadId)
        return newSet
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ongoing":
        return "bg-blue-100 text-blue-800"
      case "converted":
        return "bg-green-100 text-green-800"
      case "not_converted":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case "ongoing":
        return "Ongoing"
      case "converted":
        return "Converted"
      case "not_converted":
        return "Not Interested"
      default:
        return status
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const renderActionButtons = (lead: Lead) => {
    const isProcessing = processingLeads.has(lead.id)

    if (lead.status === "ongoing") {
      return (
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={() => setConvertModalLead(lead)}
            disabled={isProcessing}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <UserCheck className="w-4 h-4 mr-1" />
            Convert to Patient
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleStatusUpdate(lead.id, "not_converted")}
            disabled={isProcessing}
            className="border-gray-600 text-gray-600 hover:bg-gray-50"
          >
            <UserX className="w-4 h-4 mr-1" />
            Not Interested
          </Button>
        </div>
      )
    }

    // For converted and not_converted, just show the status badge
    return <Badge className={getStatusColor(lead.status)}>{getStatusDisplayName(lead.status)}</Badge>
  }

  const handleUserCreatedFromLead = async () => {
    if (convertModalLead) {
      // Update the lead status to converted
      try {
        await updateLeadStatus(convertModalLead.id, "converted")
        toast.success("Lead successfully converted to patient!")
        fetchLeads()
      } catch (error: any) {
        toast.error("User created but failed to update lead status: " + (error.message || "Unknown error"))
      }
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading leads...</p>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <UserPlus className="w-5 h-5" />
            <CardTitle>Leads Management</CardTitle>
            <Badge variant="secondary">{leads.length} total</Badge>
          </div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm"
            size="sm"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Create Lead
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ongoing">Ongoing</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="not_converted">Not Interested</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Leads List */}
        {filteredLeads.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <UserPlus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No leads found</h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== "all"
                ? "Try adjusting your search or filter criteria"
                : "Create your first lead to get started"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLeads
              .sort((a, b) => {
                const statusOrder = { ongoing: 0, converted: 1, not_converted: 2 }
                const aOrder = statusOrder[a.status] ?? 3
                const bOrder = statusOrder[b.status] ?? 3
                if (aOrder !== bOrder) return aOrder - bOrder
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              })
              .map((lead) => (
                <div key={lead.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                  {/* Desktop Layout */}
                  <div className="hidden sm:grid sm:grid-cols-12 sm:gap-4 sm:items-start">
                    {/* Lead Info - 4 columns */}
                    <div className="col-span-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-base">
                            {lead.first_name} {lead.last_name}
                          </h3>
                          <div className="flex items-center text-sm text-gray-600 mt-1">
                            <Phone className="w-3 h-3 mr-1" />
                            <span>{lead.phone}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 p-2 rounded text-xs mt-2">
                        <p className="font-medium text-gray-700">Reason:</p>
                        <p className="text-gray-600 line-clamp-2">{lead.consultation_reason}</p>
                      </div>
                    </div>

                    {/* Assignments - 3 columns */}
                    <div className="col-span-3 space-y-2">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Doctor</p>
                        {lead.assigned_doctor_user ? (
                          <div className="flex items-center text-sm text-green-600">
                            <Stethoscope className="w-4 h-4 mr-1" />
                            <span className="truncate">
                              Dr. {lead.assigned_doctor_user.first_name} {lead.assigned_doctor_user.last_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Not assigned</span>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Staff</p>
                        {lead.assigned_staff_user ? (
                          <div className="flex items-center text-sm text-blue-600">
                            <Users className="w-4 h-4 mr-1" />
                            <span className="truncate">
                              {lead.assigned_staff_user.first_name} {lead.assigned_staff_user.last_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Not assigned</span>
                        )}
                      </div>
                    </div>

                    {/* Consultation Date - 2 columns */}
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 mb-1">Consultation</p>
                      {lead.consultation_date ? (
                        <div className="text-sm">
                          <div className="flex items-center text-gray-700">
                            <Calendar className="w-3 h-3 mr-1" />
                            <span>{formatDate(lead.consultation_date)}</span>
                          </div>
                          {lead.consultation_time && (
                            <p className="text-gray-600 ml-4">{formatTime(lead.consultation_time)}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">Not scheduled</span>
                      )}
                    </div>

                    {/* Actions - 3 columns */}
                    <div className="col-span-3 flex flex-col items-end gap-2">
                      {renderActionButtons(lead)}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteLead(lead.id)}
                        disabled={deletingLeads.has(lead.id)}
                        className="border-red-600 text-red-600 hover:bg-red-50 w-full"
                      >
                        {deletingLeads.has(lead.id) ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Mobile Layout */}
                  <div className="block sm:hidden space-y-3">
                    {/* Header with name and status */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base truncate">
                          {lead.first_name} {lead.last_name}
                        </h3>
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <Phone className="w-3 h-3 mr-1" />
                          <span>{lead.phone}</span>
                        </div>
                      </div>
                      <Badge className={`${getStatusColor(lead.status)} text-xs ml-2 flex-shrink-0`}>
                        {getStatusDisplayName(lead.status)}
                      </Badge>
                    </div>

                    {/* Consultation Info */}
                    <div className="bg-gray-50 p-2 rounded text-xs">
                      <p className="font-medium text-gray-700 mb-1">Consultation Reason:</p>
                      <p className="text-gray-600">{lead.consultation_reason}</p>
                    </div>

                    {/* Assignments */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Doctor:</span>
                        {lead.assigned_doctor_user ? (
                          <div className="flex items-center text-green-600 text-xs">
                            <Stethoscope className="w-3 h-3 mr-1" />
                            <span>
                              Dr. {lead.assigned_doctor_user.first_name} {lead.assigned_doctor_user.last_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">Not assigned</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Staff:</span>
                        {lead.assigned_staff_user ? (
                          <div className="flex items-center text-blue-600 text-xs">
                            <Users className="w-3 h-3 mr-1" />
                            <span>
                              {lead.assigned_staff_user.first_name} {lead.assigned_staff_user.last_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">Not assigned</span>
                        )}
                      </div>
                    </div>

                    {/* Date */}
                    {lead.consultation_date && (
                      <div className="flex items-center text-xs text-gray-600">
                        <Calendar className="w-3 h-3 mr-1" />
                        <span>{formatDate(lead.consultation_date)}</span>
                        {lead.consultation_time && <span className="ml-1">{formatTime(lead.consultation_time)}</span>}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                      {renderActionButtons(lead)}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteLead(lead.id)}
                        disabled={deletingLeads.has(lead.id)}
                        className="border-red-600 text-red-600 hover:bg-red-50 text-xs"
                      >
                        {deletingLeads.has(lead.id) ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                        ) : (
                          <>
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete Lead
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>

      <CreateLeadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onLeadCreated={fetchLeads}
      />
      <CreateUserModal
        isOpen={!!convertModalLead}
        onClose={() => setConvertModalLead(null)}
        onUserCreated={handleUserCreatedFromLead}
        currentUserRole={currentUserRole as "admin" | "doctor" | "staff" | "patient"}
        initialFirstName={convertModalLead?.first_name || ""}
        initialLastName={convertModalLead?.last_name || ""}
      />
    </Card>
  )
}
