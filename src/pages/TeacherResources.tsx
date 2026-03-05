import React, { useState, useEffect } from "react";
import { useApi, API_BASE, join } from "../services/api";
import {
  ExternalLink,
  Printer,
  Search,
  Filter,
  BookOpen,
  Loader2,
  FolderOpen,
} from "lucide-react";

interface Resource {
  id: string;
  title: string;
  description: string;
  type: string;
  moduleSlug: string | null;
  category: string;
  contentHtml: string | null;
  contentUrl: string | null;
  printable: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  WORKSHEET: "Worksheet",
  HANDOUT: "Handout",
  GUIDE: "Guide",
  LINK: "Link",
};

const CATEGORY_LABELS: Record<string, string> = {
  PRE_ACTIVITY: "Pre-Activity",
  POST_ACTIVITY: "Post-Activity",
  ASSESSMENT: "Assessment",
  SUPPLEMENTAL: "Supplemental",
  GENERAL: "General",
};

const MODULE_LABELS: Record<string, string> = {
  "k2-stem-rhyme-ride": "Module 1 — Rhyme & Ride",
  "k2-stem-bounce-buds": "Module 2 — Bounce & Buds",
  "k2-stem-gotcha-gears": "Module 3 — Gotcha Gears",
};

const TYPE_COLORS: Record<string, string> = {
  WORKSHEET: "bg-blue-100 text-blue-700",
  HANDOUT: "bg-purple-100 text-purple-700",
  GUIDE: "bg-green-100 text-green-700",
  LINK: "bg-orange-100 text-orange-700",
};

const TeacherResources: React.FC = () => {
  const api = useApi();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterModule, setFilterModule] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewResource, setPreviewResource] = useState<Resource | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterModule !== "all") params.set("moduleSlug", filterModule);
    if (filterType !== "all") params.set("type", filterType);
    if (filterCategory !== "all") params.set("category", filterCategory);

    api
      .get(`/teacher/resources?${params.toString()}`)
      .then((data: Resource[]) => setResources(data))
      .catch(() => setError("Failed to load resources."))
      .finally(() => setLoading(false));
  }, [filterModule, filterType, filterCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = resources.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q)
    );
  });

  const handlePrint = (resource: Resource) => {
    const token = localStorage.getItem("bb_access_token");
    const url = join(API_BASE, `/teacher/resources/${resource.id}/print`);
    // Open print URL in new tab with auth
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.text())
        .then((html) => {
          printWindow.document.write(html);
          printWindow.document.close();
        });
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FolderOpen className="w-6 h-6 text-blue-600" /> Resource Hub
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Worksheets, handouts, guides, and supplemental resources for your classroom
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="w-4 h-4 text-gray-400" />

          <select
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Modules</option>
            <option value="general">General Resources</option>
            {Object.entries(MODULE_LABELS).map(([slug, label]) => (
              <option key={slug} value={slug}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Types</option>
            {Object.entries(TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          <div className="relative flex-grow max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Loading resources...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No resources found matching your filters.</p>
        </div>
      ) : (
        /* Resource Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((resource) => (
            <div
              key={resource.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900 flex-grow pr-2">
                  {resource.title}
                </h3>
                <span
                  className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[resource.type] || "bg-gray-100 text-gray-700"}`}
                >
                  {TYPE_LABELS[resource.type] || resource.type}
                </span>
              </div>

              <p className="text-xs text-gray-500 mb-3">{resource.description}</p>

              <div className="flex items-center gap-2 mb-3">
                {resource.moduleSlug && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {MODULE_LABELS[resource.moduleSlug] || resource.moduleSlug}
                  </span>
                )}
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                  {CATEGORY_LABELS[resource.category] || resource.category}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {resource.contentHtml && (
                  <button
                    onClick={() => setPreviewResource(resource)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
                  >
                    <BookOpen className="w-3 h-3" /> Preview
                  </button>
                )}
                {resource.printable && resource.contentHtml && (
                  <button
                    onClick={() => handlePrint(resource)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <Printer className="w-3 h-3" /> Print
                  </button>
                )}
                {resource.contentUrl && (
                  <a
                    href={resource.contentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-600 border border-green-200 rounded-md hover:bg-green-50 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" /> Open Link
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewResource && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{previewResource.title}</h2>
              <div className="flex items-center gap-2">
                {previewResource.printable && (
                  <button
                    onClick={() => handlePrint(previewResource)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50"
                  >
                    <Printer className="w-4 h-4" /> Print
                  </button>
                )}
                <button
                  onClick={() => setPreviewResource(null)}
                  className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
            <div
              className="p-6 overflow-y-auto flex-grow prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: previewResource.contentHtml || "" }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherResources;
