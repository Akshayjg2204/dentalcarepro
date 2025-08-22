"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import type React from "react"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, X, ZoomIn, ZoomOut, RotateCw, Download, RotateCcw } from "lucide-react"

interface ImagePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  fileName: string
  onDownload?: () => void
}

export function ImagePreviewModal({ isOpen, onClose, imageUrl, fileName, onDownload }: ImagePreviewModalProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [lastPanOffset, setLastPanOffset] = useState({ x: 0, y: 0 })

  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (isOpen) {
      console.log("[v0] ImagePreviewModal opened with URL:", imageUrl)
      setLoading(true)
      setError(false)
      setZoom(100)
      setRotation(0)
      setPanOffset({ x: 0, y: 0 })
      setLastPanOffset({ x: 0, y: 0 })

      if (!imageUrl || imageUrl.trim() === "") {
        console.error("[v0] Empty or invalid image URL provided")
        setError(true)
        setLoading(false)
        return
      }

      // Preload the image to catch errors early
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        console.log("[v0] Image preloaded successfully")
        setLoading(false)
        setError(false)
      }
      img.onerror = (e) => {
        console.error("[v0] Image preload failed:", e)
        setError(true)
        setLoading(false)
      }
      img.src = imageUrl
    }
  }, [isOpen, imageUrl])

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -25 : 25
    setZoom((prev) => Math.max(25, Math.min(300, prev + delta)))
  }, [])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsDragging(true)
      setDragStart({ x: e.clientX, y: e.clientY })
      setLastPanOffset(panOffset)
    },
    [panOffset],
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return

      const deltaX = e.clientX - dragStart.x
      const deltaY = e.clientY - dragStart.y

      setPanOffset({
        x: lastPanOffset.x + deltaX,
        y: lastPanOffset.y + deltaY,
      })
    },
    [isDragging, dragStart, lastPanOffset],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener("wheel", handleWheel, { passive: false })

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      container.removeEventListener("wheel", handleWheel)
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [handleWheel, handleMouseMove, handleMouseUp, isDragging])

  const handleImageLoad = () => {
    console.log("[v0] Image loaded in modal")
    setLoading(false)
    setError(false)
  }

  const handleImageError = (e: any) => {
    console.error("[v0] Image load error in modal:", e)
    setLoading(false)
    setError(true)
  }

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 300))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 25))
  }

  const handleRotateRight = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  const handleRotateLeft = () => {
    setRotation((prev) => (prev - 90 + 360) % 360)
  }

  const handleReset = () => {
    setZoom(100)
    setRotation(0)
    setPanOffset({ x: 0, y: 0 })
    setLastPanOffset({ x: 0, y: 0 })
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-black/80 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-medium truncate max-w-md">{fileName}</h3>
              <span className="text-sm text-gray-300">{zoom}%</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= 25}
                className="text-white hover:bg-white/20"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= 300}
                className="text-white hover:bg-white/20"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleRotateLeft} className="text-white hover:bg-white/20">
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleRotateRight} className="text-white hover:bg-white/20">
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-white hover:bg-white/20 text-xs px-2"
              >
                Reset
              </Button>
              {onDownload && (
                <Button variant="ghost" size="sm" onClick={onDownload} className="text-white hover:bg-white/20">
                  <Download className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/20">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Image Container */}
        <div
          ref={containerRef}
          className="flex items-center justify-center min-h-[95vh] p-16 pt-20 overflow-hidden cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          style={{ cursor: isDragging ? "grabbing" : "grab" }}
        >
          {loading && (
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
              <span className="ml-2 text-white">Loading image...</span>
            </div>
          )}

          {error && (
            <div className="text-center text-white">
              <div className="text-6xl mb-4">⚠️</div>
              <p className="text-lg">Failed to load image</p>
              <p className="text-sm text-gray-400 mt-2">The image could not be displayed</p>
              <p className="text-xs text-gray-500 mt-2 break-all">URL: {imageUrl}</p>
            </div>
          )}

          {!loading && !error && imageUrl && (
            <div className="flex items-center justify-center w-full h-full">
              <img
                ref={imageRef}
                src={imageUrl || "/placeholder.svg"}
                alt={fileName}
                onLoad={handleImageLoad}
                onError={handleImageError}
                className="max-w-none transition-transform duration-200 ease-in-out select-none"
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom / 100}) rotate(${rotation}deg)`,
                  transformOrigin: "center",
                }}
                crossOrigin="anonymous"
                draggable={false}
              />
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm p-4">
          <div className="flex items-center justify-center space-x-4 text-white text-sm">
            <span>Use mouse wheel to zoom • Click and drag to pan</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
