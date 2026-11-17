"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/components/Toast";
import { useEffect, useState, useRef } from "react";
import { api, convex, deleteFilesByUrl, errorMessage, getToken, uploadFile } from "@/lib/convex";
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
  Ban,
  ArrowUp,
  ArrowDown,
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
  const toast = useToast();
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
      const data = await convex.query(api.communityAds.listAll, { token: getToken() });
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

  /** Moves an ad one place up (-1) or down (+1); same save path as drag and drop. */
  const moveAd = (id: string, delta: -1 | 1) => {
    const from = ads.findIndex((a) => a.id === id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= ads.length) return;
    const reordered = arrayMove(ads, from, to).map((item, index) => ({ ...item, display_order: index + 1 }));
    setAds(reordered);
    updateDisplayOrders(reordered);
    toast.success(`Moved "${ads[from].title}" ${delta < 0 ? "up" : "down"}.`, { live: true });
  };

  const updateDisplayOrders = async (
    items: { id: string; display_order: number; title: string, image_url: string, is_active: boolean, duration_seconds: number }[]
  ) => {
    try {
      await convex.mutation(api.communityAds.reorder, {
        token: getToken(),
        items: items.map((i) => ({ id: i.id, display_order: i.display_order })),
      });
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
      
      await convex.mutation(api.communityAds.remove, { token: getToken(), id: deleteTarget });

      // Delete the stored image too (ignored if it isn't a Convex storage URL)
      if (adToDelete?.image_url) {
        await deleteFilesByUrl([adToDelete.image_url]);
      }

      setAds(ads.filter((ad) => ad.id !== deleteTarget));
      toast.success("Ad deleted.", { live: true });
      setIsDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (err: any) {
      console.error("Error deleting ad:", err);
      toast.error("Couldn't delete the ad. Please try again.");
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
    return await uploadFile(file);
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
        await convex.mutation(api.communityAds.update, { token: getToken(), id: selectedAd.id, ...adData });
      } else {
        await convex.mutation(api.communityAds.create, { token: getToken(), ...adData });
      }

      await fetchAds();
      setIsModalOpen(false);
      toast.success(selectedAd ? "Ad updated." : "Ad added.", { live: true });
      resetForm();
    } catch (err: any) {
      console.error("Error saving ad (full):", err);
      setError(errorMessage(err, "Failed to save ad. Check console for details."));
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
        <PageHeader
          title="Partner ads"
          description="Image slides that rotate in the Community Partner box. Drag a row, or use the arrows, to change the order."
          showsOn="Homepage › Community Partner box"
          actions={
            <button
              type="button"
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              className="btn-primary"
            >
              <Plus className="h-5 w-5" aria-hidden />
              Add ad
            </button>
          }
        />

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md">
            <label htmlFor="ads-search" className="sr-only">Search ads</label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" aria-hidden />
            <input
              id="ads-search"
              type="search"
              placeholder="Search by title"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="field pl-10"
            />
          </div>
          <p className="tabular text-sm text-gray-700 dark:text-gray-300">
            {ads.filter((a) => a.is_active).length} of {ads.length} showing on the website
          </p>
        </div>

        {/* Ads Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
            </div>
          ) : filteredAds.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="mx-auto h-12 w-12 text-gray-400" aria-hidden />
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
              <table className="min-w-full">
                <caption className="sr-only">Partner ads in the order they rotate</caption>
                <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40">
                  <tr>
                    <th scope="col" className="px-2 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 sm:px-4">Order</th>
                    <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Ad</th>
                    <th scope="col" className="hidden px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 md:table-cell">Shows for</th>
                    <th scope="col" className="hidden px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 sm:table-cell">Status</th>
                    <th scope="col" className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
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
                            isFirst={ads[0]?.id === ad.id}
                            isLast={ads[ads.length - 1]?.id === ad.id}
                            onMove={moveAd}
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
            title={selectedAd ? "Edit ad" : "Add ad"}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
               {error && (
                <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
                  <strong>Error:</strong> {error}
                </div>
              )}

              {/* Title */}
              <div>
                <label htmlFor="commun-title" className="label">
                  Title <span className="text-red-500">*</span>
                </label>
                <input id="commun-title"
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="field"
                  placeholder="e.g. Summer Festival Promo"
                />
              </div>

               {/* Image Upload */}
               <div>
                <label className="label">
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
                        <Upload className="h-6 w-6 text-gray-400" aria-hidden />
                      </div>
                      <div>
                        <label className="cursor-pointer rounded focus-within:outline focus-within:outline-2 focus-within:outline-offset-2">
                          <span className="text-primary hover:text-primary-dark font-medium">
                            Click to upload
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileInputChange}
                            className="sr-only"
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
                        className="bg-primary h-2 rounded-full transition-[width] duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
               </div>

                {/* Link URL */}
              <div>
                <label htmlFor="commun-link-url-optional" className="label">
                  Link URL (Optional)
                </label>
                <input id="commun-link-url-optional"
                  type="url"
                  value={formData.link_url}
                  onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                  className="field"
                  placeholder="https://example.com/promo"
                />
              </div>

              {/* Display Duration */}
              <div>
                <label htmlFor="commun-display-duration-seconds" className="label">
                  How long it shows (seconds)
                </label>
                <input id="commun-display-duration-seconds"
                  type="number"
                  min={3}
                  max={60}
                  value={formData.duration_seconds}
                  onChange={(e) => setFormData({ ...formData, duration_seconds: Math.min(60, Math.max(3, parseInt(e.target.value) || 10)) })}
                  className="field"
                  placeholder="10"
                />
                <p className="text-xs text-gray-400 mt-1">How long this ad shows (3-60s)</p>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-300 p-3 dark:border-gray-600">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="mt-1 h-4 w-4 accent-[rgb(var(--primary))]"
                />
                <span>
                  <span className="block text-base font-medium text-gray-900 dark:text-white">Show on the website</span>
                  <span className="block text-sm text-gray-600 dark:text-gray-400">
                    Untick to keep the ad here without showing it.
                  </span>
                </span>
              </label>

              <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
                    (selectedAd ? "Save changes" : "Add ad")
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
            title="Delete this ad?"
            message="It will disappear from the website straight away, along with its image. This can't be undone."
            confirmText="Delete ad"
            cancelText="Cancel"
            danger
          />

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
  onEdit,
  onDelete,
  onMove,
  isFirst,
  isLast,
  isSearching,
}: {
  ad: CommunityAd;
  activeOrder?: number | null;
  onEdit: (ad: CommunityAd) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, delta: -1 | 1) => void;
  isFirst: boolean;
  isLast: boolean;
  isSearching: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: ad.id,
    disabled: isSearching,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    position: "relative" as const,
  };

  const iconBtn =
    "btn h-9 w-9 px-0 text-gray-700 hover:bg-gray-100 disabled:opacity-30 dark:text-gray-200 dark:hover:bg-gray-700";

  return (
    <tr ref={setNodeRef} style={style} className={isDragging ? "bg-gray-50 shadow-lg dark:bg-gray-700" : ""}>
      <td className="whitespace-nowrap px-2 py-3 sm:px-4">
        {!isSearching && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              {...attributes}
              {...listeners}
              aria-label={`Drag to reorder ${ad.title}`}
              className={`${iconBtn} hidden cursor-grab active:cursor-grabbing sm:inline-flex`}
            >
              <GripVertical className="h-5 w-5" aria-hidden />
            </button>
            <button type="button" onClick={() => onMove(ad.id, -1)} disabled={isFirst} aria-label={`Move ${ad.title} up`} className={iconBtn}>
              <ArrowUp className="h-4 w-4" aria-hidden />
            </button>
            <button type="button" onClick={() => onMove(ad.id, 1)} disabled={isLast} aria-label={`Move ${ad.title} down`} className={iconBtn}>
              <ArrowDown className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )}
      </td>
      <td className="max-w-[9rem] px-2 py-3 sm:max-w-xs sm:px-4">
        <div className="flex items-center gap-3">
          <div className="hidden h-12 w-20 shrink-0 overflow-hidden rounded-md bg-gray-100 dark:bg-gray-700 sm:block">
            <img src={ad.image_url} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-medium text-gray-900 dark:text-white">{ad.title}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 sm:hidden">{ad.is_active ? "Showing" : "Hidden"}</p>
            {ad.link_url ? (
              <a
                href={ad.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary underline-offset-2 hover:underline"
              >
                Opens a link <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                <span className="sr-only">(new tab)</span>
              </a>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400">No link</p>
            )}
          </div>
        </div>
      </td>
      <td className="tabular hidden whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300 md:table-cell">
        {ad.duration_seconds || 10} seconds
      </td>
      <td className="hidden whitespace-nowrap px-4 py-3 text-sm sm:table-cell">
        {ad.is_active ? (
          <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 font-medium text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">
            Showing
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-200">
            Hidden
          </span>
        )}
      </td>
      <td className="whitespace-nowrap px-2 py-3 text-right sm:px-4">
        <div className="flex flex-col items-end gap-1 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => onEdit(ad)} className="btn-row-edit">
            <Edit className="h-4 w-4" aria-hidden />
            Edit<span className="sr-only"> {ad.title}</span>
          </button>
          <button type="button" onClick={() => onDelete(ad.id)} className="btn-row-delete">
            <Trash2 className="h-4 w-4" aria-hidden />
            Delete<span className="sr-only"> {ad.title}</span>
          </button>
        </div>
      </td>
    </tr>
  );
}
