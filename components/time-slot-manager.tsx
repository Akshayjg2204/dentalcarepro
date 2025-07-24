"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Clock, X, Plus, Trash2 } from "lucide-react"
import { blockTimeSlots, unblockTimeSlot, getAvailableTimeSlots } from "@/lib/clinic-availability"
import { getTimeSlots, type TimeSlot } from "@/lib/appointments"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface TimeSlotManagerProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: string
  onUpdated: () => void
}

export function TimeSlotManager({ isOpen, onClose, selectedDate, onUpdated }: TimeSlotManagerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [allTimeSlots, setAllTimeSlots] = useState<TimeSlot[]>([])
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [selectedSlots, setSelectedSlots] = useState<string[]>([])
  const [reason, setReason] = useState("")

  useEffect(() => {
    if (isOpen && selectedDate) {
      fetchTimeSlots()
    }
  }, [isOpen, selectedDate])

  const fetchTimeSlots = async () => {
    try {
      const [all, available] = await Promise.all([getTimeSlots(), getAvailableTimeSlots(selectedDate)])

      setAllTimeSlots(all)
      setAvailableSlots(available)
    } catch (error: any) {
      toast.error("Failed to load time slots")
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
      setSelectedSlots([])
      setReason("")
    }
  }

  const handleSlotToggle = (timeSlot: string) => {
    setSelectedSlots((prev) =>
      prev.includes(timeSlot) ? prev.filter((slot) => slot !== timeSlot) : [...prev, timeSlot],
    )
  }

  const handleBlockSlots = async () => {
    if (selectedSlots.length === 0) {
      toast.error("Please select at least one time slot to block")
      return
    }

    setIsLoading(true)
    try {
      await blockTimeSlots(selectedDate, selectedSlots, reason || "Time slots blocked")
      toast.success(`${selectedSlots.length} time slot(s) blocked for ${new Date(selectedDate).toLocaleDateString()}`)
      onUpdated()
      handleClose()
    } catch (error: any) {
      toast.error(`Failed to block time slots: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnblockSlot = async (timeSlot: string) => {
    try {
      await unblockTimeSlot(selectedDate, timeSlot)
      toast.success("Time slot unblocked")
      fetchTimeSlots()
      onUpdated()
    } catch (error: any) {
      toast.error(`Failed to unblock time slot: ${error.message}`)
    }
  }

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const blockedSlots = allTimeSlots.filter(
    (slot) => !availableSlots.some((available) => available.time_slot === slot.time_slot),
  )

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-xl font-semibold flex items-center">
            <Clock className="w-5 h-5 mr-2 text-blue-600" />
            Manage Time Slots - {new Date(selectedDate).toLocaleDateString()}
          </DialogTitle>
          <Button variant="ghost" size="sm" onClick={handleClose} className="h-8 w-8 p-0" disabled={isLoading}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-6">
          {/* Currently Blocked Slots */}
          {blockedSlots.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-red-600">Currently Blocked Time Slots</h3>
              <div className="grid grid-cols-3 gap-2">
                {blockedSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded"
                  >
                    <span className="text-sm font-medium text-red-800">{formatTime(slot.time_slot)}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleUnblockSlot(slot.time_slot)}
                      className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Slots to Block */}
          <div className="space-y-3">
            <h3 className="font-medium text-green-600">Available Time Slots</h3>
            {availableSlots.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {availableSlots.map((slot) => (
                  <Button
                    key={slot.id}
                    variant={selectedSlots.includes(slot.time_slot) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSlotToggle(slot.time_slot)}
                    className={`text-xs ${
                      selectedSlots.includes(slot.time_slot)
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-transparent hover:bg-gray-50"
                    }`}
                  >
                    {formatTime(slot.time_slot)}
                  </Button>
                ))}
              </div>
            ) : (
              <Alert>
                <AlertDescription>
                  No available time slots for this date. The day might be closed or all slots are already blocked.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Block Selected Slots */}
          {selectedSlots.length > 0 && (
            <div className="space-y-4 border-t pt-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for blocking (optional)</Label>
                <Input
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Doctor appointment, Maintenance..."
                  disabled={isLoading}
                />
              </div>

              <Alert className="border-blue-200 bg-blue-50">
                <AlertDescription className="text-blue-800">
                  <strong>Selected:</strong> {selectedSlots.length} time slot(s) -{" "}
                  {selectedSlots.map((slot) => formatTime(slot)).join(", ")}
                </AlertDescription>
              </Alert>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setSelectedSlots([])} disabled={isLoading}>
                  Clear Selection
                </Button>
                <Button onClick={handleBlockSlots} disabled={isLoading} className="bg-red-600 hover:bg-red-700">
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Blocking...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Plus className="w-4 h-4 mr-2" />
                      Block Selected Slots
                    </div>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
