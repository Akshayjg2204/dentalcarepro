"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Search, UserPlus, Phone, Calendar, Stethoscope, Users, UserCheck, Trash2, Edit, Eye, UserX } from 'lucide-react'
import { getAllLeads, updateLeadStatus, deleteLead, type Lead } from "@/lib/leads"
import { CreateLeadModal } from "@/components/create-lead-modal"
import { ConvertLeadModal } from "@/components/convert-lead-modal"

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
          lead.consultation_reason.toLowerCase().includes(searchTerm.toLowerCase())
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
      toast.success(`Lead status updated to ${newStatus}`)
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
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "in_consultation":
        return "bg-blue-100 text-blue-800"
      case "completed":
        return "bg-green-100 text-green-800"
      case "converted":
        return "bg-purple-100 text-purple-800"
      case "not_interested":
        return "bg-gray-100 text-gray-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
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
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_consultation">In Consultation</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="not_interested">Not Interested</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
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
                const statusOrder = { pending: 0, in_consultation: 1, completed: 2, converted: 3, not_interested: 4, cancelled: 5 }
                const aOrder = statusOrder[a.status] ?? 6
                const bOrder = statusOrder[b.status] ?? 6
                if (aOrder !== bOrder) return aOrder - bOrder
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              })
              .map((lead) => (
                <div key={lead.id} className="p-3 sm:p-4 border rounded-lg">
                  {/* Mobile Layout */}
                  <div className="block sm:hidden space-y-3">
                    {/* Header with name and status */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-base truncate">
                          {lead.first_name} {lead.last_name}
                        </h3>
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <Phone className="w-3 h-3 mr-1" />
                          <span>{lead.phone}</span>
                        </div>
                      </div>
                      <Badge className={`${getStatusColor(lead.status)} text-xs ml-2 flex-shrink-0`}>
                        {lead.status.replace('_', ' ').charAt(0).toUpperCase() + lead.status.replace('_', ' ').slice(1)}
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
                            <span>Dr. {lead.assigned_doctor_user.first_name} {lead.assigned_doctor_user.last_name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-500 text-xs">Not assigned</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Staff:</span>
                        {lead.assigned_staff_user ? (
                          <div className="flex items-center text-blue-600 text-xs">
                            <Users className="w-3 h-3 mr-1" />
                            <span>{lead.assigned_staff_user.first_name} {lead.assigned_staff_user.last_name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-500 text-xs">Not assigned</span>
                        )}
                      </div>
                    </div>

                    {/* Date */}
                    <div className="text-right">
                      {lead.consultation_date && (
                        <div className="flex items-center justify-end text-xs text-gray-600">
                          <Calendar className="w-3 h-3 mr-1" />
                          <span>{formatDate(lead.consultation_date)}</span>
                          {lead.consultation_time && <span className="ml-1">{formatTime(lead.consultation_time)}</span>}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      {lead.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(lead.id, "in_consultation")}
                          disabled={processingLeads.has(lead.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 h-7"
                        >
                          Start Consultation
                        </Button>
                      )}
                      {lead.status === "in_consultation" && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(lead.id, "completed")}
                          disabled={processingLeads.has(lead.id)}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 h-7"
                        >
                          Complete
                        </Button>
                      )}
                      {lead.status === "completed" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => setConvertModalLead(lead)}
                            className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1 h-7"
                          >
                            <UserCheck className="w-3 h-3 mr-1" />
                            Convert
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusUpdate(lead.id, "not_interested")}
                            disabled={processingLeads.has(lead.id)}
                            className="border-gray-600 text-gray-600 hover:bg-gray-50 text-xs px-3 py-1 h-7"
                          >
                            <UserX className="w-3 h-3 mr-1" />
                            Not Interested
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteLead(lead.id)}
                        disabled={deletingLeads.has(lead.id)}
                        className="border-red-600 text-red-600 hover:bg-red-50 text-xs px-2 py-1 h-7"
                      >
                        {deletingLeads.has(lead.id) ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden sm:flex sm:items-center justify-between">
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                        <div className="flex-1">
                          <h3 className="font-medium text-base">
                            {lead.first_name} {lead.last_name}
                          </h3>
                          <div className="flex items-center text-sm text-gray-600 mt-1">
                            <Phone className="w-4 h-4 mr-1" />
                            <span>{lead.phone}</span>
                          </div>
                        </div>
                        <div className="text-left sm:text-center">
                          <p className="text-xs text-gray-500 mb-1">Doctor</p>
                          {lead.assigned_doctor_user ? (
                            <div className="flex items-center text-sm text-green-600">
                              <Stethoscope className="w-4 h-4 mr-1" />
                              <span>Dr. {lead.assigned_doctor_user.first_name} {lead.assigned_doctor_user.last_name}</span>
                            </div>
                          ) : (
                            <span className="text-gray-500 text-sm">Not assigned</span>
                          )}
                        </div>
                        <div className="text-left sm:text-center">
                          <p className="text-xs text-gray-500 mb-1">Staff</p>
                          {lead.assigned_staff_user ? (
                            <div className="flex items-center text-sm text-blue-600">
                              <Users className="w-4 h-4 mr-1" />
                              <span>{lead.assigned_staff_user.first_name} {lead.assigned_staff_user.last_name}</span>
                            </div>
                          ) : (
                            <span className="text-gray-500 text-sm">Not assigned</span>
                          )}
                        </div>
                        <div className="text-left sm:text-center">
                          <p className="text-xs text-gray-500 mb-1">Consultation</p>
                          {lead.consultation_date ? (
                            <div className="text-sm">
                              <p className="font-medium">{formatDate(lead.consultation_date)}</p>
                              {lead.consultation_time && (
                                <p className="text-gray-600">{formatTime(lead.consultation_time)}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500 text-sm">Not scheduled</span>
                          )}
                        </div>
                        <div className="max-w-full sm:max-w-xs">
                          <p className="text-sm text-gray-600">
                            <strong>Reason:</strong> {lead.consultation_reason}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-row sm:flex-col items-center gap-2 sm:gap-3">
                      {lead.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(lead.id, "in_consultation")}
                          disabled={processingLeads.has(lead.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Start Consultation
                        </Button>
                      )}
                      {lead.status === "in_consultation" && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(lead.id, "completed")}
                          disabled={processingLeads.has(lead.id)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Complete
                        </Button>
                      )}
                      {lead.status === "completed" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => setConvertModalLead(lead)}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            <UserCheck className="w-4 h-4 mr-1" />
                            Convert
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusUpdate(lead.id, "not_interested")}
                            disabled={processingLeads.has(lead.id)}
                            className="border-gray-600 text-gray-600 hover:bg-gray-50"
                          >
                            <UserX className="w-4 h-4 mr-1" />
                            Not Interested
                          </Button>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteLead(lead.id)}
                          disabled={deletingLeads.has(lead.id)}
                          className="border-red-600 text-red-600 hover:bg-red-50"
                        >
                          {deletingLeads.has(lead.id) ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                        <Badge className={getStatusColor(lead.status)}>
                          {lead.status.replace('_', ' ').charAt(0).toUpperCase() + lead.status.replace('_', ' ').slice(1)}
                        </Badge>
                      </div>
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
      <ConvertLeadModal
        isOpen={!!convertModalLead}
        onClose={() => setConvertModalLead(null)}
        lead={convertModalLead}
        onLeadConverted={() => {
          fetchLeads()
          setConvertModalLead(null)
        }}
      />
    </Card>
  )
}
