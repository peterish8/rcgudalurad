"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Edit, Trash2, Search, Loader2, Users, ChevronDown, ArrowUp, ArrowDown, Upload, Download, FileText } from "lucide-react";
import Papa from "papaparse";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { format } from "date-fns";

interface BoardMember {
  id: string;
  name: string;
  designation: string;
  section?: string | null;
  created_at: string;
}

export default function BoardMembersPage() {
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<BoardMember | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    designation: "",
    section: "scrolling",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [openSectionDropdown, setOpenSectionDropdown] = useState<string | null>(null);
  const [updatingSection, setUpdatingSection] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [dropdownPosition, setDropdownPosition] = useState<Record<string, "up" | "down">>({});
  const [isImporting, setIsImporting] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteContent, setPasteContent] = useState("");
  const [isFormSectionDropdownOpen, setIsFormSectionDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  const getDefaultSection = (designation: string): string => {
    const normalizedDesignation = designation.trim().toLowerCase();
    if (
      normalizedDesignation === "president" ||
      normalizedDesignation === "secretary" ||
      normalizedDesignation === "treasurer"
    ) {
      return "fixed";
    }
    return "scrolling";
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Don't close if clicking inside the dropdown or the badge button
      if (target.closest('[data-section-dropdown]') || target.closest('[data-section-badge]')) {
        return;
      }
      if (openSectionDropdown) {
        setOpenSectionDropdown(null);
      }
    };

    if (openSectionDropdown) {
      // Use click instead of mousedown to allow button clicks to process first
      document.addEventListener("click", handleClickOutside, true);
    }

    return () => {
      if (typeof window !== 'undefined') {
        document.removeEventListener("click", handleClickOutside, true);
      }
    };
  }, [openSectionDropdown]);

  async function fetchMembers() {
    try {
      setFetchError(null);
      const { data, error } = await supabase
        .from("board_members")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      setMembers(data || []);
    } catch (err: any) {
      console.error("Error fetching board members:", err);
      setFetchError(err.message || err.code || "Failed to fetch board members from Supabase");
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }

  const handleCreate = () => {
    setSelectedMember(null);
    setFormData({
      name: "",
      designation: "",
      section: "scrolling",
    });
    setError("");
    setIsModalOpen(true);
  };

  const handleEdit = (member: BoardMember) => {
    setSelectedMember(member);
    setFormData({
      name: member.name,
      designation: member.designation,
      section: member.section || "scrolling",
    });
    setError("");
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteTarget(id);
    setIsDeleteDialogOpen(true);
  };

  const handleQuickSectionChange = async (memberId: string, newSection: string) => {
    // Close dropdown first
    setOpenSectionDropdown(null);
    
    // Find current member
    const currentMember = members.find(m => m.id === memberId);
    if (!currentMember) return;
    
    // Don't update if it's already the same section
    if (currentMember.section === newSection) return;
    
    // Optimistically update UI immediately
    setMembers((prevMembers) =>
      prevMembers.map((member) =>
        member.id === memberId
          ? { ...member, section: newSection }
          : member
      )
    );
    
    setUpdatingSection(memberId);
    
    try {
      // Use the same update logic as handleSubmit
      const memberData = {
        name: currentMember.name,
        designation: currentMember.designation,
        section: newSection,
      };

      const { error } = await supabase
        .from("board_members")
        .update(memberData)
        .eq("id", memberId);

      if (error) throw error;

      // Refresh the list to ensure consistency
      await fetchMembers();
    } catch (err: any) {
      console.error("Error updating section:", err);
      setError(err.message || err.code || "Failed to update section");
      // Refresh on error to revert optimistic update
      await fetchMembers();
    } finally {
      setUpdatingSection(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      const { error } = await supabase
        .from("board_members")
        .delete()
        .eq("id", deleteTarget);

      if (error) throw error;

      await fetchMembers();
      setDeleteTarget(null);
    } catch (err: any) {
      console.error("Error deleting board member:", err);
      setError(err.message || err.code || "Failed to delete board member");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const trimmedDesignation = formData.designation.trim();
      
      let finalSection = formData.section || "scrolling";
      
      if (!selectedMember) {
        const autoSection = getDefaultSection(trimmedDesignation);
        if (formData.section === "scrolling" || !formData.section) {
          finalSection = autoSection;
        }
      } else {
        const originalDesignation = selectedMember.designation?.toLowerCase().trim();
        const newDesignation = trimmedDesignation.toLowerCase();
        
        if (
          (newDesignation === "president" || 
           newDesignation === "secretary" || 
           newDesignation === "treasurer") &&
          originalDesignation !== newDesignation
        ) {
          if (formData.section !== "fixed") {
            finalSection = "fixed";
          }
        }
      }

      const memberData = {
        name: formData.name.trim(),
        designation: trimmedDesignation,
        section: finalSection,
      };

      if (selectedMember) {
        const { error } = await supabase
          .from("board_members")
          .update(memberData)
          .eq("id", selectedMember.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("board_members")
          .insert(memberData);

        if (error) throw error;
      }

      await fetchMembers();
      setIsModalOpen(false);
      setFormData({
        name: "",
        designation: "",
        section: "scrolling",
      });
      setSelectedMember(null);
    } catch (err: any) {
      console.error("Error saving board member:", err);
      setError(err.message || err.code || "Failed to save board member");
    } finally {
      setSubmitting(false);
    }
  };

  const processCSVData = async (results: Papa.ParseResult<any>) => {
    try {
      const rows = results.data as any[];
      
      if (rows.length === 0) {
        throw new Error("CSV data is empty");
      }

      // Validate headers
      const firstRow = rows[0];
      if (!firstRow.name || !firstRow.designation) {
        throw new Error("Missing required columns: name, designation");
      }

      const newMembers = rows.map((row) => ({
        name: row.name?.trim(),
        designation: row.designation?.trim(),
        section: row.section?.trim() || getDefaultSection(row.designation?.trim() || ""),
      })).filter(m => m.name && m.designation);

      if (newMembers.length === 0) {
          throw new Error("No valid members found in CSV");
      }

      const { error } = await supabase
        .from("board_members")
        .insert(newMembers);

      if (error) throw error;

      await fetchMembers();
      alert(`Successfully imported ${newMembers.length} members`);
      setIsPasteModalOpen(false);
      setPasteContent("");
      
    } catch (err: any) {
      console.error("Error importing CSV:", err);
      setFetchError(err.message || "Failed to import CSV");
    } finally {
      setIsImporting(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setFetchError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: processCSVData,
      error: (error) => {
        console.error("CSV Parse Error:", error);
        setFetchError("Failed to parse CSV file");
        setIsImporting(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
      }
    });
  };

  const handlePasteImport = () => {
    if (!pasteContent.trim()) {
      setFetchError("Please paste CSV content");
      return;
    }

    setIsImporting(true);
    setFetchError(null);

    Papa.parse(pasteContent, {
      header: true,
      skipEmptyLines: true,
      complete: processCSVData,
      error: (error: Error) => {
        console.error("CSV Parse Error:", error);
        setFetchError("Failed to parse CSV text");
        setIsImporting(false);
      }
    });
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new column and default to ascending
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getSectionOrder = (section: string | null | undefined): number => {
    if (!section) return 999; // Unassigned goes last
    const order: Record<string, number> = {
      fixed: 1,
      layer1: 2,
      layer2: 3,
      layer3: 4,
    };
    return order[section] || 999;
  };

  const filteredMembers = members
    .filter((member) => {
      const matchesSearch =
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.designation.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSection =
        sectionFilter === "all" ||
        (sectionFilter === "none" && !member.section) ||
        member.section === sectionFilter;
      
      return matchesSearch && matchesSection;
    })
    .sort((a, b) => {
      if (!sortColumn) return 0;

      let comparison = 0;

      if (sortColumn === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortColumn === "designation") {
        comparison = a.designation.localeCompare(b.designation);
      } else if (sortColumn === "section") {
        const aOrder = getSectionOrder(a.section);
        const bOrder = getSectionOrder(b.section);
        comparison = aOrder - bOrder;
        // If same order, sort by name as secondary
        if (comparison === 0) {
          comparison = a.name.localeCompare(b.name);
        }
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

  const fixedMembers = members.filter((m) => m.section === "fixed");
  const layer1Members = members.filter((m) => m.section === "layer1");
  const layer2Members = members.filter((m) => m.section === "layer2");
  const layer3Members = members.filter((m) => m.section === "layer3");
  const otherMembers = members.filter((m) => {
    const section = m.section;
    if (!section) return true;
    return !["fixed", "layer1", "layer2", "layer3"].includes(section);
  });

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Manage Board Members
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Create, edit, and delete board members
              </p>
            </div>
            <div className="flex gap-2 mt-4 sm:mt-0">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv"
                className="hidden"
              />
              <a
                href="/board-members-template.csv"
                download
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <Download className="h-5 w-5 mr-2" />
                Template
              </a>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                {isImporting ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-5 w-5 mr-2" />
                )}
                Import CSV
              </button>
              <button
                onClick={() => {
                  setFetchError(null);
                  setPasteContent("");
                  setIsPasteModalOpen(true);
                }}
                disabled={isImporting}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <FileText className="h-5 w-5 mr-2" />
                Paste Text
              </button>
              <button
                onClick={handleCreate}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add New Member
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search board members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Sections</option>
              <option value="fixed">Fixed Section</option>
              <option value="layer1">Layer 1</option>
              <option value="layer2">Layer 2</option>
              <option value="layer3">Layer 3</option>
              <option value="none">Unassigned</option>
            </select>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">Fixed</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {fixedMembers.length}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">/3 max</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">Layer 1</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {layer1Members.length}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">Layer 2</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {layer2Members.length}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">Layer 3</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {layer3Members.length}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">Unassigned</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {otherMembers.length}
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
              <strong>Error:</strong> {error}
            </div>
          )}

          {fetchError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
              <strong>Error fetching board members from Supabase:</strong> {fetchError}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : fetchError ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <Users className="mx-auto h-12 w-12 text-red-400" />
              <h3 className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">
                Unable to load board members
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Please check your Supabase connection and try again.
              </p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                No board members found
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Get started by adding a new board member.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        <button
                          onClick={() => handleSort("name")}
                          className="flex items-center gap-2 hover:text-gray-700 dark:hover:text-gray-200 transition-colors group"
                        >
                          <span>Name</span>
                          <div className="flex flex-col">
                            {sortColumn === "name" ? (
                              sortDirection === "asc" ? (
                                <ArrowUp className="h-4 w-4 text-primary" />
                              ) : (
                                <ArrowDown className="h-4 w-4 text-primary" />
                              )
                            ) : (
                              <div className="flex flex-col -space-y-1 opacity-40 group-hover:opacity-70">
                                <ArrowUp className="h-3 w-3" />
                                <ArrowDown className="h-3 w-3" />
                              </div>
                            )}
                          </div>
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        <button
                          onClick={() => handleSort("designation")}
                          className="flex items-center gap-2 hover:text-gray-700 dark:hover:text-gray-200 transition-colors group"
                        >
                          <span>Designation</span>
                          <div className="flex flex-col">
                            {sortColumn === "designation" ? (
                              sortDirection === "asc" ? (
                                <ArrowUp className="h-4 w-4 text-primary" />
                              ) : (
                                <ArrowDown className="h-4 w-4 text-primary" />
                              )
                            ) : (
                              <div className="flex flex-col -space-y-1 opacity-40 group-hover:opacity-70">
                                <ArrowUp className="h-3 w-3" />
                                <ArrowDown className="h-3 w-3" />
                              </div>
                            )}
                          </div>
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        <button
                          onClick={() => handleSort("section")}
                          className="flex items-center gap-2 hover:text-gray-700 dark:hover:text-gray-200 transition-colors group"
                        >
                          <span>Section</span>
                          <div className="flex flex-col">
                            {sortColumn === "section" ? (
                              sortDirection === "asc" ? (
                                <ArrowUp className="h-4 w-4 text-primary" />
                              ) : (
                                <ArrowDown className="h-4 w-4 text-primary" />
                              )
                            ) : (
                              <div className="flex flex-col -space-y-1 opacity-40 group-hover:opacity-70">
                                <ArrowUp className="h-3 w-3" />
                                <ArrowDown className="h-3 w-3" />
                              </div>
                            )}
                          </div>
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Created Date
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredMembers.map((member) => (
                      <tr
                        key={member.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {member.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {member.designation}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="relative">
                            {updatingSection === member.id ? (
                              <div className="flex items-center">
                                <Loader2 className="h-4 w-4 animate-spin text-primary mr-2" />
                                <span className="text-xs text-gray-500">Updating...</span>
                              </div>
                            ) : (
                              <>
                                <button
                                  data-section-badge
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const button = e.currentTarget;
                                    const rect = button.getBoundingClientRect();
                                    const viewportHeight = window.innerHeight;
                                    const dropdownHeight = 200; // Approximate dropdown height
                                    const spaceBelow = viewportHeight - rect.bottom;
                                    const spaceAbove = rect.top;
                                    
                                    // If not enough space below but enough space above, open upward
                                    if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
                                      setDropdownPosition({ ...dropdownPosition, [member.id]: "up" });
                                    } else {
                                      setDropdownPosition({ ...dropdownPosition, [member.id]: "down" });
                                    }
                                    
                                    setOpenSectionDropdown(
                                      openSectionDropdown === member.id ? null : member.id
                                    );
                                  }}
                                  className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80 transition-opacity ${
                                    member.section === "fixed"
                                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                      : member.section === "layer1"
                                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                      : member.section === "layer2"
                                      ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                                      : member.section === "layer3"
                                      ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                                      : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                                  }`}
                                >
                                  {member.section === "fixed"
                                    ? "Fixed (Top 3)"
                                    : member.section === "layer1"
                                    ? "Layer 1"
                                    : member.section === "layer2"
                                    ? "Layer 2"
                                    : member.section === "layer3"
                                    ? "Layer 3"
                                    : "Auto"}
                                  <ChevronDown className="h-3 w-3 ml-1" />
                                </button>
                                
                                {openSectionDropdown === member.id && (
                                  <>
                                     <div
                                       className="fixed inset-0 z-40"
                                       onClick={() => setOpenSectionDropdown(null)}
                                     />
                                     <div 
                                       data-section-dropdown
                                       className={`absolute left-0 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden ${
                                         dropdownPosition[member.id] === "up"
                                           ? "bottom-full mb-2"
                                           : "top-full mt-2"
                                       }`}
                                       onClick={(e) => e.stopPropagation()}
                                     >
                                       <div className="py-2">
                                         <button
                                           onClick={(e) => {
                                             e.preventDefault();
                                             e.stopPropagation();
                                             handleQuickSectionChange(member.id, "fixed");
                                           }}
                                           type="button"
                                          className={`w-full text-left px-4 py-3 text-sm font-medium transition-all duration-200 flex items-center gap-3 ${
                                            member.section === "fixed"
                                              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-l-4 border-blue-500"
                                              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                          }`}
                                        >
                                          <div className={`w-3 h-3 rounded-full ${
                                            member.section === "fixed"
                                              ? "bg-blue-500"
                                              : "bg-gray-300 dark:bg-gray-600"
                                          }`} />
                                          <span>Fixed (Top 3)</span>
                                          {member.section === "fixed" && (
                                            <span className="ml-auto text-xs">✓</span>
                                          )}
                                        </button>
                                         <button
                                           onClick={(e) => {
                                             e.preventDefault();
                                             e.stopPropagation();
                                             handleQuickSectionChange(member.id, "layer1");
                                           }}
                                           type="button"
                                          className={`w-full text-left px-4 py-3 text-sm font-medium transition-all duration-200 flex items-center gap-3 ${
                                            member.section === "layer1"
                                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-l-4 border-green-500"
                                              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                          }`}
                                        >
                                          <div className={`w-3 h-3 rounded-full ${
                                            member.section === "layer1"
                                              ? "bg-green-500"
                                              : "bg-gray-300 dark:bg-gray-600"
                                          }`} />
                                          <span>Layer 1</span>
                                          {member.section === "layer1" && (
                                            <span className="ml-auto text-xs">✓</span>
                                          )}
                                        </button>
                                         <button
                                           onClick={(e) => {
                                             e.preventDefault();
                                             e.stopPropagation();
                                             handleQuickSectionChange(member.id, "layer2");
                                           }}
                                           type="button"
                                          className={`w-full text-left px-4 py-3 text-sm font-medium transition-all duration-200 flex items-center gap-3 ${
                                            member.section === "layer2"
                                              ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-l-4 border-purple-500"
                                              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                          }`}
                                        >
                                          <div className={`w-3 h-3 rounded-full ${
                                            member.section === "layer2"
                                              ? "bg-purple-500"
                                              : "bg-gray-300 dark:bg-gray-600"
                                          }`} />
                                          <span>Layer 2</span>
                                          {member.section === "layer2" && (
                                            <span className="ml-auto text-xs">✓</span>
                                          )}
                                        </button>
                                         <button
                                           onClick={(e) => {
                                             e.preventDefault();
                                             e.stopPropagation();
                                             handleQuickSectionChange(member.id, "layer3");
                                           }}
                                           type="button"
                                          className={`w-full text-left px-4 py-3 text-sm font-medium transition-all duration-200 flex items-center gap-3 ${
                                            member.section === "layer3"
                                              ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-l-4 border-orange-500"
                                              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                          }`}
                                        >
                                          <div className={`w-3 h-3 rounded-full ${
                                            member.section === "layer3"
                                              ? "bg-orange-500"
                                              : "bg-gray-300 dark:bg-gray-600"
                                          }`} />
                                          <span>Layer 3</span>
                                          {member.section === "layer3" && (
                                            <span className="ml-auto text-xs">✓</span>
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {format(new Date(member.created_at), "MMM dd, yyyy")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEdit(member)}
                            className="text-primary hover:text-primary-dark mr-4"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(member.id)}
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

          <Modal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setError("");
            }}
            title={
              selectedMember ? "Edit Board Member" : "Add New Board Member"
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
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Designation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={formData.designation}
                  onChange={(e) => {
                    const newDesignation = e.target.value;
                    const autoSection = getDefaultSection(newDesignation);
                    
                    if (!selectedMember || formData.section !== "fixed") {
                      setFormData({
                        ...formData,
                        designation: newDesignation,
                        section: autoSection,
                      });
                    } else {
                      setFormData({
                        ...formData,
                        designation: newDesignation,
                      });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., President, Secretary, Treasurer"
                />
                {getDefaultSection(formData.designation) === "fixed" && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    ⚡ Auto-assigned to Fixed section (President/Secretary/Treasurer)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Section <span className="text-red-500">*</span>
                  {getDefaultSection(formData.designation) === "fixed" && (
                    <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                      (Auto-set for key roles, can be changed)
                    </span>
                  )}
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsFormSectionDropdownOpen(!isFormSectionDropdownOpen)}
                    className="w-full text-left px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                       {formData.section === "fixed" ? (
                        <>
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span>Fixed Section (Top 3)</span>
                        </>
                      ) : formData.section === "layer1" ? (
                        <>
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span>Scrolling Layer 1</span>
                        </>
                      ) : formData.section === "layer2" ? (
                         <>
                          <div className="w-2 h-2 rounded-full bg-purple-500" />
                          <span>Scrolling Layer 2</span>
                        </>
                      ) : formData.section === "layer3" ? (
                         <>
                          <div className="w-2 h-2 rounded-full bg-orange-500" />
                          <span>Scrolling Layer 3</span>
                        </>
                      ) : (
                         <>
                          <div className="w-2 h-2 rounded-full bg-gray-400" />
                          <span>Auto-assign (Legacy)</span>
                        </>
                      )}
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isFormSectionDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isFormSectionDropdownOpen && (
                    <div className="absolute z-[100] w-full mt-1 bg-white dark:bg-gray-800 rounded-md shadow-2xl border border-gray-200 dark:border-gray-700 py-1 max-h-60 overflow-y-auto focus:outline-none animate-in fade-in zoom-in-95 duration-100 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                       {[
                        { value: "fixed", label: "Fixed Section (Top 3)", color: "bg-blue-500", desc: "Always visible at top" },
                        { value: "layer1", label: "Scrolling Layer 1", color: "bg-green-500", desc: "First scrolling row" },
                        { value: "layer2", label: "Scrolling Layer 2", color: "bg-purple-500", desc: "Second scrolling row" },
                        { value: "layer3", label: "Scrolling Layer 3", color: "bg-orange-500", desc: "Third scrolling row" },
                        { value: "scrolling", label: "Auto-assign", color: "bg-gray-400", desc: "Legacy distribution" },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, section: option.value });
                            setIsFormSectionDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between ${
                            formData.section === option.value ? "bg-gray-50 dark:bg-gray-700/50" : ""
                          }`}
                        >
                           <div className="flex flex-col">
                             <div className="flex items-center gap-2">
                               <div className={`w-2 h-2 rounded-full ${option.color}`} />
                               <span className="text-sm font-medium text-gray-900 dark:text-white">
                                 {option.label}
                               </span>
                             </div>
                             <span className="text-xs text-gray-500 dark:text-gray-400 ml-4">
                               {option.desc}
                             </span>
                           </div>
                           {formData.section === option.value && (
                              <Users className="h-4 w-4 text-primary" />
                           )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Fixed section shows first 3 members at top. Each layer scrolls independently.
                  {getDefaultSection(formData.designation) === "fixed" && (
                    <span className="block mt-1 text-blue-600 dark:text-blue-400">
                      💡 You can manually change this if needed.
                    </span>
                  )}
                </p>
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

          <Modal
            isOpen={isPasteModalOpen}
            onClose={() => {
              setIsPasteModalOpen(false);
              setFetchError(null);
            }}
            title="Import from Text"
          >
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Paste your CSV content below. It must have headers: <code>name,designation,section</code>
              </p>
              
              {fetchError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded text-sm">
                  <strong>Error:</strong> {fetchError}
                </div>
              )}

              <textarea
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                rows={10}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary font-mono text-xs whitespace-pre"
                placeholder={`name,designation,section\nJohn Doe,President,fixed\nJane Smith,Member,scrolling`}
              />

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setIsPasteModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasteImport}
                  disabled={isImporting || !pasteContent.trim()}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isImporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Parse & Import
                </button>
              </div>
            </div>
          </Modal>

          <ConfirmDialog
            isOpen={isDeleteDialogOpen}
            onClose={() => {
              setIsDeleteDialogOpen(false);
              setDeleteTarget(null);
            }}
            onConfirm={confirmDelete}
            title="Delete Board Member"
            message="Are you sure you want to delete this board member? This action cannot be undone."
            confirmText="Delete"
            cancelText="Cancel"
            danger
          />
        </div>
      </Layout>
    </ProtectedRoute>
  );
}