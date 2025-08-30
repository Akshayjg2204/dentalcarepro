"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Stethoscope, Plus, Edit, Trash2, Clock, IndianRupee, Search, Activity, FileText } from "lucide-react"
import { getTreatments, createTreatment, updateTreatment, deleteTreatment, type Treatment } from "@/lib/treatments"
import { toast } from "sonner"

interface TreatmentPlansModalProps {
  isOpen: boolean
  onClose: () => void
  currentUserId: string
  currentUserRole: string
}

export function TreatmentPlansModal({ isOpen, onClose, currentUserId, currentUserRole }: TreatmentPlansModalProps) {
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [filteredTreatments, setFilteredTreatments] = useState<Treatment[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("view")
  const [editingTreatment, setEditingTreatment] = useState<Treatment | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    default_cost: 0,
    duration_minutes: 30,
    category: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchTreatments()
    }
  }, [isOpen])

  useEffect(() => {
    filterTreatments()
  }, [treatments, searchTerm])

  const fetchTreatments = async () => {
    try {
      setIsLoading(true)
      const data = await getTreatments()
      setTreatments(data)
    } catch (error: any) {
      console.error("Failed to fetch treatments:", error)
      toast.error("Failed to load treatments")
    } finally {
      setIsLoading(false)
    }
  }

  const filterTreatments = () => {
    let filtered = [...treatments]

    if (searchTerm) {
      filtered = filtered.filter(
        (treatment) =>
          treatment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          treatment.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          treatment.category?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    setFilteredTreatments(filtered)
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      default_cost: 0,
      duration_minutes: 30,
      category: "",
    })
    setEditingTreatment(null)
  }

  const handleEdit = (treatment: Treatment) => {
    setEditingTreatment(treatment)
    setFormData({
      name: treatment.name,
      description: treatment.description || "",
      default_cost: treatment.default_cost,
      duration_minutes: treatment.duration_minutes,
      category: treatment.category || "",
    })
    setActiveTab("create")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error("Treatment name is required")
      return
    }

    if (formData.default_cost <= 0) {
      toast.error("Default price must be greater than 0")
      return
    }

    setIsSubmitting(true)

    try {
      if (editingTreatment) {
        // Update existing treatment
        await updateTreatment(editingTreatment.id, {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          default_cost: formData.default_cost,
          duration_minutes: formData.duration_minutes,
          category: formData.category.trim() || undefined,
        })
        toast.success("Treatment updated successfully!")
      } else {
        // Create new treatment
        await createTreatment({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          default_cost: formData.default_cost,
          duration_minutes: formData.duration_minutes,
          category: formData.category.trim() || undefined,
        })
        toast.success("Treatment created successfully!")
      }

      resetForm()
      setActiveTab("view")
      fetchTreatments()
    } catch (error: any) {
      console.error("Error saving treatment:", error)
      toast.error(error.message || "Failed to save treatment")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (treatment: Treatment) => {
    if (!confirm(`Are you sure you want to delete "${treatment.name}"?`)) {
      return
    }

    try {
      await deleteTreatment(treatment.id)
      toast.success("Treatment deleted successfully!")
      fetchTreatments()
    } catch (error: any) {
      console.error("Error deleting treatment:", error)
      toast.error("Failed to delete treatment")
    }
  }

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return "Rs 0"
    }
    return `Rs ${amount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
  }

  const formatDuration = (minutes: number | undefined | null) => {
    if (minutes === undefined || minutes === null || isNaN(minutes) || minutes <= 0) {
      return "30 min"
    }

    if (minutes < 60) {
      return `${minutes} min`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }

  const getCategoryColor = (category?: string) => {
    if (!category) return "bg-gray-100 text-gray-800"

    const colors = {
      cleaning: "bg-blue-100 text-blue-800",
      filling: "bg-green-100 text-green-800",
      extraction: "bg-red-100 text-red-800",
      "root canal": "bg-purple-100 text-purple-800",
      orthodontics: "bg-yellow-100 text-yellow-800",
      cosmetic: "bg-pink-100 text-pink-800",
      surgery: "bg-orange-100 text-orange-800",
    }

    return colors[category.toLowerCase() as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Stethoscope className="w-5 h-5 mr-2 text-blue-600" />
            Treatment Plans Management
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="view" className="flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              View Treatments
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              {editingTreatment ? "Edit Treatment" : "Create Treatment"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="view" className="space-y-4">
            {/* Search and Stats */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search treatments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>Total: {treatments.length} treatments</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    resetForm()
                    setActiveTab("create")
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Treatment
                </Button>
              </div>
            </div>

            {/* Treatments List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading treatments...</p>
                </div>
              </div>
            ) : filteredTreatments.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No treatments found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm ? "Try adjusting your search criteria" : "Create your first treatment plan"}
                </p>
                <Button onClick={() => setActiveTab("create")}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Treatment
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTreatments.map((treatment) => (
                  <Card key={treatment.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{treatment.name}</CardTitle>
                          {treatment.category && (
                            <Badge className={`text-xs mt-1 ${getCategoryColor(treatment.category)}`}>
                              {treatment.category}
                            </Badge>
                          )}
                        </div>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(treatment)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(treatment)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {treatment.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{treatment.description}</p>
                      )}

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center">
                          <IndianRupee className="w-4 h-4 text-green-600 mr-1" />
                          <span className="font-medium">{formatCurrency(treatment.default_cost || 0)}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 text-blue-600 mr-1" />
                          <span>{formatDuration(treatment.duration_minutes || 30)}</span>
                        </div>
                      </div>

                      <div className="text-xs text-gray-500 pt-2 border-t">
                        Created {treatment.created_at ? new Date(treatment.created_at).toLocaleDateString() : "Unknown"}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="create" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  {editingTreatment ? (
                    <>
                      <Edit className="w-5 h-5 mr-2" />
                      Edit Treatment: {editingTreatment.name}
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 mr-2" />
                      Create New Treatment
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">
                        Treatment Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Dental Cleaning, Root Canal"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cleaning">Cleaning</SelectItem>
                          <SelectItem value="filling">Filling</SelectItem>
                          <SelectItem value="extraction">Extraction</SelectItem>
                          <SelectItem value="root canal">Root Canal</SelectItem>
                          <SelectItem value="orthodontics">Orthodontics</SelectItem>
                          <SelectItem value="cosmetic">Cosmetic</SelectItem>
                          <SelectItem value="surgery">Surgery</SelectItem>
                          <SelectItem value="consultation">Consultation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe the treatment procedure..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="default_cost">
                        Default Price (Rs) <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="default_cost"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.default_cost}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              default_cost: Number.parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="pl-10"
                          placeholder="0.00"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="duration_minutes">
                        Duration (minutes) <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="duration_minutes"
                          type="number"
                          min="1"
                          value={formData.duration_minutes}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              duration_minutes: Number.parseInt(e.target.value) || 30,
                            }))
                          }
                          className="pl-10"
                          placeholder="30"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <Button type="submit" disabled={isSubmitting} className="flex-1">
                      {isSubmitting ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : editingTreatment ? (
                        <Edit className="w-4 h-4 mr-2" />
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      {editingTreatment ? "Update Treatment" : "Create Treatment"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        resetForm()
                        setActiveTab("view")
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
