"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar, X, AlertTriangle } from "lucide-react"
import { closeDays, closeAllDaysOfWeek, getNextMonday, getNextDayOfWeek } from "@/lib/clinic-availability"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface DayClosureModalProps {
  isOpen: boolean
  onClose: () => void
  dayOfWeek: string
  onClosed: () => void
}

export function DayClosureModal({ isOpen, onClose, dayOfWeek, onClosed }: DayClosureModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [reason, setReason] = useState("")
  const [specificDate, setSpecificDate] = useState("")

  const handleClose = () => {
    if (!isLoading) {
      onClose()
      setReason("")
      setSpecificDate("")
    }
  }

  const handleCloseNextOccurrence = async () => {
    setIsLoading(true)
    try {
      let dateToClose = ""

      if (dayOfWeek === "monday") {
        dateToClose = getNextMonday()
      } else {
        dateToClose = getNextDayOfWeek(dayOfWeek)
      }

      await closeDays([dateToClose], reason || `Next ${dayOfWeek} closed`)
      toast.success(`Next ${dayOfWeek} (${new Date(dateToClose).toLocaleDateString()}) has been closed`)
      onClosed()
      handleClose()
    } catch (error: any) {
      toast.error(`Failed to close next ${dayOfWeek}: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCloseAllOccurrences = async () => {
    if (!confirm(`This will close ALL future ${dayOfWeek}s. Are you sure?`)) {
      return
    }

    setIsLoading(true)
    try {
      await closeAllDaysOfWeek(dayOfWeek, reason || `All ${dayOfWeek}s closed`)
      toast.success(`All future ${dayOfWeek}s have been closed`)
      onClosed()
      handleClose()
    } catch (error: any) {
      toast.error(`Failed to close all ${dayOfWeek}s: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCloseSpecificDate = async () => {
    if (!specificDate) {
      toast.error("Please select a specific date")
      return
    }

    setIsLoading(true)
    try {
      await closeDays([specificDate], reason || "Specific date closed")
      toast.success(`${new Date(specificDate).toLocaleDateString()} has been closed`)
      onClosed()
      handleClose()
    } catch (error: any) {
      toast.error(`Failed to close specific date: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const today = new Date().toISOString().split("T")[0]

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-xl font-semibold flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-red-600" />
            Close {dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)}
          </DialogTitle>
          <Button variant="ghost" size="sm" onClick={handleClose} className="h-8 w-8 p-0" disabled={isLoading}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Closing days will prevent patients from booking appointments on those dates.
          </AlertDescription>
        </Alert>

        <div className="space-y-6">
          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Holiday, Maintenance, Doctor unavailable..."
              rows={3}
              disabled={isLoading}
            />
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">Choose closure option:</h3>

              <Button
                onClick={handleCloseNextOccurrence}
                disabled={isLoading}
                className="w-full justify-start bg-orange-600 hover:bg-orange-700"
              >
                Close Next {dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)} Only
              </Button>

              <Button
                onClick={handleCloseAllOccurrences}
                disabled={isLoading}
                variant="destructive"
                className="w-full justify-start"
              >
                Close All Future {dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)}s
              </Button>
            </div>

            {/* Specific Date Option */}
            <div className="border-t pt-4 space-y-3">
              <h3 className="font-medium">Or close a specific date:</h3>
              <div className="flex space-x-2">
                <Input
                  type="date"
                  value={specificDate}
                  min={today}
                  onChange={(e) => setSpecificDate(e.target.value)}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={handleCloseSpecificDate}
                  disabled={isLoading || !specificDate}
                  variant="outline"
                  className="bg-transparent"
                >
                  Close Date
                </Button>
              </div>
            </div>
          </div>

          {/* Cancel Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
