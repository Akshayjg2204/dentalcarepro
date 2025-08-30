import { supabase } from "./supabase-client"

export interface PatientDocument {
  id: string
  patient_id: string
  uploaded_by: string
  file_name: string
  file_path: string
  file_size: number
  file_type: string
  document_type?: string
  description?: string
  created_at: string
  updated_at: string
  uploader?: {
    first_name: string
    last_name: string
  }
  uploader_name?: string
}

export const getPatientDocuments = async (patientId: string): Promise<PatientDocument[]> => {
  try {
    console.log("[v0] Fetching documents for patient:", patientId)

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    let user = session?.user

    if (sessionError || !user) {
      console.log("[v0] Initial session check failed, attempting to refresh session")

      // Try to refresh the session once
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()

      if (refreshError || !refreshData.session?.user) {
        console.error("[v0] Auth error in getPatientDocuments:", sessionError || refreshError)
        throw new Error("User not authenticated")
      }

      user = refreshData.session.user
      console.log("[v0] Session refreshed successfully")
    }

    console.log("[v0] Current user fetching documents:", user.id)

    let userRole = "patient" // Default role
    let isAdmin = false

    try {
      const { data: currentUser, error: userError } = await supabase
        .from("users")
        .select("role, first_name, last_name")
        .eq("id", user.id)
        .maybeSingle()

      if (userError) {
        console.error("[v0] Error fetching current user role:", userError.message)
      } else if (currentUser) {
        userRole = currentUser.role || "patient"
        isAdmin = userRole === "admin"
        console.log("[v0] Current user role:", userRole)
        console.log("[v0] Is admin:", isAdmin)
      } else {
        console.log("[v0] User profile not found, assuming patient role")
      }
    } catch (roleError) {
      console.error("[v0] Role check failed, proceeding as patient:", roleError)
    }

    let documents: any[] = []
    let error: any = null

    if (isAdmin) {
      console.log("[v0] Using admin function to fetch documents")
      try {
        const { data: adminDocs, error: adminError } = await supabase.rpc("get_patient_documents_for_admin", {
          target_patient_id: patientId,
        })

        if (adminError) {
          console.error("[v0] Admin function failed:", adminError)
          // Fallback to regular query
          const { data: regularDocs, error: regularError } = await supabase
            .from("patient_documents")
            .select(`
              *,
              uploader:uploaded_by(first_name, last_name)
            `)
            .eq("patient_id", patientId)
            .order("created_at", { ascending: false })

          documents = regularDocs || []
          error = regularError
        } else {
          documents = adminDocs || []
        }
      } catch (adminFuncError) {
        console.error("[v0] Admin function not available, using regular query:", adminFuncError)
        const { data: regularDocs, error: regularError } = await supabase
          .from("patient_documents")
          .select(`
            *,
            uploader:uploaded_by(first_name, last_name)
          `)
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false })

        documents = regularDocs || []
        error = regularError
      }
    } else {
      // Regular patient query
      const { data: patientDocs, error: patientError } = await supabase
        .from("patient_documents")
        .select(`
          *,
          uploader:uploaded_by(first_name, last_name)
        `)
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })

      documents = patientDocs || []
      error = patientError
    }

    if (error) {
      console.error("[v0] Error fetching patient documents:", error)
      throw error
    }

    console.log("[v0] Raw documents from database:", documents)

    // Add uploader names to the results
    const result =
      documents?.map((doc) => ({
        ...doc,
        uploader_name: doc.uploader ? `${doc.uploader.first_name} ${doc.uploader.last_name}`.trim() : "Unknown",
      })) || []

    console.log(`[v0] Found ${result.length} documents for patient ${patientId}`)
    return result
  } catch (error: any) {
    console.error("[v0] Error in getPatientDocuments:", error.message)
    throw error
  }
}

