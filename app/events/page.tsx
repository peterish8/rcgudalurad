"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Loader2,
  Calendar as CalendarIcon,
  Image as ImageIcon,
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Upload,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  image_url: string | null;
  extra_images: string[] | null;
  is_upcoming: boolean;
  created_at: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  
  // Image Viewer State
  const [viewingImages, setViewingImages] = useState<string[]>([]);
  const [viewingIndex, setViewingIndex] = useState(0);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [touchStartDistance, setTouchStartDistance] = useState<number | null>(
    null
  );
  const [touchStartZoom, setTouchStartZoom] = useState(1);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    event_date: new Date(),
    image_url: "",
    is_upcoming: true,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Gallery images state
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [existingGalleryImages, setExistingGalleryImages] = useState<string[]>([]);
  const [deletedGalleryImages, setDeletedGalleryImages] = useState<string[]>([]);
  const [galleryUploadProgress, setGalleryUploadProgress] = useState(0);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      setFetchError(null);
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: false });

      if (error) throw error;

      // Only set events if data exists, otherwise empty array
      setEvents(data || []);
    } catch (err: any) {
      console.error("Error fetching events:", err);
      setFetchError(
        err.message || err.code || "Failed to fetch events from Supabase"
      );
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  const handleCreate = () => {
    setSelectedEvent(null);
    setFormData({
      title: "",
      description: "",
      event_date: new Date(),
      image_url: "",
      is_upcoming: true,
    });
    setSelectedFile(null);
    setFilePreview(null);
    setGalleryFiles([]);
    setGalleryPreviews([]);
    setExistingGalleryImages([]);
    setDeletedGalleryImages([]);
    setError("");
    setIsModalOpen(true);
  };

  const handleEdit = (event: Event) => {
    setSelectedEvent(event);
    setFormData({
      title: event.title,
      description: event.description || "",
      event_date: new Date(event.event_date),
      image_url: event.image_url || "",
      is_upcoming: event.is_upcoming ?? true, // Default to true if undefined (legacy data)
    });
    setSelectedFile(null);
    setFilePreview(null);
    setExistingGalleryImages(event.extra_images || []);
    setGalleryFiles([]);
    setGalleryPreviews([]);
    setDeletedGalleryImages([]);
    setError("");
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteTarget(id);
    setIsDeleteDialogOpen(true);
  };

  const handleViewImage = (images: string[], startIndex: number = 0) => {
    if (!images || images.length === 0) {
      setImageLoadError(true);
      setViewingImages([]);
    } else {
      setImageLoadError(false);
      setViewingImages(images.filter(img => img && img.trim() !== ""));
      setViewingIndex(startIndex);
    }
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setIsImageViewerOpen(true);
    
    // Prevent page zoom when image viewer is open
    if (typeof window !== "undefined") {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    }
  };

  const handleNextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setViewingIndex((prev) => (prev + 1) % viewingImages.length); // Loop to start
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setImageLoadError(false);
  };

  const handlePrevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setViewingIndex((prev) => (prev - 1 + viewingImages.length) % viewingImages.length); // Loop to end
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setImageLoadError(false);
  };

  const handleCloseImageViewer = () => {
    setIsImageViewerOpen(false);
    setViewingImages([]);
    setViewingIndex(0);
    setImageLoadError(false);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    // Restore page scroll and touch
    if (typeof window !== "undefined") {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((prev) => Math.max(0.5, Math.min(3, prev + delta)));
    }
  };

  const getTouchDistance = (touches: React.TouchList): number => {
    const touch1 = touches[0];
    const touch2 = touches[1];
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.touches.length === 2) {
      const distance = getTouchDistance(e.touches);
      setTouchStartDistance(distance);
      setTouchStartZoom(zoom);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.touches.length === 2 && touchStartDistance !== null) {
      const distance = getTouchDistance(e.touches);
      const scale = distance / touchStartDistance;
      const newZoom = Math.max(0.5, Math.min(3, touchStartZoom * scale));
      setZoom(newZoom);
    } else if (e.touches.length === 1) {
      // Single touch - allow panning when zoomed
      if (zoom > 1) {
        // Pan logic can be added here if needed
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTouchStartDistance(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", deleteTarget);

      if (error) throw error;

      await fetchEvents();
      setDeleteTarget(null);
    } catch (err: any) {
      console.error("Error deleting event:", err);
      setError(err.message || err.code || "Failed to delete event");
    }
  };

  // File upload helpers
  const MAX_FILE_SIZE = 6 * 1024 * 1024; // 6MB
  const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return "Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File is too large. Maximum size is 6MB.";
    }
    return null;
  };

  const handleFileSelect = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setSelectedFile(file);
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setFilePreview(previewUrl);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const uploadFileToStorage = async (file: File): Promise<string> => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      
      setUploadProgress(30);

      const { data, error } = await supabase.storage
        .from("events-images")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      setUploadProgress(80);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("events-images")
        .getPublicUrl(data.path);

      setUploadProgress(100);
      
      return urlData.publicUrl;
    } finally {
      setIsUploading(false);
    }
  };

  const clearFileSelection = () => {
    setSelectedFile(null);
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
      setFilePreview(null);
    }
  };

  // Extract storage path from public URL
  const extractFilePathFromUrl = (publicUrl: string): string => {
    const match = publicUrl.match(/events-images\/(.+)$/);
    return match ? match[1] : '';
  };

  // Upload multiple gallery files
  const uploadGalleryFiles = async (files: File[], eventId: string): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    const totalFiles = files.length;
    
    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${fileExt}`;
      const filePath = `${eventId}/${fileName}`;
      
      // Update progress
      setGalleryUploadProgress(Math.round(((i + 0.5) / totalFiles) * 100));
      
      const { data, error } = await supabase.storage
        .from('events-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });
      
      if (error) throw error;
      
      const { data: urlData } = supabase.storage
        .from('events-images')
        .getPublicUrl(filePath);
      
      uploadedUrls.push(urlData.publicUrl);
      
      // Update progress
      setGalleryUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
    }
    
    return uploadedUrls;
  };

  // Delete files from storage
  const deleteStorageFiles = async (filePaths: string[]): Promise<void> => {
    if (filePaths.length === 0) return;
    
    const { error } = await supabase.storage
      .from('events-images')
      .remove(filePaths);
      
    if (error) {
      console.error('Failed to delete storage files:', error);
    }
  };

  // Handle gallery file selection
  const handleGalleryFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    for (const file of fileArray) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      validFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    setGalleryFiles(prev => [...prev, ...validFiles]);
    setGalleryPreviews(prev => [...prev, ...newPreviews]);
    setError("");
  };

  // Handle gallery file input change
  const handleGalleryFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleGalleryFileSelect(e.target.files);
  };

  // Remove gallery file from pending uploads
  const handleRemoveGalleryFile = (index: number) => {
    URL.revokeObjectURL(galleryPreviews[index]);
    setGalleryFiles(prev => prev.filter((_, i) => i !== index));
    setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Remove existing gallery image
  const handleRemoveExistingGalleryImage = (imageUrl: string) => {
    const filePath = extractFilePathFromUrl(imageUrl);
    setDeletedGalleryImages(prev => [...prev, filePath]);
    setExistingGalleryImages(prev => prev.filter(url => url !== imageUrl));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      let imageUrl = formData.image_url.trim();
      let eventId = selectedEvent?.id;

      // Step 1: Create or update event first to get ID
      if (selectedEvent) {
        // Updating existing event - we already have the ID
        eventId = selectedEvent.id;
      } else {
        // Creating new event - insert basic data first to get ID
        const { data, error } = await supabase
          .from("events")
          .insert({
            title: formData.title.trim(),
            description: formData.description.trim() || null,
            event_date: format(formData.event_date, "yyyy-MM-dd"),
            image_url: null,
            extra_images: null,
            is_upcoming: formData.is_upcoming,
          })
          .select()
          .single();

        if (error) throw error;
        eventId = data.id;
      }

      // Step 2: Upload default image (if new file selected)
      if (selectedFile) {
        const fileExt = selectedFile.name.split(".").pop();
        const fileName = `default-${Date.now()}.${fileExt}`;
        const filePath = `${eventId}/${fileName}`;

        const { data, error } = await supabase.storage
          .from("events-images")
          .upload(filePath, selectedFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from("events-images")
          .getPublicUrl(filePath);

        imageUrl = urlData.publicUrl;
      }

      // Step 3: Upload gallery files
      let galleryUrls: string[] = [...existingGalleryImages];
      // Only upload gallery files if not upcoming or if manual upload happening
      if (galleryFiles.length > 0) {
        if (!eventId) throw new Error("Event ID is required for gallery upload");
        setGalleryUploadProgress(0);
        const newGalleryUrls = await uploadGalleryFiles(galleryFiles, eventId);
        galleryUrls = [...galleryUrls, ...newGalleryUrls];
      }

      // Step 4: Delete removed gallery images from storage
      if (deletedGalleryImages.length > 0) {
        await deleteStorageFiles(deletedGalleryImages);
      }

      // Step 5: Update event with final data
      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        event_date: format(formData.event_date, "yyyy-MM-dd"),
        image_url: imageUrl || null,
        extra_images: galleryUrls.length > 0 ? galleryUrls : null,
        is_upcoming: formData.is_upcoming,
      };

      const { error } = await supabase
        .from("events")
        .update(eventData)
        .eq("id", eventId);

      if (error) throw error;

      await fetchEvents();
      setIsModalOpen(false);
      setFormData({
        title: "",
        description: "",
        event_date: new Date(),
        image_url: "",
        is_upcoming: true,
      });
      setSelectedEvent(null);
      clearFileSelection();
      setGalleryFiles([]);
      setGalleryPreviews([]);
      setExistingGalleryImages([]);
      setDeletedGalleryImages([]);
    } catch (err: any) {
      console.error("Error saving event:", err);
      setError(err.message || err.code || "Failed to save event");
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
      setGalleryUploadProgress(0);
    }
  };

  const filteredEvents = events.filter((event) =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Manage Events
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Create, edit, and delete events
              </p>
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                📁 Max file size: 6MB per image
              </p>
            </div>
            <button
              onClick={handleCreate}
              className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add New Event
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Error message for form operations */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Fetch error message */}
          {fetchError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
              <strong>Error fetching events from Supabase:</strong> {fetchError}
            </div>
          )}

          {/* Events table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : fetchError ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <CalendarIcon className="mx-auto h-12 w-12 text-red-400" />
              <h3 className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">
                Unable to load events
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Please check your Supabase connection and try again.
              </p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                No events found
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Get started by creating a new event.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Event Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Image
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Gallery
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredEvents.map((event) => (
                      <tr
                        key={event.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {event.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {format(new Date(event.event_date), "MMM dd, yyyy")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {event.is_upcoming ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                              ✨ Upcoming
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                              ✅ Completed
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                          {event.description || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <button
                            onClick={() => {
                              const images = [];
                              if (event.image_url) images.push(event.image_url);
                              if (event.extra_images) images.push(...event.extra_images);
                              handleViewImage(images);
                            }}
                            className="text-primary hover:underline"
                          >
                            View
                          </button>
                        </td>
                        
                        // ... (skip down to image viewer modal)

          {/* Image Viewer Modal */}
          {isImageViewerOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
              style={{ touchAction: "none" }}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  handleCloseImageViewer();
                }
              }}
            >
              <div className="relative max-w-4xl max-h-full w-full">
                {/* Controls - Top Left Corner */}
                <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                  {/* Go Back Button */}
                  <button
                    onClick={handleCloseImageViewer}
                    className="text-white hover:text-gray-300 bg-black/50 rounded-full p-2 transition-colors"
                    title="Go Back"
                  >
                    <ArrowLeft className="h-6 w-6" />
                  </button>

                  {/* Zoom Controls */}
                  {!imageLoadError && viewingImages.length > 0 && (
                    <>
                      <button
                        onClick={handleZoomIn}
                        className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
                        title="Zoom In"
                      >
                        <ZoomIn className="h-5 w-5" />
                      </button>
                      <button
                        onClick={handleZoomOut}
                        className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
                        title="Zoom Out"
                      >
                        <ZoomOut className="h-5 w-5" />
                      </button>
                      {zoom !== 1 && (
                        <>
                          <button
                            onClick={handleResetZoom}
                            className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
                            title="Reset Zoom"
                          >
                            <RotateCcw className="h-5 w-5" />
                          </button>
                          {/* Zoom Indicator */}
                          <div className="px-3 py-1 bg-black/50 text-white rounded-lg text-sm">
                            {Math.round(zoom * 100)}%
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>

                {/* Navigation Controls */}
                {!imageLoadError && viewingImages.length > 1 && (
                  <>
                    <button
                      onClick={handlePrevImage}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                      title="Previous Image"
                    >
                      <ChevronLeft className="h-8 w-8" />
                    </button>
                    <button
                      onClick={handleNextImage}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                      title="Next Image"
                    >
                      <ChevronRight className="h-8 w-8" />
                    </button>
                    {/* Image Counter */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 px-3 py-1 bg-black/50 text-white rounded-lg text-sm">
                      {viewingIndex + 1} / {viewingImages.length}
                    </div>
                  </>
                )}

                {imageLoadError || viewingImages.length === 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center max-w-md mx-auto">
                    <ImageIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Image Not Available
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Still didn't upload anything
                    </p>
                  </div>
                ) : (
                  <div className="relative w-full h-full">
                    {/* Image Container */}
                    <div
                      className="w-full h-[90vh] overflow-hidden cursor-move flex items-center justify-center touch-none"
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      onWheel={handleWheel}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onTouchCancel={handleTouchEnd}
                      style={{ touchAction: "none", userSelect: "none" }}
                    >
                      <img
                        src={viewingImages[viewingIndex]}
                        alt={`Event image ${viewingIndex + 1}`}
                        className="rounded transition-transform duration-200"
                        style={{
                          maxWidth: "90vw",
                          maxHeight: "85vh",
                          width: "auto",
                          height: "auto",
                          transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                          transformOrigin: "center center",
                          cursor: zoom > 1 ? "move" : "default",
                        }}
                        onError={() => {
                          setImageLoadError(true);
                        }}
                        draggable={false}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {event.extra_images?.length || 0} images
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEdit(event)}
                            className="text-primary hover:text-primary-dark mr-4"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(event.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Create/Edit Modal */}
          <Modal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setError("");
            }}
            title={selectedEvent ? "Edit Event" : "Create New Event"}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded text-sm">
                  <strong>Error:</strong> {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Event Date <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  selected={formData.event_date}
                  onChange={(date: Date | null) => {
                    if (date) {
                      setFormData({ ...formData, event_date: date });
                    }
                  }}
                  dateFormat="yyyy-MM-dd"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={4}
                  maxLength={1000}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Event Status Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Event Status
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formData.is_upcoming 
                      ? "✨ Upcoming - Event hasn't happened yet (no gallery)" 
                      : "✅ Completed - Event is done (gallery available)"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_upcoming: !formData.is_upcoming })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    formData.is_upcoming
                      ? 'bg-blue-500'
                      : 'bg-green-500'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.is_upcoming ? 'translate-x-1' : 'translate-x-6'
                    }`}
                  />
                </button>
              </div>

              {/* File Upload Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Default Image (Thumbnail)
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    isDragOver
                      ? "border-primary bg-primary/5"
                      : "border-gray-300 dark:border-gray-600 hover:border-primary"
                  }`}
                >
                  {filePreview ? (
                    <div className="space-y-3">
                      <img
                        src={filePreview}
                        alt="Preview"
                        className="mx-auto max-h-48 rounded-lg object-cover"
                      />
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {selectedFile?.name}
                          </span>
                          <span className="text-sm font-medium text-primary">
                            ({selectedFile ? formatFileSize(selectedFile.size) : ""})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={clearFileSelection}
                          className="text-red-500 hover:text-red-700 text-sm underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="mx-auto h-10 w-10 text-gray-400" />
                      <div>
                        <label className="cursor-pointer">
                          <span className="text-primary hover:text-primary-dark font-medium">
                            Click to upload
                          </span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            onChange={handleFileInputChange}
                            className="hidden"
                          />
                        </label>
                        <span className="text-gray-500 dark:text-gray-400">
                          {" "}or drag and drop
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        JPEG, PNG, WebP, GIF up to 6MB
                      </p>
                    </div>
                  )}
                </div>

                {/* Upload Progress */}
                {isUploading && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">Uploading...</span>
                      <span className="text-primary">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* OR Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    OR
                  </span>
                </div>
              </div>

              {/* URL Input (Fallback) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Image URL (optional)
                </label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) =>
                    setFormData({ ...formData, image_url: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder=""
                  disabled={!!selectedFile}
                />
              </div>

              {/* Gallery Images Section */}
              {/* Gallery Images Section */}
              {!formData.is_upcoming ? (
                <div className="border-t border-gray-300 dark:border-gray-600 pt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Gallery Images (Extra Photos)
                  </label>
                  
                  {/* Multi-file upload button */}
                  <div className="mb-4">
                    <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-primary text-sm font-medium rounded-md text-primary bg-white dark:bg-gray-800 hover:bg-primary/10 dark:hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Multiple Images
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        multiple
                        onChange={handleGalleryFileInputChange}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Gallery Upload Progress */}
                  {galleryUploadProgress > 0 && galleryUploadProgress < 100 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400">Uploading gallery images...</span>
                        <span className="text-primary">{galleryUploadProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${galleryUploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Gallery preview grid */}
                  {(existingGalleryImages.length > 0 || galleryPreviews.length > 0) ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {/* Existing gallery images from database */}
                      {existingGalleryImages.map((imageUrl, index) => (
                        <div key={`existing-${index}`} className="relative group">
                          <img
                            src={imageUrl}
                            alt={`Gallery ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveExistingGalleryImage(imageUrl)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-lg"
                            title="Remove"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      
                      {/* New gallery images pending upload */}
                      {galleryPreviews.map((preview, index) => (
                        <div key={`new-${index}`} className="relative group">
                          <img
                            src={preview}
                            alt={`New ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border border-primary"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveGalleryFile(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-lg"
                            title="Remove"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <div className="absolute bottom-1 left-1 bg-primary text-white text-xs px-2 py-0.5 rounded">
                            New
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                      <ImageIcon className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No gallery images added
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border-t border-gray-300 dark:border-gray-600 pt-4 opacity-75">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Gallery Images
                  </label>
                  <div className="text-center py-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Gallery images can be added when the event is marked as completed.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setError("");
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 inline animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            </form>
          </Modal>

          {/* Image Viewer Modal */}
          {isImageViewerOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
              style={{ touchAction: "none" }}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  handleCloseImageViewer();
                }
              }}
            >
              <div className="relative max-w-4xl max-h-full w-full">
                {/* Controls - Top Left Corner */}
                <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                  {/* Go Back Button */}
                  <button
                    onClick={handleCloseImageViewer}
                    className="text-white hover:text-gray-300 bg-black/50 rounded-full p-2 transition-colors"
                    title="Go Back"
                  >
                    <ArrowLeft className="h-6 w-6" />
                  </button>

                  {/* Zoom Controls */}
                  {!imageLoadError && viewingImages.length > 0 && (
                    <>
                      <button
                        onClick={handleZoomIn}
                        className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
                        title="Zoom In"
                      >
                        <ZoomIn className="h-5 w-5" />
                      </button>
                      <button
                        onClick={handleZoomOut}
                        className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
                        title="Zoom Out"
                      >
                        <ZoomOut className="h-5 w-5" />
                      </button>
                      {zoom !== 1 && (
                        <>
                          <button
                            onClick={handleResetZoom}
                            className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
                            title="Reset Zoom"
                          >
                            <RotateCcw className="h-5 w-5" />
                          </button>
                          {/* Zoom Indicator */}
                          <div className="px-3 py-1 bg-black/50 text-white rounded-lg text-sm">
                            {Math.round(zoom * 100)}%
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>

                {/* Navigation Controls */}
                {!imageLoadError && viewingImages.length > 1 && (
                  <>
                    <button
                      onClick={handlePrevImage}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                      title="Previous Image"
                    >
                      <ChevronLeft className="h-8 w-8" />
                    </button>
                    <button
                      onClick={handleNextImage}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                      title="Next Image"
                    >
                      <ChevronRight className="h-8 w-8" />
                    </button>
                    {/* Image Counter */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 px-3 py-1 bg-black/50 text-white rounded-lg text-sm">
                      {viewingIndex + 1} / {viewingImages.length}
                    </div>
                  </>
                )}

                {imageLoadError || viewingImages.length === 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center max-w-md mx-auto">
                    <ImageIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Image Not Available
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Still didn't upload anything
                    </p>
                  </div>
                ) : (
                  <div className="relative w-full h-full">
                    {/* Image Container */}
                    <div
                      className="w-full h-[90vh] overflow-hidden cursor-move flex items-center justify-center touch-none"
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      onWheel={handleWheel}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onTouchCancel={handleTouchEnd}
                      style={{ touchAction: "none", userSelect: "none" }}
                    >
                      <img
                        src={viewingImages[viewingIndex]}
                        alt={`Event image ${viewingIndex + 1}`}
                        className="rounded transition-transform duration-200"
                        style={{
                          maxWidth: "90vw",
                          maxHeight: "85vh",
                          width: "auto",
                          height: "auto",
                          transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                          transformOrigin: "center center",
                          cursor: zoom > 1 ? "move" : "default",
                        }}
                        onError={() => {
                          setImageLoadError(true);
                        }}
                        draggable={false}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Delete Confirmation Dialog */}
          <ConfirmDialog
            isOpen={isDeleteDialogOpen}
            onClose={() => {
              setIsDeleteDialogOpen(false);
              setDeleteTarget(null);
            }}
            onConfirm={confirmDelete}
            title="Delete Event"
            message="Are you sure you want to delete this event? This action cannot be undone."
            confirmText="Delete"
            cancelText="Cancel"
            danger
          />
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
