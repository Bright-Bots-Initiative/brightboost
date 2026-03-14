import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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

const TYPE_KEYS: Record<string, string> = {
  WORKSHEET: "teacher.resources.typeWorksheet",
  HANDOUT: "teacher.resources.typeHandout",
  GUIDE: "teacher.resources.typeGuide",
  LINK: "teacher.resources.typeLink",
};

const CATEGORY_KEYS: Record<string, string> = {
  PRE_ACTIVITY: "teacher.resources.catPreActivity",
  POST_ACTIVITY: "teacher.resources.catPostActivity",
  ASSESSMENT: "teacher.resources.catAssessment",
  SUPPLEMENTAL: "teacher.resources.catSupplemental",
  GENERAL: "teacher.resources.catGeneral",
};

const MODULE_KEYS: Record<string, string> = {
  "k2-stem-rhyme-ride": "teacher.resources.module1",
  "k2-stem-bounce-buds": "teacher.resources.module2",
  "k2-stem-gotcha-gears": "teacher.resources.module3",
};

const TYPE_COLORS: Record<string, string> = {
  WORKSHEET: "bg-blue-100 text-blue-700",
  HANDOUT: "bg-purple-100 text-purple-700",
  GUIDE: "bg-green-100 text-green-700",
  LINK: "bg-orange-100 text-orange-700",
};

const TeacherResources: React.FC = () => {
  const { t } = useTranslation();
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
      .catch(() => setError(t("teacher.resources.failedLoad")))
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
          <FolderOpen className="w-6 h-6 text-blue-600" /> {t("teacher.resources.title")}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {t("teacher.resources.subtitle")}
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
            <option value="all">{t("teacher.resources.allModules")}</option>
            <option value="general">{t("teacher.resources.generalResources")}</option>
            {Object.entries(MODULE_KEYS).map(([slug, key]) => (
              <option key={slug} value={slug}>
                {t(key)}
              </option>
            ))}
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">{t("teacher.resources.allTypes")}</option>
            {Object.entries(TYPE_KEYS).map(([key, i18nKey]) => (
              <option key={key} value={key}>
                {t(i18nKey)}
              </option>
            ))}
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">{t("teacher.resources.allCategories")}</option>
            {Object.entries(CATEGORY_KEYS).map(([key, i18nKey]) => (
              <option key={key} value={key}>
                {t(i18nKey)}
              </option>
            ))}
          </select>

          <div className="relative flex-grow max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t("teacher.resources.searchPlaceholder")}
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
          <span className="ml-2 text-gray-500">{t("teacher.resources.loading")}</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>{t("teacher.resources.noResults")}</p>
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
                  {t(TYPE_KEYS[resource.type] || resource.type)}
                </span>
              </div>

              <p className="text-xs text-gray-500 mb-3">{resource.description}</p>

              <div className="flex items-center gap-2 mb-3">
                {resource.moduleSlug && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {t(MODULE_KEYS[resource.moduleSlug] || resource.moduleSlug)}
                  </span>
                )}
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                  {t(CATEGORY_KEYS[resource.category] || resource.category)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {resource.contentHtml && (
                  <button
                    onClick={() => setPreviewResource(resource)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
                  >
                    <BookOpen className="w-3 h-3" /> {t("teacher.resources.preview")}
                  </button>
                )}
                {resource.printable && resource.contentHtml && (
                  <button
                    onClick={() => handlePrint(resource)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <Printer className="w-3 h-3" /> {t("teacher.resources.print")}
                  </button>
                )}
                {resource.contentUrl && (
                  <a
                    href={resource.contentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-600 border border-green-200 rounded-md hover:bg-green-50 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" /> {t("teacher.resources.openLink")}
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
                    <Printer className="w-4 h-4" /> {t("teacher.resources.print")}
                  </button>
                )}
                <button
                  onClick={() => setPreviewResource(null)}
                  className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
                >
                  {t("teacher.resources.close")}
                </button>
              </div>
            </div>
            <div
              className="p-6 overflow-y-auto flex-grow prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: previewResource.contentHtml || "" }}
            />
            {/* K-2 worksheet preview styles */}
            <style>{`
              .k2-worksheet h2 { font-size: 1.35rem; margin: 1.2rem 0 0.5rem; }
              .k2-worksheet h3 { font-size: 1.15rem; margin: 1rem 0 0.4rem; }
              .k2-worksheet p, .k2-worksheet li { font-size: 1.1rem; line-height: 1.7; }
              .k2-worksheet .worksheet-area { border: 1px dashed #d1d5db; padding: 1.5rem; margin: 0.75rem 0; min-height: 140px; border-radius: 4px; }
              .k2-worksheet .line { border-bottom: 1px solid #d1d5db; margin: 1rem 0; min-height: 36px; }
              .k2-worksheet td, .k2-worksheet th { padding: 0.75rem; font-size: 1.05rem; }
              .k2-worksheet .match-table td { border: none; padding: 0.6rem 1.2rem; font-size: 1.15rem; }
            `}</style>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherResources;
