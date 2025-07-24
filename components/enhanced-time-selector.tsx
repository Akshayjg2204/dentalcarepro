"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface TimeSlot {
  time: string
  available: boolean
  isBooked: boolean
}

interface EnhancedTimeSelectorProps {
  selectedTime?: string
  onTimeChange: (time: string) => void
  selectedDate?: string
  isEmergency?: boolean
}

export function EnhancedTimeSelector({
  selectedTime,
  onTimeChange,
  selectedDate,
  isEmergency = false,
}: EnhancedTimeSelectorProps) {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Generate time slots from 10:00 AM to 10:00 PM (22:00)
  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = []

    // Start from 10:00 AM (10:00) to 10:00 PM (22:00)
    for (let hour = 10; hour <= 22; hour++) {
      // Add slots every 30 minutes
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
        slots.push({
          time: timeString,
          available: true,
          isBooked: false,
        })
      }
    }

    return slots
  }

  const fetchBookedSlots = async (date: string) => {
    if (!date) return []

    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from("appointments")
        .select("appointment_time")
        .eq("appointment_date", date)
        .in("status", ["pending", "approved"])

      if (error) {
        console.error("Error fetching booked slots:", error)
        return []
      }

      return data?.map((appointment) => appointment.appointment_time) || []
    } catch (error) {
      console.error("Error fetching booked slots:", error)
      return []
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const initializeTimeSlots = async () => {
      const allSlots = generateTimeSlots()

      if (selectedDate) {
        const bookedTimes = await fetchBookedSlots(selectedDate)

        const updatedSlots = allSlots.map((slot) => ({
          ...slot,
          isBooked: bookedTimes.includes(slot.time),
          available: isEmergency || !bookedTimes.includes(slot.time),
        }))

        setTimeSlots(updatedSlots)
      } else {
        setTimeSlots(allSlots)
      }
    }

    initializeTimeSlots()
  }, [selectedDate, isEmergency])

  const formatDisplayTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(":").map(Number)
      const date = new Date()
      date.setHours(hours, minutes, 0, 0)

      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    } catch (error) {
      console.error("Error formatting time:", error)
      return time
    }
  }

  const handleTimeSelect = (time: string) => {
    try {
      if (onTimeChange && typeof onTimeChange === "function") {
        onTimeChange(time)
      } else {
        console.error("onTimeChange is not a function:", onTimeChange)
        toast.error("Error selecting time. Please try again.")
      }
    } catch (error) {
      console.error("Error in handleTimeSelect:", error)
      toast.error("Error selecting time. Please try again.")
    }
  }

  const getTimeSlotVariant = (slot: TimeSlot) => {
    if (selectedTime === slot.time) {
      return "default"
    }
    if (!slot.available && !isEmergency) {
      return "secondary"
    }
    return "outline"
  }

  const getTimeSlotClassName = (slot: TimeSlot) => {
    let className = "h-12 text-sm transition-all duration-200 "

    if (selectedTime === slot.time) {
      className += "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 "
    } else if (!slot.available && !isEmergency) {
      className += "bg-gray-100 text-gray-400 cursor-not-allowed hover:bg-gray-100 "
    } else if (slot.isBooked && isEmergency) {
      className += "bg-yellow-50 border-yellow-300 text-yellow-800 hover:bg-yellow-100 "
    } else {
      className += "hover:bg-blue-50 hover:border-blue-300 "
    }

    return className
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading available times...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center mb-4">
          <Clock className="w-4 h-4 mr-2 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Available Time Slots</span>
          {isEmergency && (
            <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-800">
              Emergency - All slots available
            </Badge>
          )}
        </div>

        {!selectedDate && (
          <div className="flex items-center p-4 bg-blue-50 rounded-lg mb-4">
            <AlertCircle className="w-4 h-4 mr-2 text-blue-600" />
            <span className="text-sm text-blue-700">Please select a date first</span>
          </div>
        )}

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {timeSlots.map((slot) => (
            <Button
              key={slot.time}
              variant={getTimeSlotVariant(slot)}
              className={getTimeSlotClassName(slot)}
              onClick={() => handleTimeSelect(slot.time)}
              disabled={!slot.available && !isEmergency}
            >
              <div className="text-center">
                <div className="font-medium">{formatDisplayTime(slot.time)}</div>
                {slot.isBooked && isEmergency && <div className="text-xs opacity-75">Booked</div>}
              </div>
            </Button>
          ))}
        </div>

        {timeSlots.length === 0 && selectedDate && (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-600">No time slots available</p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-600">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-600 rounded mr-1"></div>
            Selected
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-white border border-gray-300 rounded mr-1"></div>
            Available
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gray-100 rounded mr-1"></div>
            Unavailable
          </div>
          {isEmergency && (
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded mr-1"></div>
              Booked (Emergency Override)
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
