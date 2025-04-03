"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Item, PaginatedItemResponse, ItemStatus } from "@/data/types";
import { format } from "date-fns";
import { Search, FileDown, Filter } from "lucide-react";

const ITEMS_PER_PAGE = 10;

export function ItemsTable() {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ItemStatus | "">("");
  const [preferredZoneFilter, setPreferredZoneFilter] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.append("page", currentPage.toString());
    params.append("size", ITEMS_PER_PAGE.toString());
    if (debouncedSearchTerm) params.append("search", debouncedSearchTerm);
    if (statusFilter) params.append("status", statusFilter);
    if (preferredZoneFilter)
      params.append("preferred_zone", preferredZoneFilter);

    try {
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_BASE_URL
        }/api/tables/items?${params.toString()}`
      );
      if (!response.ok) throw new Error(`Error ${response.status}`);
      const data: PaginatedItemResponse = await response.json();
      setItems(data.items);
      setTotalItems(data.total);
      const total = Math.ceil(data.total / ITEMS_PER_PAGE);
      setTotalPages(total);
      if (currentPage > total && total > 0) setCurrentPage(total);
      else if (data.total === 0) setCurrentPage(1);
    } catch (err: any) {
      setError(err.message || "Failed to fetch items");
      setItems([]);
      setTotalItems(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearchTerm, statusFilter, preferredZoneFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = () => {
    console.log("Export Items Table Data...");
  };

  const getStatusBadge = (status: ItemStatus) => {
    // Normalize status to uppercase to match colorMap keys
    const normalizedStatus = status.toUpperCase();
    const colorMap: Record<string, string> = {
      ACTIVE: "bg-green-600",
      WASTE_EXPIRED: "bg-rose-600",
      WASTE_DEPLETED: "bg-amber-500",
    };

    const colorClass = colorMap[normalizedStatus] ?? "bg-gray-500";

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium text-white ${colorClass} shadow-sm shadow-black/20`}
      >
        {status
          .replace("_", " ")
          .toLowerCase()
          .replace(/(^\w|\s\w)/g, (m) => m.toUpperCase())}
      </span>
    );
  };

  return (
    <div className="w-full bg-gray-800 text-gray-100 rounded-lg shadow-lg overflow-hidden border-2 border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-700 bg-gradient-to-r from-gray-800 to-gray-750">
        <h2 className="text-xl font-bold">Items Overview</h2>
        <div className="text-sm text-gray-400">{totalItems} entries</div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-gray-700 bg-gray-800 flex flex-col gap-4 sm:flex-row sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <Input
              placeholder="Search name, ID, zones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-700 text-white border-2 border-gray-600 pl-10 py-6 focus:ring-indigo-500 focus:border-indigo-500 shadow-lg shadow-black/10"
            />
          </div>
          <Select
            value={statusFilter || "all"}
            onValueChange={(value) =>
              setStatusFilter(value === "all" ? "" : (value as ItemStatus))
            }
          >
            <SelectTrigger className="w-[180px] bg-gray-700 text-white border-2 border-gray-600 shadow-lg shadow-black/10 py-6">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-indigo-400" />
                <SelectValue placeholder="Filter by Status" />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-2 border-gray-700 text-white">
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.values(ItemStatus).map((status) => (
                <SelectItem key={status} value={status}>
                  {status.replace("_", " ").toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter size={16} className="text-gray-400" />
            </div>
            <Input
              placeholder="Filter Preferred Zone"
              value={preferredZoneFilter}
              onChange={(e) => setPreferredZoneFilter(e.target.value)}
              className="w-[180px] bg-gray-700 text-white border-2 border-gray-600 pl-10 py-6 focus:ring-indigo-500 focus:border-indigo-500 shadow-lg shadow-black/10"
            />
          </div>
        </div>
        <Button
          onClick={handleExport}
          variant="outline"
          className="bg-gray-700 border-2 border-gray-600 hover:bg-gray-600 text-white py-6 flex items-center gap-2 shadow-lg shadow-black/10"
        >
          <FileDown size={16} />
          Export to CSV
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-800 border-b border-gray-700 hover:bg-gray-800">
              <TableHead className="text-gray-300 font-semibold">
                Name
              </TableHead>
              <TableHead className="text-gray-300 font-semibold">
                Item ID
              </TableHead>
              <TableHead className="text-gray-300 font-semibold">
                Status
              </TableHead>
              <TableHead className="text-gray-300 font-semibold">
                Container
              </TableHead>
              <TableHead className="text-gray-300 font-semibold">
                Current Zone
              </TableHead>
              <TableHead className="text-gray-300 font-semibold">
                Preferred Zone
              </TableHead>
              <TableHead className="text-gray-300 font-semibold">
                Expiry
              </TableHead>
              <TableHead className="text-gray-300 font-semibold">
                Uses
              </TableHead>
              <TableHead className="text-gray-300 font-semibold">
                Priority
              </TableHead>
              <TableHead className="text-gray-300 font-semibold">
                Dimensions
              </TableHead>
              <TableHead className="text-gray-300 font-semibold">
                Mass
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow key="loading">
                <TableCell colSpan={11} className="text-center py-8">
                  <div className="flex items-center justify-center">
                    <svg
                      className="animate-spin h-6 w-6 text-indigo-400"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span className="ml-2">Loading items...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow key="error">
                <TableCell
                  colSpan={11}
                  className="text-center text-red-500 py-6"
                >
                  <div className="flex flex-col items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-10 w-10 text-red-500 mb-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    {error}
                  </div>
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow key="no-items">
                <TableCell colSpan={11} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center text-gray-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-12 w-12 mb-4 text-gray-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                      />
                    </svg>
                    <p className="text-lg">No items found</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Try adjusting your filters or search terms
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow
                  key={item.id}
                  className="hover:bg-indigo-900/20 transition border-b border-gray-700"
                >
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="font-mono text-sm">
                    <span className="px-2 py-1 bg-gray-700 rounded-md text-gray-300 border border-gray-600">
                      {item.id}
                    </span>
                  </TableCell>
                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                  <TableCell>
                    {item.containerId ? (
                      <span className="px-2 py-1 bg-gray-700 rounded-md text-gray-300 text-xs border border-gray-600">
                        {item.containerId}
                      </span>
                    ) : (
                      <span className="text-gray-500">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.currentZone ? (
                      <span className="text-indigo-300">
                        {item.currentZone}
                      </span>
                    ) : (
                      <span className="text-gray-500">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.preferredZone ? (
                      <span className="text-purple-300">
                        {item.preferredZone}
                      </span>
                    ) : (
                      <span className="text-gray-500">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.expirationDate ? (
                      <span className="text-amber-300">
                        {format(new Date(item.expirationDate), "PP")}
                      </span>
                    ) : (
                      <span className="text-gray-500">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <span
                        className={`font-medium ${
                          item.usageLimit &&
                          item.currentUses / item.usageLimit > 0.8
                            ? "text-red-400"
                            : item.usageLimit &&
                              item.currentUses / item.usageLimit > 0.5
                            ? "text-amber-400"
                            : "text-green-400"
                        }`}
                      >
                        {item.currentUses}
                      </span>
                      <span className="text-gray-400 mx-1">/</span>
                      <span>{item.usageLimit ?? "∞"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-md text-xs ${
                        item.priority > 7
                          ? "bg-red-500/20 text-red-300 border border-red-800"
                          : item.priority > 4
                          ? "bg-amber-500/20 text-amber-300 border border-amber-800"
                          : "bg-green-500/20 text-green-300 border border-green-800"
                      }`}
                    >
                      {item.priority}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    <span className="px-2 py-1 bg-gray-700 rounded-md border border-gray-600">
                      {`${item.width}×${item.depth}×${item.height}`}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{item.mass}</span>
                    <span className="text-gray-400 text-xs ml-1">kg</span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalItems > 0 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700 bg-gray-800">
          <span className="text-sm text-gray-400">
            Page {currentPage} of {totalPages}
          </span>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1 || isLoading}
              className="bg-gray-700 border-2 border-gray-600 hover:bg-gray-600 text-white shadow-lg shadow-black/10 disabled:opacity-50"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages || isLoading}
              className="bg-gray-700 border-2 border-gray-600 hover:bg-gray-600 text-white shadow-lg shadow-black/10 disabled:opacity-50"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
