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
  Image as ImageIcon,
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Upload,
} from "lucide-react";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface GalleryItem {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  created_at: string;
}

export default function GalleryPage() {
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [touchStartDistance, setTouchStartDistance] = useState<number | null>(null);
  const [touchStartZoom, setTouchStartZoom] = useState(1);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image_url: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    fetchGallery();
  }, []);

  async function fetchGallery() {
    try {
      setFetchError(null);
      const { data, error } = await supabase
        .from("gallery")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Only set gallery if data exists, otherwise empty array
      setGallery(data || []);
    } catch (err: any) {
      console.error("Error fetching gallery:", err);
      setFetchError(err.message || err.code || "Failed to fetch gallery from Supabase");
      setGallery([]);
    } finally {
      setLoading(false);
    }
  }

  const handleCreate = () => {
    setSelectedItem(null);
    setFormData({
      title: "",
      description: "",
      image_url: "",
    });
    setSelectedFile(null);
    setFilePreview(null);
    setError("");
    setIsModalOpen(true);
  };

  const handleEdit = (item: GalleryItem) => {
    setSelectedItem(item);
    setFormData({
      title: item.title,
      description: item.description || "",
      image_url: item.image_url,
    });
    setSelectedFile(null);
    setFilePreview(null);
    setError("");
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteTarget(id);
    setIsDeleteDialogOpen(true);
  };

  const handleViewImage = (imageUrl: string) => {
    if (!imageUrl || imageUrl.trim() === "") {
      setImageLoadError(true);
      setViewingImage(null);
    } else {
      setImageLoadError(false);
      setViewingImage(imageUrl);
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

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
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
        .from("gallery")
        .delete()
        .eq("id", deleteTarget);

      if (error) throw error;

      await fetchGallery();
      setDeleteTarget(null);
    } catch (err: any) {
      console.error("Error deleting gallery item:", err);
      setError(err.message || err.code || "Failed to delete gallery item");
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
        .from("gallery-images")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      setUploadProgress(80);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("gallery-images")
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      let imageUrl = formData.image_url.trim();

      // If a file is selected, upload it first
      if (selectedFile) {
        imageUrl = await uploadFileToStorage(selectedFile);
      }

      // Validate that we have an image URL
      if (!imageUrl) {
        throw new Error("Please upload an image or provide an image URL.");
      }

      const galleryData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        image_url: imageUrl,
      };

      if (selectedItem) {
        // Update
        const { error } = await supabase
          .from("gallery")
          .update(galleryData)
          .eq("id", selectedItem.id);

        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase.from("gallery").insert(galleryData);

        if (error) throw error;
      }

      await fetchGallery();
      setIsModalOpen(false);
      setFormData({
        title: "",
        description: "",
        image_url: "",
      });
      setSelectedItem(null);
      clearFileSelection();
    } catch (err: any) {
      console.error("Error saving gallery item:", err);
      setError(err.message || err.code || "Failed to save gallery item");
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  const filteredGallery = gallery.filter((item) =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Manage Gallery
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Create, edit, and delete gallery images
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
              Add New Image
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search gallery..."
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
              <strong>Error fetching gallery from Supabase:</strong> {fetchError}
            </div>
          )}

          {/* Gallery grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : fetchError ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <ImageIcon className="mx-auto h-12 w-12 text-red-400" />
              <h3 className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">
                Unable to load gallery
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Please check your Supabase connection and try again.
              </p>
            </div>
          ) : filteredGallery.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                No gallery images found
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Get started by adding a new image.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGallery.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <div 
                    className="relative aspect-video bg-gray-100 dark:bg-gray-700 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => handleViewImage(item.image_url)}
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                        draggable={false}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
                        {item.description}
                      </p>
                    )}
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(item);
                        }}
                        className="p-2 text-primary hover:bg-primary/10 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create/Edit Modal */}
          <Modal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setError("");
            }}
            title={
              selectedItem ? "Edit Gallery Image" : "Add New Gallery Image"
            }
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

              {/* File Upload Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Upload Image
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
                  placeholder="https://example.com/image.jpg"
                  disabled={!!selectedFile}
                />
                {formData.image_url && !selectedFile && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Preview:
                    </p>
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded border border-gray-200 dark:border-gray-700"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={4}
                  maxLength={500}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

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
                  setIsImageViewerOpen(false);
                  setViewingImage(null);
                  setImageLoadError(false);
                  setZoom(1);
                  setPosition({ x: 0, y: 0 });
                  // Restore page scroll and touch
                  if (typeof window !== "undefined") {
                    document.body.style.overflow = "";
                    document.body.style.touchAction = "";
                  }
                }
              }}
            >
              <div className="relative max-w-4xl max-h-full w-full">
                {/* Controls - Top Left Corner */}
                <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                  {/* Go Back Button */}
                  <button
                    onClick={() => {
                      setIsImageViewerOpen(false);
                      setViewingImage(null);
                      setImageLoadError(false);
                      setZoom(1);
                      setPosition({ x: 0, y: 0 });
                    }}
                    className="text-white hover:text-gray-300 bg-black/50 rounded-full p-2 transition-colors"
                    title="Go Back"
                  >
                    <ArrowLeft className="h-6 w-6" />
                  </button>

                  {/* Zoom Controls */}
                  {!imageLoadError && viewingImage && (
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

                {imageLoadError || !viewingImage ? (
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
                        src={viewingImage}
                        alt="Full size"
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
            title="Delete Gallery Image"
            message="Are you sure you want to delete this gallery image? This action cannot be undone."
            confirmText="Delete"
            cancelText="Cancel"
            danger
          />
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
