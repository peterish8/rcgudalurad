"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/components/Toast";
import { useEffect, useState } from "react";
import { api, convex, deleteFilesByUrl, errorMessage, getToken, uploadFile } from "@/lib/convex";
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
  const toast = useToast();
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
      const data = await convex.query(api.events.listAll, { token: getToken() });

      // Only set events if data exists, otherwise empty array
      setEvents(data || []);
    } catch (err: any) {
      console.error("Error fetching events:", err);
      setFetchError(
        errorMessage(err, "Failed to fetch events")
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
      await convex.mutation(api.events.remove, { token: getToken(), id: deleteTarget });

      await fetchEvents();
      setDeleteTarget(null);
      toast.success("Event deleted.", { live: true });
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
      setUploadProgress(30);
      const publicUrl = await uploadFile(file);
      setUploadProgress(100);
      return publicUrl;
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

  // Stored files are deleted by their public URL (see deleteFilesByUrl)
  const extractFilePathFromUrl = (publicUrl: string): string => publicUrl;

  // Upload multiple gallery files
  const uploadGalleryFiles = async (files: File[], eventId: string): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    const totalFiles = files.length;
    
    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      // Update progress
      setGalleryUploadProgress(Math.round(((i + 0.5) / totalFiles) * 100));

      uploadedUrls.push(await uploadFile(file));
      
      // Update progress
      setGalleryUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
    }
    
    return uploadedUrls;
  };

  // Delete files from storage
  const deleteStorageFiles = async (filePaths: string[]): Promise<void> => {
    if (filePaths.length === 0) return;
    
    await deleteFilesByUrl(filePaths);
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
        const data = await convex.mutation(api.events.create, {
          token: getToken(),
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          event_date: format(formData.event_date, "yyyy-MM-dd"),
          image_url: null,
          extra_images: null,
          is_upcoming: formData.is_upcoming,
        });
        eventId = data.id;
      }

      // Step 2: Upload default image (if new file selected)
      if (selectedFile) {
        imageUrl = await uploadFile(selectedFile);
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

      await convex.mutation(api.events.update, { token: getToken(), id: eventId, ...eventData });

      await fetchEvents();
      setIsModalOpen(false);
      toast.success(selectedEvent ? "Event updated." : "Event added.", { live: true });
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
          <PageHeader
            title="Events"
            description="Add events before they happen. Afterwards, mark them completed and add photos."
            showsOn="Homepage › Upcoming events, Event details and Gallery"
            actions={
              <button type="button" onClick={handleCreate} className="btn-primary">
                <Plus className="h-5 w-5" aria-hidden />
                Add event
              </button>
            }
          />

          {/* Search */}
          <div className="relative max-w-md">
            <label htmlFor="events-search" className="sr-only">Search events</label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" aria-hidden />
            <input
              id="events-search"
              type="search"
              placeholder="Search by title"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="field pl-10"
            />
          </div>

          {/* Error message for form operations */}
          {error && (
            <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Fetch error message */}
          {fetchError && (
            <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg">
              <strong>Error fetching events:</strong> {fetchError}
            </div>
          )}

          {/* Events table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
            </div>
          ) : fetchError ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <CalendarIcon className="mx-auto h-12 w-12 text-red-400" aria-hidden />
              <h3 className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">
                Unable to load events
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Please check your connection and try again.
              </p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" aria-hidden />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                No events found
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Get started by creating a new event.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <caption className="sr-only">Events, newest date first</caption>
                  <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Event</th>
                      <th scope="col" className="hidden px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 sm:table-cell">Date</th>
                      <th scope="col" className="hidden px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 sm:table-cell">Status</th>
                      <th scope="col" className="hidden px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 md:table-cell">Photos</th>
                      <th scope="col" className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredEvents.map((event) => {
                      const photos = [
                        ...(event.image_url ? [event.image_url] : []),
                        ...(event.extra_images ?? []),
                      ];
                      return (
                        <tr key={event.id}>
                          <td className="max-w-[11rem] px-3 py-3 sm:max-w-xs sm:px-4">
                            <p className="truncate text-base font-medium text-gray-900 dark:text-white">{event.title}</p>
                            {event.description && (
                              <p className="hidden truncate text-sm text-gray-600 dark:text-gray-400 lg:block">{event.description}</p>
                            )}
                            <p className="text-sm text-gray-600 dark:text-gray-400 sm:hidden">
                              {format(new Date(event.event_date), "d MMM yyyy")} · {event.is_upcoming ? "Upcoming" : "Completed"}
                            </p>
                          </td>
                          <td className="hidden whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300 sm:table-cell">
                            {format(new Date(event.event_date), "d MMM yyyy")}
                          </td>
                          <td className="hidden whitespace-nowrap px-4 py-3 text-sm sm:table-cell">
                            {event.is_upcoming ? (
                              <span className="inline-flex items-center rounded-full bg-sky-100 px-2.5 py-0.5 font-medium text-sky-900 dark:bg-sky-900/40 dark:text-sky-200">
                                Upcoming
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                Completed
                              </span>
                            )}
                          </td>
                          <td className="hidden whitespace-nowrap px-4 py-3 text-sm md:table-cell">
                            {photos.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => handleViewImage(photos)}
                                className="font-medium text-primary underline-offset-2 hover:underline"
                              >
                                View {photos.length} {photos.length === 1 ? "photo" : "photos"}
                                <span className="sr-only"> for {event.title}</span>
                              </button>
                            ) : (
                              <span className="text-gray-600 dark:text-gray-400">None yet</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-2 py-3 text-right sm:px-4">
                            <div className="flex justify-end gap-1">
                              <button type="button" onClick={() => handleEdit(event)} className="btn-row-edit">
                                <Edit className="h-4 w-4" aria-hidden />
                                Edit<span className="sr-only"> {event.title}</span>
                              </button>
                              <button type="button" onClick={() => handleDelete(event.id)} className="btn-row-delete">
                                <Trash2 className="h-4 w-4" aria-hidden />
                                Delete<span className="sr-only"> {event.title}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
            title={selectedEvent ? "Edit event" : "Add event"}
            size="lg"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
                  <strong>Error:</strong> {error}
                </div>
              )}

              <div>
                <label htmlFor="events-title" className="label">
                  Title <span className="text-red-500">*</span>
                </label>
                <input id="events-title"
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
                <label htmlFor="events-event-date" className="label">
                  Date <span className="text-red-500">*</span>
                </label>
                <DatePicker id="events-event-date"
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
                <label htmlFor="events-description" className="label">
                  Description
                </label>
                <textarea id="events-description"
                  rows={4}
                  maxLength={1000}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <fieldset>
                <legend className="label">Has this event happened yet?</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    { value: true, title: "Upcoming", hint: "Shows in the homepage's Upcoming events box." },
                    { value: false, title: "Completed", hint: "Shows in Event details and Gallery. You can add photos." },
                  ].map((opt) => (
                    <label
                      key={opt.title}
                      className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors duration-150 ${
                        formData.is_upcoming === opt.value
                          ? "border-gray-900 bg-gray-50 dark:border-white dark:bg-gray-700/50"
                          : "border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="event-status"
                        checked={formData.is_upcoming === opt.value}
                        onChange={() => setFormData({ ...formData, is_upcoming: opt.value })}
                        className="mt-1 h-4 w-4 accent-[rgb(var(--primary))]"
                      />
                      <span>
                        <span className="block text-base font-medium text-gray-900 dark:text-white">{opt.title}</span>
                        <span className="block text-sm text-gray-600 dark:text-gray-400">{opt.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* File Upload Section */}
              <div>
                <label className="label">
                  Main photo
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
                      <Upload className="mx-auto h-10 w-10 text-gray-400" aria-hidden />
                      <div>
                        <label className="cursor-pointer rounded focus-within:outline focus-within:outline-2 focus-within:outline-offset-2">
                          <span className="text-primary hover:text-primary-dark font-medium">
                            Click to upload
                          </span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            onChange={handleFileInputChange}
                            className="sr-only"
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
                        className="bg-primary h-2 rounded-full transition-[width] duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>



              {/* Gallery Images Section */}
              {/* Gallery Images Section */}
              {!formData.is_upcoming ? (
                <div className="border-t border-gray-300 dark:border-gray-600 pt-4">
                  <label className="label">
                    More photos for the gallery
                  </label>
                  
                  {/* Multi-file upload button */}
                  <div className="mb-4">
                    <label className="btn-secondary cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-offset-2">
                      <Upload className="h-4 w-4 mr-2" aria-hidden />
                      Choose photos
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        multiple
                        onChange={handleGalleryFileInputChange}
                        className="sr-only"
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
                          className="bg-primary h-2 rounded-full transition-[width] duration-300"
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
                          <div className="absolute bottom-1 left-1 bg-primary text-on-primary text-xs px-2 py-0.5 rounded">
                            New
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                      <ImageIcon className="mx-auto h-10 w-10 text-gray-400 mb-2" aria-hidden />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No gallery images added
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border-t border-gray-300 dark:border-gray-600 pt-4 opacity-75">
                  <label className="label">
                    More photos for the gallery
                  </label>
                  <div className="text-center py-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Gallery images can be added when the event is marked as completed.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setError("");
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 inline animate-spin mr-2" aria-hidden />
                      Saving…
                    </>
                  ) : (
                    (selectedEvent ? "Save changes" : "Add event")
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
                    title="Go Back" aria-label="Go Back"
                  >
                    <ArrowLeft className="h-6 w-6" aria-hidden />
                  </button>

                  {/* Zoom Controls */}
                  {!imageLoadError && viewingImages.length > 0 && (
                    <>
                      <button
                        onClick={handleZoomIn}
                        className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
                        title="Zoom In" aria-label="Zoom In"
                      >
                        <ZoomIn className="h-5 w-5" aria-hidden />
                      </button>
                      <button
                        onClick={handleZoomOut}
                        className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
                        title="Zoom Out" aria-label="Zoom Out"
                      >
                        <ZoomOut className="h-5 w-5" aria-hidden />
                      </button>
                      {zoom !== 1 && (
                        <>
                          <button
                            onClick={handleResetZoom}
                            className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
                            title="Reset Zoom" aria-label="Reset Zoom"
                          >
                            <RotateCcw className="h-5 w-5" aria-hidden />
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
                      title="Previous Image" aria-label="Previous Image"
                    >
                      <ChevronLeft className="h-8 w-8" aria-hidden />
                    </button>
                    <button
                      onClick={handleNextImage}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                      title="Next Image" aria-label="Next Image"
                    >
                      <ChevronRight className="h-8 w-8" aria-hidden />
                    </button>
                    {/* Image Counter */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 px-3 py-1 bg-black/50 text-white rounded-lg text-sm">
                      {viewingIndex + 1} / {viewingImages.length}
                    </div>
                  </>
                )}

                {imageLoadError || viewingImages.length === 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center max-w-md mx-auto">
                    <ImageIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" aria-hidden />
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
            title="Delete this event?"
            message="It will disappear from the website straight away. This can't be undone."
            confirmText="Delete event"
            cancelText="Cancel"
            danger
          />

          {/* Image Viewer Modal - Moved outside table loop */}
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
                    title="Go Back" aria-label="Go Back"
                  >
                    <ArrowLeft className="h-6 w-6" aria-hidden />
                  </button>

                  {/* Zoom Controls */}
                  {!imageLoadError && viewingImages.length > 0 && (
                    <>
                      <button
                        onClick={handleZoomIn}
                        className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
                        title="Zoom In" aria-label="Zoom In"
                      >
                        <ZoomIn className="h-5 w-5" aria-hidden />
                      </button>
                      <button
                        onClick={handleZoomOut}
                        className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
                        title="Zoom Out" aria-label="Zoom Out"
                      >
                        <ZoomOut className="h-5 w-5" aria-hidden />
                      </button>
                      {zoom !== 1 && (
                        <>
                          <button
                            onClick={handleResetZoom}
                            className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
                            title="Reset Zoom" aria-label="Reset Zoom"
                          >
                            <RotateCcw className="h-5 w-5" aria-hidden />
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
                      title="Previous Image" aria-label="Previous Image"
                    >
                      <ChevronLeft className="h-8 w-8" aria-hidden />
                    </button>
                    <button
                      onClick={handleNextImage}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                      title="Next Image" aria-label="Next Image"
                    >
                      <ChevronRight className="h-8 w-8" aria-hidden />
                    </button>
                    {/* Image Counter */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 px-3 py-1 bg-black/50 text-white rounded-lg text-sm">
                      {viewingIndex + 1} / {viewingImages.length}
                    </div>
                  </>
                )}

                {imageLoadError || viewingImages.length === 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center max-w-md mx-auto">
                    <ImageIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" aria-hidden />
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
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
