"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Clock, Calendar } from "lucide-react"
import { getAvailableTimeSlots } from "@/lib/clinic-availability"
import { isDateAvailable } from "@/lib/clinic-availability"
import type { TimeSlot } from "@/lib/appointments"

interface ClockTimeSelectorProps {
  selectedDate: string
  selectedTime: string
  onTimeChange: (time: string) => void
  disabled?: boolean
}

export function ClockTimeSelector({ selectedDate, selectedTime, onTimeChange, disabled }: ClockTimeSelectorProps) {
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [dateAvailable, setDateAvailable] = useState(true)

  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots()
    }
  }, [selectedDate])

  const fetchAvailableSlots = async () => {
    setIsLoading(true)
    try {
      // Check if date is available
      const available = await isDateAvailable(selectedDate)
      setDateAvailable(available)

      if (available) {
        const slots = await getAvailableTimeSlots(selectedDate)
        setAvailableSlots(slots)

        // Clear selected time if it's no longer available
        if (selectedTime && !slots.some((slot) => slot.time_slot === selectedTime)) {
          onTimeChange("")
        }
      } else {
        setAvailableSlots([])
        onTimeChange("")
      }
    } catch (error) {
      console.error("Error fetching available slots:", error)
      setAvailableSlots([])
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const handleTimeClick = (time: string) => {
    // Only update the selected time, no auto-submit
    onTimeChange(time)
  }

  if (!selectedDate) {
    return (
      <div className="space-y-2">
        <Label>Time</Label>
        <div className="p-8 text-center text-gray-500 border rounded-lg bg-gray-50">
          <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>Please select a date first</p>
        </div>
      </div>
    )
  }

  if (!dateAvailable) {
    return (
      <div className="space-y-2">
        <Label>Time</Label>
        <div className="p-8 text-center text-red-500 border border-red-200 rounded-lg bg-red-50">
          <Calendar className="w-8 h-8 mx-auto mb-2 text-red-400" />
          <p className="font-medium">Clinic Closed</p>
          <p className="text-sm">This date is not available for appointments</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>Time</Label>
        <div className="p-8 text-center text-gray-500 border rounded-lg">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p>Loading available times...</p>
        </div>
      </div>
    )
  }

  if (availableSlots.length === 0) {
    return (
      <div className="space-y-2">
        <Label>Time</Label>
        <div className="p-8 text-center text-gray-500 border rounded-lg bg-gray-50">
          <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="font-medium">No Available Times</p>
          <p className="text-sm">All time slots are booked for this date</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Label>
        Select Time <span className="text-red-500">*</span>
      </Label>

      {/* Time List */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Available Times ({availableSlots.length})</h4>
        <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
          {availableSlots.map((slot) => (
            <Button
              key={slot.id}
              type="button"
              variant={selectedTime === slot.time_slot ? "default" : "outline"}
              size="sm"
              onClick={() => handleTimeClick(slot.time_slot)}
              disabled={disabled}
              className={`text-xs h-10 ${
                selectedTime === slot.time_slot
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-transparent hover:bg-blue-50 hover:border-blue-300"
              }`}
            >
              {formatTime(slot.time_slot)}
            </Button>
          ))}
        </div>
      </div>

      {/* Selected Time Display */}
      {selectedTime && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              Selected: {formatTime(selectedTime)} on {new Date(selectedDate).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
