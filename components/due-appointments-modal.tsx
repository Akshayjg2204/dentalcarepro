"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Calendar, Clock, User, Stethoscope, Users, UserCheck, CreditCard } from 'lucide-react'
import type { Appointment } from "@/lib/appointments"
import type { Payment } from "@/lib/payments"

interface DueAppointmentsModalProps {
  isOpen: boolean
  onClose: () => void
  appointments: Appointment[]
  payments: Payment[]
  onCompleteAppointment: (appointment: Appointment) => void
  onAssignAppointment: (appointment: Appointment) => void
}

export function DueAppointmentsModal({
  isOpen,
  onClose,
  appointments,
  payments,
  onCompleteAppointment,
  onAssignAppointment,
}: DueAppointmentsModalProps) {
  const [dueAppointments, setDueAppointments] = useState<Appointment[]>([])

  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split("T")[0]
      const due = appointments.filter(
        (apt) => apt.status === "approved" && apt.appointment_date <= today
      )
      setDueAppointments(due)
    }
  }, [isOpen, appointments])

  const getAppointmentPayment = (appointmentId: string) => {
    return payments.find((payment) => payment.appointment_id === appointmentId)
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "fully_paid":
        return "bg-green-100 text-green-800"
      case "partial_paid":
        return "bg-yellow-100 text-yellow-800"
      case "not_paid":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDate = (date: string) => {
    const appointmentDate = new Date(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    appointmentDate.setHours(0, 0, 0, 0)
    
    const diffTime = today.getTime() - appointmentDate.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return "Today"
    } else if (diffDays === 1) {
      return "Yesterday"
    } else if (diffDays > 1) {
      return `${diffDays} days overdue`
    } else {
      return new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    }
  }

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const isOverdue = (date: string) => {
    const appointmentDate = new Date(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    appointmentDate.setHours(0, 0, 0, 0)
    return appointmentDate < today
  }

  const isToday = (date: string) => {
    const appointmentDate = new Date(date)
    const today = new Date()
    return appointmentDate.toDateString() === today.toDateString()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-orange-600">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Due Appointments ({dueAppointments.length})
          </DialogTitle>
          <p className="text-sm text-gray-600">
            Appointments that are due today or overdue and need attention
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {dueAppointments.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <Calendar className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-green-800">All caught up!</h3>
              <p className="text-gray-600">No due appointments at the moment.</p>
            </div>
          ) : (
            dueAppointments
              .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime())
              .map((appointment) => {
                const payment = getAppointmentPayment(appointment.id)
                const overdueStatus = isOverdue(appointment.appointment_date)
                const todayStatus = isToday(appointment.appointment_date)
                
                return (
                  <div
                    key={appointment.id}
                    className={`p-4 border rounded-lg ${
                      overdueStatus
                        ? "border-red-200 bg-red-50"
                        : todayStatus
                        ? "border-orange-200 bg-orange-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    {/* Mobile Layout */}
                    <div className="block sm:hidden space-y-3">
                      {/* Header with appointment type and urgency */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-base truncate">{appointment.appointment_type}</h3>
                          <p className="text-sm text-gray-600 truncate">
                            {appointment.patient?.first_name} {appointment.patient?.last_name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{appointment.patient?.email}</p>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          <Badge
                            className={`text-xs ${
                              overdueStatus
                                ? "bg-red-100 text-red-800"
                                : todayStatus
                                ? "bg-orange-100 text-orange-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {formatDate(appointment.appointment_date)}
                          </Badge>
                          <div className="flex items-center text-xs text-gray-600">
                            <Clock className="w-3 h-3 mr-1" />
                            <span>{formatTime(appointment.appointment_time)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Assignment Status */}
                      <div className="bg-white p-2 rounded border text-xs">
                        <p className="text-gray-500 mb-1">Assignment Status:</p>
                        {appointment.doctor && (
                          <div className="flex items-center text-green-600 mb-1">
                            <Stethoscope className="w-3 h-3 mr-1" />
                            <span>Dr. {appointment.doctor.first_name} {appointment.doctor.last_name}</span>
                          </div>
                        )}
                        {appointment.staff && (
                          <div className="flex items-center text-blue-600 mb-1">
                            <Users className="w-3 h-3 mr-1" />
                            <span>{appointment.staff.first_name} {appointment.staff.last_name}</span>
                          </div>
                        )}
                        {!appointment.doctor && !appointment.staff && (
                          <div className="flex items-center text-gray-500">
                            <UserCheck className="w-3 h-3 mr-1" />
                            <span>Not assigned</span>
                          </div>
                        )}
                      </div>

                      {/* Payment Status */}
                      {payment && (
                        <div className="bg-white p-2 rounded border text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-gray-500">Payment Status:</span>
                            <Badge className={`${getPaymentStatusColor(payment.payment_status)} text-xs`}>
                              {payment.payment_status === "fully_paid" && "Fully Paid"}
                              {payment.payment_status === "partial_paid" && "Partial Paid"}
                              {payment.payment_status === "not_paid" && "Not Paid"}
                            </Badge>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => onCompleteAppointment(appointment)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 h-7"
                        >
                          Complete
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onAssignAppointment(appointment)}
                          className="border-purple-600 text-purple-600 hover:bg-purple-50 text-xs px-2 py-1 h-7"
                        >
                          <UserCheck className="w-3 h-3 mr-1" />
                          Assign
                        </Button>
                        {payment && payment.payment_status === "partial_paid" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onCompleteAppointment(appointment)}
                            className="border-yellow-600 text-yellow-600 hover:bg-yellow-50 text-xs px-2 py-1 h-7"
                          >
                            <CreditCard className="w-3 h-3 mr-1" />
                            Update Payment
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden sm:flex sm:items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <h3 className="font-medium text-base">{appointment.appointment_type}</h3>
                            <p className="text-sm text-gray-600">
                              {appointment.patient?.first_name} {appointment.patient?.last_name}
                            </p>
                            <p className="text-sm text-gray-500">{appointment.patient?.email}</p>
                          </div>
                          <div className="text-center">
                            <Badge
                              className={`text-sm ${
                                overdueStatus
                                  ? "bg-red-100 text-red-800"
                                  : todayStatus
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {formatDate(appointment.appointment_date)}
                            </Badge>
                            <div className="flex items-center justify-center text-sm text-gray-600 mt-1">
                              <Clock className="w-4 h-4 mr-1" />
                              <span>{formatTime(appointment.appointment_time)}</span>
                            </div>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500 mb-1">Assigned to</p>
                            {appointment.doctor && (
                              <div className="flex items-center text-sm text-green-600 mb-1">
                                <Stethoscope className="w-4 h-4 mr-1" />
                                <span>Dr. {appointment.doctor.first_name} {appointment.doctor.last_name}</span>
                              </div>
                            )}
                            {appointment.staff && (
                              <div className="flex items-center text-sm text-blue-600 mb-1">
                                <Users className="w-4 h-4 mr-1" />
                                <span>{appointment.staff.first_name} {appointment.staff.last_name}</span>
                              </div>
                            )}
                            {!appointment.doctor && !appointment.staff && (
                              <div className="flex items-center text-sm text-gray-500">
                                <UserCheck className="w-4 h-4 mr-1" />
                                <span>Not assigned</span>
                              </div>
                            )}
                          </div>
                          {payment && (
                            <div className="text-center">
                              <p className="text-xs text-gray-500 mb-1">Payment</p>
                              <Badge className={`text-xs ${getPaymentStatusColor(payment.payment_status)}`}>
                                {payment.payment_status === "fully_paid" && "Fully Paid"}
                                {payment.payment_status === "partial_paid" && "Partial Paid"}
                                {payment.payment_status === "not_paid" && "Not Paid"}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => onCompleteAppointment(appointment)}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Complete
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onAssignAppointment(appointment)}
                          className="border-purple-600 text-purple-600 hover:bg-purple-50"
                        >
                          <UserCheck className="w-4 h-4 mr-1" />
                          Assign
                        </Button>
                        {payment && payment.payment_status === "partial_paid" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onCompleteAppointment(appointment)}
                            className="border-yellow-600 text-yellow-600 hover:bg-yellow-50"
                          >
                            <CreditCard className="w-4 h-4 mr-1" />
                            Update Payment
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