export const uploadPatientDocument = async (
  patientId: string,
  file: File,
  documentType?: string,
  description?: string,
): Promise<PatientDocument> => {
  try {
    console.log("Starting document upload for patient:", patientId)

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error("Auth error:", authError)
      throw new Error("User not authenticated")
    }

    console.log("Authenticated user:", user.id)

    // Check if user profile exists and get user role
    let { data: existingUser, error: userCheckError } = await supabase
      .from("users")
      .select("role, first_name, last_name")
      .eq("id", user.id)
      .maybeSingle()

    if (userCheckError) {
      console.error("Error checking user profile:", userCheckError)
      throw new Error("Failed to verify user profile")
    }

    // If user profile doesn't exist, create it with comprehensive conflict handling
    if (!existingUser) {
      console.log("User profile not found, creating profile for:", user.id)

      let createError = null
      let newUser = null
      let attemptCount = 0
      const maxAttempts = 3

      while (!newUser && attemptCount < maxAttempts) {
        attemptCount++
        let emailToUse = user.email || ""

        // For subsequent attempts, modify the email
        if (attemptCount > 1) {
          emailToUse = user.email
            ? `${user.email.split("@")[0]}_${user.id.substring(0, 8)}@${user.email.split("@")[1] || "temp.com"}`
            : `user_${user.id.substring(0, 8)}@temp.com`
        }

        // For third attempt, add timestamp
        if (attemptCount === 3) {
          emailToUse = user.email
            ? `${user.email.split("@")[0]}_${user.id.substring(0, 8)}_${Date.now()}@${user.email.split("@")[1] || "temp.com"}`
            : `user_${user.id.substring(0, 8)}_${Date.now()}@temp.com`
        }

        console.log(`Attempt ${attemptCount}: Creating user with email:`, emailToUse)

        const { data: createdUser, error: currentCreateError } = await supabase
          .from("users")
          .insert({
            id: user.id,
            email: emailToUse,
            first_name: user.user_metadata?.first_name || user.email?.split("@")[0] || "User",
            last_name: user.user_metadata?.last_name || "",
            role: user.user_metadata?.role || "patient",
          })
          .select("role, first_name, last_name")
          .maybeSingle()

        if (currentCreateError) {
          console.log(`Attempt ${attemptCount} failed:`, currentCreateError.message)
          createError = currentCreateError

          // If it's not an email conflict, break the loop
          if (!currentCreateError.message.includes("users_email_key")) {
            break
          }
        } else {
          newUser = createdUser
          console.log(`Attempt ${attemptCount} succeeded`)
          break
        }
      }

      if (!newUser) {
        console.error("All attempts to create user profile failed:", createError)
        throw new Error(`Failed to create user profile after ${maxAttempts} attempts: ${createError?.message}`)
      }

      existingUser = newUser
      console.log("Created user profile:", existingUser)
    }

    console.log("User profile verified:", existingUser)

    // Validate that the patient exists if different from current user
    if (patientId !== user.id) {
      const { data: patientExists, error: patientCheckError } = await supabase
        .from("users")
        .select("id")
        .eq("id", patientId)
        .maybeSingle()

      if (patientCheckError) {
        console.error("Error checking patient existence:", patientCheckError)
        throw new Error("Failed to verify patient")
      }

      if (!patientExists) {
        throw new Error("Patient not found")
      }

      console.log("Patient verified:", patientId)
    }

    // Validate file
    if (!file) {
      throw new Error("No file provided")
    }

    if (file.size > 1 * 1024 * 1024) {
      // 1MB limit
      throw new Error("File size exceeds 1MB limit")
    }

    // Allowed file types
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]

    if (!allowedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed`)
    }

    // Generate unique file name
    const fileExt = file.name.split(".").pop()
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2)
    const fileName = `${timestamp}-${randomString}.${fileExt}`
    const filePath = `${user.id}/${fileName}`

    console.log("Uploading file to storage:", filePath)

    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("patient-documents")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      })

    if (uploadError) {
      console.error("Storage upload error:", uploadError)
      throw new Error(`Storage upload failed: ${uploadError.message}`)
    }

    console.log("File uploaded successfully:", uploadData)

    // Debug: Log the data we're about to insert
    const documentData = {
      patient_id: patientId,
      uploaded_by: user.id,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      file_type: file.type,
      document_type: documentType || null,
      description: description || null,
    }

    console.log("Document data to insert:", documentData)
    console.log("Current user role:", existingUser?.role)
    console.log("Patient ID:", patientId)
    console.log("Uploaded by:", user.id)

    // First, let's verify the table structure and test RLS
    const { data: tableTest, error: tableTestError } = await supabase.from("patient_documents").select("*").limit(0)

    if (tableTestError) {
      console.error("Table structure test failed:", tableTestError)
    } else {
      console.log("Table structure test passed")
    }

    // Test RLS by checking if we can query the table
    const { data: rlsTest, error: rlsTestError } = await supabase.from("patient_documents").select("count").limit(1)

    if (rlsTestError) {
      console.error("RLS test failed:", rlsTestError)
    } else {
      console.log("RLS test passed")
    }

    // Insert the document record
    const { data: document, error: dbError } = await supabase
      .from("patient_documents")
      .insert(documentData)
      .select(`
        *,
        uploader:uploaded_by(first_name, last_name)
      `)
      .single()

    if (dbError) {
      console.error("Database insert error:", dbError)
      console.error("Error details:", {
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint,
        code: dbError.code,
      })

      // Clean up uploaded file if database insert fails
      try {
        await supabase.storage.from("patient-documents").remove([filePath])
        console.log("Cleaned up uploaded file after database error")
      } catch (cleanupError) {
        console.error("Failed to cleanup uploaded file:", cleanupError)
      }

      throw new Error(`Failed to save document record: ${dbError.message}`)
    }

    console.log("Document record saved successfully:", document)

    // Add uploader name to the response
    const result = {
      ...document,
      uploader_name: document.uploader
        ? `${document.uploader.first_name} ${document.uploader.last_name}`.trim()
        : "Unknown",
    }

    return result
  } catch (error: any) {
    console.error("Error in uploadPatientDocument:", error.message)
    throw error
  }
}

export const deletePatientDocument = async (documentId: string): Promise<void> => {
  try {
    console.log("Deleting document:", documentId)

    // Get document details first
    const { data: document, error: fetchError } = await supabase
      .from("patient_documents")
      .select("file_path")
      .eq("id", documentId)
      .single()

    if (fetchError) {
      console.error("Error fetching document for deletion:", fetchError)
      throw fetchError
    }

    if (!document) {
      throw new Error("Document not found")
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage.from("patient-documents").remove([document.file_path])

    if (storageError) {
      console.error("Error deleting file from storage:", storageError)
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    const { error: dbError } = await supabase.from("patient_documents").delete().eq("id", documentId)

    if (dbError) {
      console.error("Error deleting document from database:", dbError)
      throw dbError
    }

    console.log("Document deleted successfully:", documentId)
  } catch (error: any) {
    console.error("Error in deletePatientDocument:", error.message)
    throw error
  }
}

export const getDocumentUrl = async (filePath: string): Promise<string> => {
  try {
    const { data, error } = await supabase.storage.from("patient-documents").createSignedUrl(filePath, 3600) // 1 hour expiry

    if (error) {
      console.error("Error creating signed URL:", error)
      throw error
    }

    return data.signedUrl
  } catch (error: any) {
    console.error("Error in getDocumentUrl:", error.message)
    throw error
  }
}

export const downloadDocument = async (filePath: string, fileName: string): Promise<void> => {
  try {
    console.log("[v0] Starting download for:", fileName)
    const url = await getDocumentUrl(filePath)
    console.log("[v0] Generated download URL:", url)

    try {
      // Method 1: Try fetch and blob download (more reliable)
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const blob = await response.blob()
      console.log("[v0] File fetched as blob, size:", blob.size)

      // Create object URL and download
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = blobUrl
      link.download = fileName
      link.style.display = "none"

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up the blob URL
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100)
      console.log("[v0] Download completed successfully")
    } catch (fetchError) {
      console.warn("[v0] Fetch method failed, trying direct link method:", fetchError)

      // Method 2: Fallback to direct link download
      const link = document.createElement("a")
      link.href = url
      link.download = fileName
      link.target = "_blank"
      link.rel = "noopener noreferrer"
      link.style.display = "none"

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      console.log("[v0] Fallback download method used")
    }
  } catch (error: any) {
    console.error("[v0] Error in downloadDocument:", error.message)
    throw new Error(`Download failed: ${error.message}`)
  }
}

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

export const getFileIcon = (mimeType?: string): string => {
  // Add null/undefined check to prevent the error
  if (!mimeType || typeof mimeType !== "string") {
    return "📎" // Default icon for unknown/undefined types
  }

  if (mimeType.startsWith("image/")) {
    return "🖼️"
  } else if (mimeType === "application/pdf") {
    return "📄"
  } else if (mimeType.includes("word")) {
    return "📝"
  } else if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) {
    return "📊"
  } else {
    return "📎"
  }
}

export const isImageFile = (mimeType?: string): boolean => {
  if (!mimeType || typeof mimeType !== "string") {
    return false
  }
  return mimeType.startsWith("image/")
}

export const previewDocument = async (filePath: string): Promise<string> => {
  try {
    const url = await getDocumentUrl(filePath)
    return url
  } catch (error: any) {
    console.error("Error in previewDocument:", error.message)
    throw error
  }
}
