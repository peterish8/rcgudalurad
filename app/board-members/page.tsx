"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/components/Toast";
import { useEffect, useState, useRef } from "react";
import { api, convex, errorMessage, getToken } from "@/lib/convex";
import { Plus, Edit, Trash2, Search, Loader2, Users, ArrowUp, ArrowDown, Upload, Download, FileText } from "lucide-react";
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
  const toast = useToast();
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
  const [updatingSection, setUpdatingSection] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [isImporting, setIsImporting] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteContent, setPasteContent] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  // Where each section appears on the website's "Our Board Members" block.
  const SECTIONS = [
    { value: "fixed", label: "Top row", hint: "Large cards above the scrolling rows. Up to 3 people." },
    { value: "layer1", label: "Scrolling row 1", hint: "First row that slides sideways." },
    { value: "layer2", label: "Scrolling row 2", hint: "Second row, slides the other way." },
    { value: "layer3", label: "Scrolling row 3", hint: "Third row." },
  ];
  const sectionLabel = (section?: string | null) =>
    SECTIONS.find((o) => o.value === section)?.label ?? "Not shown on the website";

  /** The scrolling row with the fewest people, so new members always appear somewhere. */
  const leastFilledRow = (extra: Record<string, number> = {}) =>
    ["layer1", "layer2", "layer3"]
      .map((row) => ({ row, n: members.filter((m) => m.section === row).length + (extra[row] ?? 0) }))
      .sort((a, b) => a.n - b.n)[0].row;

  const getDefaultSection = (designation: string): string => {
    const normalizedDesignation = designation.trim().toLowerCase();
    if (
      normalizedDesignation === "president" ||
      normalizedDesignation === "secretary" ||
      normalizedDesignation === "treasurer"
    ) {
      return "fixed";
    }
    return leastFilledRow();
  };


  async function fetchMembers() {
    try {
      setFetchError(null);
      const data = await convex.query(api.boardMembers.listAll, { token: getToken() });
      setMembers(data || []);
    } catch (err: any) {
      console.error("Error fetching board members:", err);
      setFetchError(errorMessage(err, "Failed to fetch board members"));
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
      section: leastFilledRow(),
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

      await convex.mutation(api.boardMembers.update, { token: getToken(), id: memberId, ...memberData });

      // Refresh the list to ensure consistency
      await fetchMembers();
      toast.success(`Moved to ${sectionLabel(newSection)}.`, { live: true });
    } catch (err: any) {
      console.error("Error updating section:", err);
      setError(errorMessage(err, "Failed to update section"));
      // Refresh on error to revert optimistic update
      await fetchMembers();
    } finally {
      setUpdatingSection(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      await convex.mutation(api.boardMembers.remove, { token: getToken(), id: deleteTarget });

      await fetchMembers();
      setDeleteTarget(null);
      toast.success("Member removed.", { live: true });
    } catch (err: any) {
      console.error("Error deleting board member:", err);
      setError(errorMessage(err, "Failed to delete board member"));
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
        await convex.mutation(api.boardMembers.update, { token: getToken(), id: selectedMember.id, ...memberData });
      } else {
        await convex.mutation(api.boardMembers.create, { token: getToken(), ...memberData });
      }

      await fetchMembers();
      setIsModalOpen(false);
      toast.success(selectedMember ? "Member updated." : "Member added.", { live: true });
      setFormData({
        name: "",
        designation: "",
        section: "scrolling",
      });
      setSelectedMember(null);
    } catch (err: any) {
      console.error("Error saving board member:", err);
      setError(errorMessage(err, "Failed to save board member"));
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

      const added: Record<string, number> = {};
      const newMembers = rows
        .filter((row) => row.name?.trim() && row.designation?.trim())
        .map((row) => {
          const designation = row.designation.trim();
          const given = row.section?.trim();
          const key = getDefaultSection(designation) === "fixed";
          const section = given && given !== "scrolling" ? given : key ? "fixed" : leastFilledRow(added);
          added[section] = (added[section] ?? 0) + 1;
          return { name: row.name.trim(), designation, section };
        });

      if (newMembers.length === 0) {
          throw new Error("No valid members found in CSV");
      }

      await convex.mutation(api.boardMembers.createMany, { token: getToken(), members: newMembers });

      await fetchMembers();
      toast.success(`Added ${newMembers.length} ${newMembers.length === 1 ? "member" : "members"}.`, { live: true });
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
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
          />
          <PageHeader
            title="Board members"
            description="Add, edit or remove people, and choose which row of the board section they appear in."
            showsOn="Homepage › Our Board Members"
            actions={
              <>
                <button
                  type="button"
                  onClick={() => {
                    setFetchError(null);
                    setPasteContent("");
                    setIsPasteModalOpen(true);
                  }}
                  disabled={isImporting}
                  className="btn-secondary"
                >
                  <FileText className="h-5 w-5" aria-hidden />
                  Add many at once
                </button>
                <button type="button" onClick={handleCreate} className="btn-primary">
                  <Plus className="h-5 w-5" aria-hidden />
                  Add member
                </button>
              </>
            }
          />

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <label htmlFor="board-search" className="sr-only">Search members</label>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" aria-hidden />
              <input
                id="board-search"
                type="search"
                placeholder="Search by name or role"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="field pl-10"
              />
            </div>
            <div className="sm:w-56">
              <label htmlFor="board-filter" className="sr-only">Show</label>
              <select id="board-filter" value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)} className="field">
                <option value="all">Everyone</option>
                {SECTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
                <option value="none">Not shown on the website</option>
              </select>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              { label: "Top row", n: fixedMembers.length, note: "of 3" },
              { label: "Scrolling row 1", n: layer1Members.length },
              { label: "Scrolling row 2", n: layer2Members.length },
              { label: "Scrolling row 3", n: layer3Members.length },
              { label: "Not shown", n: otherMembers.length },
            ].map((c) => (
              <div key={c.label} className="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                <dt className="text-sm text-gray-700 dark:text-gray-300">{c.label}</dt>
                <dd className="tabular mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                  {c.n}
                  {c.note && <span className="ml-1 text-sm font-normal text-gray-600 dark:text-gray-400">{c.note}</span>}
                </dd>
              </div>
            ))}
          </dl>

          {error && (
            <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg">
              <strong>Error:</strong> {error}
            </div>
          )}

          {fetchError && (
            <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg">
              <strong>Error fetching board members:</strong> {fetchError}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
            </div>
          ) : fetchError ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <Users className="mx-auto h-12 w-12 text-red-400" aria-hidden />
              <h3 className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">
                Unable to load board members
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Please check your connection and try again.
              </p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <Users className="mx-auto h-12 w-12 text-gray-400" aria-hidden />
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
                      <th scope="col" className="hidden px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 md:table-cell">
                        <button
                          onClick={() => handleSort("name")}
                          className="flex items-center gap-2 hover:text-gray-700 dark:hover:text-gray-200 transition-colors group"
                        >
                          <span>Name</span>
                          <div className="flex flex-col">
                            {sortColumn === "name" ? (
                              sortDirection === "asc" ? (
                                <ArrowUp className="h-4 w-4 text-primary" aria-hidden />
                              ) : (
                                <ArrowDown className="h-4 w-4 text-primary" aria-hidden />
                              )
                            ) : (
                              <div className="flex flex-col -space-y-1 opacity-40 group-hover:opacity-70">
                                <ArrowUp className="h-3 w-3" aria-hidden />
                                <ArrowDown className="h-3 w-3" aria-hidden />
                              </div>
                            )}
                          </div>
                        </button>
                      </th>
                      <th scope="col" className="hidden px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 md:table-cell">
                        <button
                          onClick={() => handleSort("designation")}
                          className="flex items-center gap-2 hover:text-gray-700 dark:hover:text-gray-200 transition-colors group"
                        >
                          <span>Role</span>
                          <div className="flex flex-col">
                            {sortColumn === "designation" ? (
                              sortDirection === "asc" ? (
                                <ArrowUp className="h-4 w-4 text-primary" aria-hidden />
                              ) : (
                                <ArrowDown className="h-4 w-4 text-primary" aria-hidden />
                              )
                            ) : (
                              <div className="flex flex-col -space-y-1 opacity-40 group-hover:opacity-70">
                                <ArrowUp className="h-3 w-3" aria-hidden />
                                <ArrowDown className="h-3 w-3" aria-hidden />
                              </div>
                            )}
                          </div>
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                        <button
                          onClick={() => handleSort("section")}
                          className="flex items-center gap-2 hover:text-gray-700 dark:hover:text-gray-200 transition-colors group"
                        >
                          <span>Where it shows</span>
                          <div className="flex flex-col">
                            {sortColumn === "section" ? (
                              sortDirection === "asc" ? (
                                <ArrowUp className="h-4 w-4 text-primary" aria-hidden />
                              ) : (
                                <ArrowDown className="h-4 w-4 text-primary" aria-hidden />
                              )
                            ) : (
                              <div className="flex flex-col -space-y-1 opacity-40 group-hover:opacity-70">
                                <ArrowUp className="h-3 w-3" aria-hidden />
                                <ArrowDown className="h-3 w-3" aria-hidden />
                              </div>
                            )}
                          </div>
                        </button>
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredMembers.map((member) => (
                      <tr key={member.id}>
                        <td className="px-4 py-3 text-base font-medium text-gray-900 dark:text-white">
                          {member.name}
                          <span className="block text-sm font-normal text-gray-600 dark:text-gray-400 md:hidden">{member.designation}</span>
                          <span className="mt-2 block md:hidden">
                            <label htmlFor={`row-m-${member.id}`} className="sr-only">Row for {member.name}</label>
                            <select
                              id={`row-m-${member.id}`}
                              value={["fixed", "layer1", "layer2", "layer3"].includes(member.section ?? "") ? member.section! : "scrolling"}
                              onChange={(e) => handleQuickSectionChange(member.id, e.target.value)}
                              disabled={updatingSection === member.id}
                              className="field py-1.5 text-sm font-normal"
                            >
                              {SECTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                              <option value="scrolling" disabled>Not shown on the website</option>
                            </select>
                          </span>
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300 md:table-cell">
                          {member.designation}
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-3 text-sm md:table-cell">
                          <label htmlFor={`row-${member.id}`} className="sr-only">Row for {member.name}</label>
                          <div className="flex items-center gap-2">
                            <select
                              id={`row-${member.id}`}
                              value={["fixed", "layer1", "layer2", "layer3"].includes(member.section ?? "") ? member.section! : "scrolling"}
                              onChange={(e) => handleQuickSectionChange(member.id, e.target.value)}
                              disabled={updatingSection === member.id}
                              className="field w-auto min-w-[11rem] py-1.5"
                            >
                              {SECTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                              <option value="scrolling" disabled>Not shown on the website</option>
                            </select>
                            {updatingSection === member.id && (
                              <Loader2 className="h-4 w-4 animate-spin text-gray-500" aria-label="Saving" />
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button type="button" onClick={() => handleEdit(member)} className="btn-row-edit">
                              <Edit className="h-4 w-4" aria-hidden />
                              Edit<span className="sr-only"> {member.name}</span>
                            </button>
                            <button type="button" onClick={() => handleDelete(member.id)} className="btn-row-delete">
                              <Trash2 className="h-4 w-4" aria-hidden />
                              Remove<span className="sr-only"> {member.name}</span>
                            </button>
                          </div>
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
              selectedMember ? "Edit member" : "Add member"
            }
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
                  <strong>Error:</strong> {error}
                </div>
              )}

              <div>
                <label htmlFor="board--name" className="label">
                  Name <span className="text-red-500">*</span>
                </label>
                <input id="board--name"
                  type="text"
                  required
                  maxLength={100}
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="field"
                />
              </div>

              <div>
                <label htmlFor="board--designation" className="label">
                  Role <span className="text-red-500">*</span>
                </label>
                <input id="board--designation"
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
                  className="field"
                  placeholder="For example: Vice President"
                />
              </div>

              <div>
                <label htmlFor="board-row" className="label">Where they appear</label>
                <select
                  id="board-row"
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  className="field"
                >
                  {SECTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                  {formData.section === "scrolling" && <option value="scrolling">Not shown on the website</option>}
                </select>
                <p className="hint">
                  {SECTIONS.find((o) => o.value === formData.section)?.hint ??
                    "Pick a row, otherwise this person won't appear on the website."}{" "}
                  President, Secretary and Treasurer go in the top row automatically.
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
                  className="px-4 py-2 text-sm font-medium text-on-primary bg-primary hover:bg-primary-dark rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 inline animate-spin mr-2" aria-hidden />
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
            title="Add many members at once"
          >
            <div className="space-y-4">
              <p className="text-base text-gray-700 dark:text-gray-300">
                Paste one person per line as <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">name,designation</code>, under a first line that says exactly that.
                You can also add a third column, <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">section</code>, to choose their row.
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="btn-secondary">
                  <Upload className="h-4 w-4" aria-hidden />
                  Choose a CSV file instead
                </button>
                <a href="/board-members-template.csv" download className="btn-secondary">
                  <Download className="h-4 w-4" aria-hidden />
                  Download example file
                </a>
              </div>
              
              {fetchError && (
                <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
                  <strong>Error:</strong> {fetchError}
                </div>
              )}

              <label htmlFor="board-paste" className="label">Members</label>
              <textarea
                id="board-paste"
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                rows={10}
                className="field font-mono text-sm whitespace-pre"
                placeholder={`name,designation\nRtn. A. Ramesh,President\nRtn. S. Priya,Secretary`}
              />

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsPasteModalOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={handlePasteImport}
                  disabled={isImporting || !pasteContent.trim()}
                  className="btn-primary"
                >
                  {isImporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden />}
                  Add these members
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
            title="Remove this member?"
            message="They will disappear from the website straight away. This can't be undone."
            confirmText="Remove member"
            cancelText="Cancel"
            danger
          />
        </div>
      </Layout>
    </ProtectedRoute>
  );
}