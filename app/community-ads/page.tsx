"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Loader2,
  Megaphone,
  Upload,
  X,
  ExternalLink,
  MoreVertical,
  Check,
  Ban
} from "lucide-react";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { format } from "date-fns";
import Image from "next/image";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface CommunityAd {
  id: string;
  title: string;
  image_url: string;
  link_url?: string;
  is_active: boolean;
  duration_seconds: number;
  display_order: number;
  created_at: string;
}

export default function CommunityAdsPage() {
  const [ads, setAds] = useState<CommunityAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAd, setSelectedAd] = useState<CommunityAd | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    image_url: "",
    link_url: "",
    is_active: true,
    duration_seconds: 10,
    display_order: 1,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  useEffect(() => {
    fetchAds();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchAds = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("community_ads")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) {
        console.error("Supabase error details:", error.message, error.details, error.hint);
        throw error;
      }
      setAds(data || []);
    } catch (err: any) {
      console.error("Error fetching ads:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setAds((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);

        const newItems = arrayMove(items, oldIndex, newIndex);

        // Update display_order for all items based on new index
        const updates = newItems.map((item, index) => ({
            id: item.id,
            display_order: index + 1,
            // We only need update these two, but supabase upsert needs all non-nullable if we don't specify columns?
            // Actually upsert updates existing rows if PK matches.
            // Be careful to include other required fields if RLS/Database constraints are strict, 
            // but for partial update we usually use .update() loop or upsert with minimal data if allowed.
            // Safest for Supabase here is to likely iterate or use a specific RPC, but upsert with just ID and field works if no other constraints.
            // Let's assume we need to pass at least what's changed.
            title: item.title, // Pass minimal required just in case or existing data
            image_url: item.image_url,
            is_active: item.is_active,
            duration_seconds: item.duration_seconds
        }));
        
        // Optimistic UI update is already done by return newItems.
        // We trigger the DB update asynchronously
        updateDisplayOrders(updates);

        return newItems.map((item, index) => ({
             ...item, 
             display_order: index + 1 
        }));
      });
    }
  };

  const updateDisplayOrders = async (
    items: { id: string; display_order: number; title: string, image_url: string, is_active: boolean, duration_seconds: number }[]
  ) => {
    try {
      // Upsert is efficient for batch updates
      const { error } = await supabase
        .from("community_ads")
        .upsert(
            items.map(i => ({
                id: i.id,
                display_order: i.display_order,
                title: i.title,
                image_url: i.image_url,
                is_active: i.is_active,
                duration_seconds: i.duration_seconds,
                updated_at: new Date().toISOString()
            }))
        );

      if (error) throw error;
    } catch (err) {
      console.error("Error updating sort order:", err);
      // Revert or show error? For now just log.
      fetchAds(); // Re-fetch to sync state if error
    }
  };

  const handleEdit = (ad: CommunityAd) => {
    setSelectedAd(ad);
    setFormData({
      title: ad.title,
      image_url: ad.image_url,
      link_url: ad.link_url || "",
      is_active: ad.is_active,
      duration_seconds: ad.duration_seconds || 10,
      display_order: ad.display_order || 1,
    });
    setFilePreview(ad.image_url);
    setSelectedFile(null);
    setIsModalOpen(true);
    setError(null);
  };

  const handleDelete = (id: string) => {
    setDeleteTarget(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      // Get the image URL to delete from storage
      const adToDelete = ads.find(a => a.id === deleteTarget);
      
      const { error } = await supabase
        .from("community_ads")
        .delete()
        .eq("id", deleteTarget);

      if (error) throw error;

      // Try to delete image from storage if it exists
      if (adToDelete?.image_url) {
        try {
            const url = new URL(adToDelete.image_url);
            // Extract path after bucket name if possible, or just the filename
            // Assuming simplified structure: [bucket-name]/[filename]
            const pathParts = url.pathname.split('/');
            const fileName = pathParts[pathParts.length - 1];
            if (fileName) {
                await supabase.storage.from("community-ads").remove([fileName]);
            }
        } catch (e) {
            console.warn("Could not parse image URL for deletion", e);
        }
      }

      setAds(ads.filter((ad) => ad.id !== deleteTarget));
      setIsDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (err: any) {
      console.error("Error deleting ad:", err);
      alert("Failed to delete ad");
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
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleFileSelect(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFileSelect = (file: File) => {
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setError("File size must be less than 5MB");
      return;
    }
    setSelectedFile(file);
    setError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError, data } = await supabase.storage
      .from("community-ads")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("community-ads")
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setUploadProgress(0);

    try {
      let finalImageUrl = formData.image_url;

      // Validate: Must have an image (either existing or new file)
      if (!selectedFile && !finalImageUrl) {
        throw new Error("An image is required.");
      }

      // Upload new image if selected
      if (selectedFile) {
        // Mock progress for better UX
        const interval = setInterval(() => {
            setUploadProgress(prev => Math.min(prev + 10, 90));
        }, 100);
        
        try {
            finalImageUrl = await uploadImage(selectedFile);
        } finally {
            clearInterval(interval);
            setUploadProgress(100);
        }
      }

      // Multiple active ads are now allowed for carousel display on main website

      const adData = {
        title: formData.title.trim(),
        image_url: finalImageUrl,
        link_url: formData.link_url.trim() || null,
        is_active: formData.is_active,
        duration_seconds: parseInt(formData.duration_seconds.toString()) || 10,
        display_order: parseInt(formData.display_order.toString()) || 1,
      };

      if (selectedAd) {
        const { error } = await supabase
          .from("community_ads")
          .update(adData)
          .eq("id", selectedAd.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("community_ads")
          .insert(adData);
        if (error) throw error;
      }

      await fetchAds();
      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      console.error("Error saving ad (full):", err);
      console.error("Error saving ad (JSON):", JSON.stringify(err, null, 2));
      setError(err.message || "Failed to save ad. Check console for details.");
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      image_url: "",
      link_url: "",
      is_active: true,
      duration_seconds: 10,
      display_order: 1,
    });
    setSelectedAd(null);
    setSelectedFile(null);
    setFilePreview(null);
    setError(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const filteredAds = ads.filter((ad) =>
    ad.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ProtectedRoute>
      <Layout>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Megaphone className="h-8 w-8 text-primary" />
            Community Ads
          </h1>
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg flex items-center transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add New Ad
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
            <div className="relative max-w-xl">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                type="text"
                placeholder="Search ads by title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm transition-all"
                />
            </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
             <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between hover:shadow-md transition-shadow">
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Ads</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{ads.length}</p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Megaphone className="h-6 w-6 text-blue-500" />
                </div>
            </div>
             <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between hover:shadow-md transition-shadow">
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">In Carousel</p>
                    <p className="text-3xl font-bold text-green-500">{ads.filter(a => a.is_active).length}</p>
                    <p className="text-xs text-gray-400 mt-1">Active ads rotating</p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <Check className="h-6 w-6 text-green-500" />
                </div>
            </div>
        </div>

        {/* Ads Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredAds.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                No ads found
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Get started by creating a new community ad.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10">
                      {/* Drag Handle Column */}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Preview
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Title
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Link
                    </th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Duration
                    </th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Order
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    <SortableContext
                      items={filteredAds}
                      strategy={verticalListSortingStrategy}
                    >
                      {filteredAds.map((ad) => {
                        // Calculate active order: Count how many *active* ads appear before this one in the current filtered list
                        const activeIndex = filteredAds
                          .slice(0, filteredAds.indexOf(ad))
                          .filter(a => a.is_active).length + 1;

                        return (
                          <SortableAdRow
                            key={ad.id}
                            ad={ad}
                            activeOrder={ad.is_active ? activeIndex : null}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            isSearching={searchTerm.length > 0}
                          />
                        );
                      })}
                    </SortableContext>
                </tbody>
              </table>
                  </DndContext>
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
        <Modal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setError(null);
            }}
            title={selectedAd ? "Edit Ad" : "New Community Ad"}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
               {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded text-sm">
                  <strong>Error:</strong> {error}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. Summer Festival Promo"
                />
              </div>

               {/* Image Upload */}
               <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ad Image <span className="text-red-500">*</span>
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
                        className="mx-auto max-h-48 rounded-lg object-contain bg-gray-50 dark:bg-gray-900/50"
                      />
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-2">
                           <span className="text-sm font-medium text-primary">
                            {selectedFile ? formatFileSize(selectedFile.size) : "Current Image"}
                          </span>
                        </div>
                         <button
                          type="button"
                          onClick={() => {
                              setSelectedFile(null);
                              setFilePreview(null);
                              // If editing, reverting clears the image for now, but valid state requires one. 
                              // Ideally we revert to original if editing. But "Remove" usually implies clearing selection.
                          }}
                          className="text-red-500 hover:text-red-700 text-sm underline"
                        >
                          Remove / Change
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <Upload className="h-6 w-6 text-gray-400" />
                      </div>
                      <div>
                        <label className="cursor-pointer">
                          <span className="text-primary hover:text-primary-dark font-medium">
                            Click to upload
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileInputChange}
                            className="hidden"
                          />
                        </label>
                        <span className="text-gray-500 dark:text-gray-400">
                          {" "}or drag and drop
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        PNG, JPG, WebP up to 5MB
                      </p>
                    </div>
                  )}
                </div>
                 {/* Upload Progress */}
                 {uploadProgress > 0 && uploadProgress < 100 && (
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

                {/* Link URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Link URL (Optional)
                </label>
                <input
                  type="url"
                  value={formData.link_url}
                  onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="https://example.com/promo"
                />
              </div>

              {/* Display Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Display Duration (seconds)
                </label>
                <input
                  type="number"
                  min={3}
                  max={60}
                  value={formData.duration_seconds}
                  onChange={(e) => setFormData({ ...formData, duration_seconds: Math.min(60, Math.max(3, parseInt(e.target.value) || 10)) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="10"
                />
                <p className="text-xs text-gray-400 mt-1">How long this ad shows (3-60s)</p>
              </div>

              {/* Is Active Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Include in Carousel
                    </label>
                     {/* Show Carousel Sequence if active */}
                     {formData.is_active && selectedAd && (
                         <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                             Sequence #{ads.filter(a => a.is_active && a.display_order <= formData.display_order).length}
                         </span>
                     )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formData.is_active 
                      ? "✨ Active - Will rotate in the ad carousel (10s each)" 
                      : "💤 Inactive - Hidden from carousel"}
                  </p>
                </div>
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    <div className={`block w-14 h-8 rounded-full transition-colors ${formData.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${formData.is_active ? 'transform translate-x-6' : ''}`}></div>
                  </div>
                </label>
              </div>




              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 inline animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    "Save Ad"
                  )}
                </button>
              </div>

            </form>
        </Modal>

        {/* Delete Confirmation */}
        <ConfirmDialog
            isOpen={isDeleteDialogOpen}
            onClose={() => {
              setIsDeleteDialogOpen(false);
              setDeleteTarget(null);
            }}
            onConfirm={confirmDelete}
            title="Delete Ad"
            message="Are you sure you want to delete this ad? This action cannot be undone."
            confirmText="Delete"
            cancelText="Cancel"
            danger
          />

        {/* Custom Alert Popup */}
        {showAlert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {/* Header with gradient */}
              <div className="bg-gradient-to-r from-blue-500 to-primary p-6 text-center">
                <div className="text-6xl mb-3">💡</div>
                <h3 className="text-xl font-bold text-white">Heads Up!</h3>
              </div>
              
              {/* Content */}
              <div className="p-6">
                <p className="text-gray-700 dark:text-gray-300 text-center whitespace-pre-line leading-relaxed">
                  {alertMessage}
                </p>
              </div>
              
              {/* Footer */}
              <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 flex justify-center">
                <button
                  onClick={() => {
                    setShowAlert(false);
                    // Re-submit the form with the toggled-off state
                    // Create a synthetic event to re-trigger handleSubmit
                    const form = document.querySelector('form');
                    if (form) {
                      form.requestSubmit();
                    }
                  }}
                  className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors shadow-md hover:shadow-lg"
                >
                  Got it! Save as Inactive ✨
                </button>
              </div>
            </div>
          </div>
        )}

      </Layout>
    </ProtectedRoute>
  );
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function SortableAdRow({
  ad,
  activeOrder,
  onEdit,
  onDelete,
  isSearching,
}: {
  ad: CommunityAd;
  activeOrder: number | null;
  onEdit: (ad: CommunityAd) => void;
  onDelete: (id: string) => void;
  isSearching: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ad.id, disabled: isSearching });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto", 
    position: "relative" as "relative",
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`transition-colors ${
        ad.is_active
          ? "bg-green-50 dark:bg-green-900/10"
          : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
      } ${isDragging ? "shadow-lg opacity-75 bg-blue-50 dark:bg-blue-900/20" : ""}`}
    >
      <td className="px-6 py-4 whitespace-nowrap w-10">
        {!isSearching && (
          <div {...attributes} {...listeners} className="cursor-grab hover:text-primary text-gray-400">
            <GripVertical className="h-5 w-5" />
          </div>
        )}
      </td>
      <td className={`px-6 py-4 whitespace-nowrap ${ad.is_active ? 'border-l-4 border-green-500' : ''}`}>
        <div className="h-16 w-24 relative rounded overflow-hidden bg-gray-100 dark:bg-gray-700">
          <img
            src={ad.image_url}
            alt={ad.title}
            className="h-full w-full object-cover"
          />
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900 dark:text-white">
          {ad.title}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Created {format(new Date(ad.created_at), "MMM d, yyyy")}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {ad.link_url ? (
          <a
            href={ad.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-500 hover:underline flex items-center"
          >
            Open Link <ExternalLink className="h-3 w-3 ml-1" />
          </a>
        ) : (
          <span className="text-sm text-gray-400">No link</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center">
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {ad.duration_seconds || 10}s
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center">
        {activeOrder ? (
          <span className="inline-flex items-center justify-center w-8 h-8 text-sm font-bold text-primary bg-primary/10 rounded-full">
            {activeOrder}
          </span>
        ) : (
           <span className="inline-flex items-center justify-center w-8 h-8 text-xs text-gray-400 bg-gray-100 dark:bg-gray-700/50 rounded-full" title="Inactive - Not in carousel">
            -
          </span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
            ad.is_active
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
          }`}
        >
          {ad.is_active ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button
          onClick={() => onEdit(ad)}
          className="text-primary hover:text-primary-dark mr-4 transition-colors"
          title="Edit"
        >
          <Edit className="h-5 w-5" />
        </button>
        <button
          onClick={() => onDelete(ad.id)}
          className="text-red-600 hover:text-red-700 transition-colors"
          title="Delete"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </td>
    </tr>
  );
}
