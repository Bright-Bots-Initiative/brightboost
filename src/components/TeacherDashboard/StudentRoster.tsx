"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ArrowUpDown,
  Search,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";

const initialStudents = [
  { id: 1, name: "Ashley", level: 4, xp: 1200 },
  { id: 2, name: "Thomas", level: 6, xp: 2500 },
  { id: 3, name: "Emily", level: 3, xp: 800 },
  { id: 4, name: "Lucas", level: 2, xp: 400 },
  { id: 5, name: "Sophia", level: 5, xp: 1800 },
  { id: 6, name: "Jacob", level: 4, xp: 1500 },
];

type Student = { id: number; name: string; level: number; xp: number };
type SortKey = keyof Pick<Student, "name" | "level" | "xp">;
type SortConfig = { key: SortKey | null; direction: "asc" | "desc" };
const sortableKeys: SortKey[] = ["name", "level", "xp"];

export default function StudentRoster() {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: "asc",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const studentsPerPage = 4;

  // Derived state for search and sorting
  const filtered = useMemo(() => {
    return searchQuery.trim()
      ? initialStudents.filter(
          (s) =>
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.level.toString().includes(searchQuery) ||
            s.xp.toString().includes(searchQuery),
        )
      : initialStudents;
  }, [searchQuery]);

  const sorted = useMemo(() => {
    return sortConfig.key
      ? [...filtered].sort((a, b) => {
          const { key, direction } = sortConfig;
          if (!key) return 0;
          const aVal = a[key];
          const bVal = b[key];
          if (typeof aVal === "string" && typeof bVal === "string") {
            return direction === "asc"
              ? aVal.localeCompare(bVal)
              : bVal.localeCompare(aVal);
          }
          return direction === "asc"
            ? (aVal as number) - (bVal as number)
            : (bVal as number) - (aVal as number);
        })
      : filtered;
  }, [filtered, sortConfig]);

  const totalPages = Math.ceil(sorted.length / studentsPerPage);
  const indexOfLastStudent = currentPage * studentsPerPage;
  const currentStudents = sorted.slice(
    indexOfLastStudent - studentsPerPage,
    indexOfLastStudent,
  );
  const paginate = (page: number) =>
    page >= 1 && page <= totalPages && setCurrentPage(page);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };
  const clearSearch = () => {
    setSearchQuery("");
    setIsSearchOpen(false);
    setCurrentPage(1);
  };
  const requestSort = (key: SortKey) => {
    const direction =
      sortConfig.key === key && sortConfig.direction === "asc" ? "desc" : "asc";
    setSortConfig({ key, direction });
  };
  const handleViewStudent = (id: number) =>
    console.log(`View student with ID: ${id}`);
  const handleExportCSV = () => {
    const csv = [
      "Name,Level,XP",
      ...sorted.map((s) => `${s.name},${s.level},${s.xp}`),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "student_roster.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <CardTitle className="text-2xl">Student Roster</CardTitle>
        <div className="flex items-center gap-2">
          {!isSearchOpen ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSearchOpen(true)}
              className="gap-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
            >
              <Search className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">Search</span>
            </Button>
          ) : (
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-12 pr-12"
                autoFocus
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-500 hover:text-gray-700"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="gap-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
          >
            <Download className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">Export CSV</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {searchQuery && (
          <div className="mb-4 text-sm text-muted-foreground">
            Found {sorted.length} student{sorted.length !== 1 ? "s" : ""}{" "}
            matching "{searchQuery}"
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="ml-2 h-auto p-0 text-blue-600 hover:bg-transparent"
            >
              Clear search
            </Button>
          </div>
        )}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {sortableKeys.map((key) => (
                  <TableHead key={key}>
                    <Button
                      variant="ghost"
                      onClick={() => requestSort(key)}
                      className="gap-1 font-medium bg-white text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                    >
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                      <ArrowUpDown className="h-4 w-4" />
                      {sortConfig.key === key && (
                        <span className="sr-only">
                          {sortConfig.direction === "asc"
                            ? "sorted ascending"
                            : "sorted descending"}
                        </span>
                      )}
                    </Button>
                  </TableHead>
                ))}
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentStudents.length > 0 ? (
                currentStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      {student.name}
                    </TableCell>
                    <TableCell>{student.level}</TableCell>
                    <TableCell>{student.xp}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewStudent(student.id)}
                        className="border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
                    {searchQuery
                      ? "No students found matching your search"
                      : "No students available"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className="border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous page</span>
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next page</span>
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            Showing {currentStudents.length} of {sorted.length} student
            {sorted.length !== 1 ? "s" : ""}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
