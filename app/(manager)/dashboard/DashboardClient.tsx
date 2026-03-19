"use client";

import { useEffect, useState, useCallback } from "react";

type ViolationStatus = "open" | "in_review" | "resolved" | "closed";

interface StatusSummary {
  status: ViolationStatus;
  count: number;
}

interface PropertyViolation {
  property_id: string;
  property_name: string;
  address: string;
  violation_count: number;
}

interface DashboardData {
  statusSummary: StatusSummary[];
  properties: PropertyViolation[];
}

const STATUS_LABELS: Record<ViolationStatus, string> = {
  open: "Open",
  in_review: "In Review",
  resolved: "Resolved",
  closed: "Closed",
};

const STATUS_COLORS: Record<
  ViolationStatus,
  { bg: string; text: string; border: string }
> = {
  open: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  in_review: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-200",
  },
  resolved: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
  },
  closed: {
    bg: "bg-gray-50",
    text: "text-gray-700",
    border: "border-gray-200",
  },
};

const ALL_STATUSES: ViolationStatus[] = [
  "open",
  "in_review",
  "resolved",
  "closed",
];

export default function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<ViolationStatus | "all">(
    "all",
  );

  const fetchData = useCallback(async (status: ViolationStatus | "all") => {
    setLoading(true);
    setError(null);
    try {
      const url =
        status === "all"
          ? "/api/dashboard/violations-summary"
          : `/api/dashboard/violations-summary?status=${status}`;
      const res = await fetch(url);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.error || `Request failed with status ${res.status}`,
        );
      }
      const json: DashboardData = await res.json();
      setData(json);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(selectedStatus);
  }, [selectedStatus, fetchData]);

  const handleStatusFilter = (status: ViolationStatus | "all") => {
    setSelectedStatus(status);
  };

  const getStatusCount = (status: ViolationStatus): number => {
    if (!data) return 0;
    const found = data.statusSummary.find((s) => s.status === status);
    return found ? found.count : 0;
  };

  const totalViolations = data
    ? data.statusSummary.reduce((sum, s) => sum + s.count, 0)
    : 0;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Manager Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Overview of property violations and their current statuses.
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 rounded-md bg-red-50 border border-red-200 p-4">
            <div className="flex items-center gap-2">
              <svg
                className="h-5 w-5 text-red-500 flex-shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm font-medium text-red-700">{error}</p>
            </div>
            <button
              onClick={() => fetchData(selectedStatus)}
              className="mt-3 text-sm text-red-600 underline hover:text-red-800"
            >
              Retry
            </button>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {ALL_STATUSES.map((status) => {
            const colors = STATUS_COLORS[status];
            const count = getStatusCount(status);
            return (
              <div
                key={status}
                className={`rounded-lg border ${colors.border} ${colors.bg} p-5 shadow-sm`}
              >
                <p className={`text-sm font-medium ${colors.text}`}>
                  {STATUS_LABELS[status]}
                </p>
                {loading ? (
                  <div className="mt-2 h-8 w-16 animate-pulse rounded bg-gray-200" />
                ) : (
                  <p className={`mt-2 text-3xl font-bold ${colors.text}`}>
                    {count}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">violations</p>
              </div>
            );
          })}
        </div>

        {/* Total */}
        {!loading && data && (
          <div className="mb-6 rounded-lg bg-white border border-gray-200 p-4 shadow-sm flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">
              Total Violations
            </span>
            <span className="text-2xl font-bold text-gray-900">
              {totalViolations}
            </span>
          </div>
        )}

        {/* Filter Controls */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-2">
            Filter by Status
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleStatusFilter("all")}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                selectedStatus === "all"
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              All
            </button>
            {ALL_STATUSES.map((status) => {
              const colors = STATUS_COLORS[status];
              const isActive = selectedStatus === status;
              return (
                <button
                  key={status}
                  onClick={() => handleStatusFilter(status)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                    isActive
                      ? `${colors.bg} ${colors.text} ${colors.border} ring-2 ring-offset-1 ring-current`
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {STATUS_LABELS[status]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Properties Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Properties</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Violation counts per property
              {selectedStatus !== "all"
                ? ` — filtered by "${STATUS_LABELS[selectedStatus]}"`
                : ""}
            </p>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-10 animate-pulse rounded bg-gray-100"
                />
              ))}
            </div>
          ) : !data || data.properties.length === 0 ? (
            <div className="p-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <p className="mt-4 text-sm text-gray-500">No properties found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Property
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Address
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Violations
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {data.properties.map((property) => (
                    <tr
                      key={property.property_id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {property.property_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500">
                          {property.address}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            property.violation_count > 0
                              ? "bg-red-100 text-red-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {property.violation_count}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <a
                          href={`/properties/${property.property_id}/violations${
                            selectedStatus !== "all"
                              ? `?status=${selectedStatus}`
                              : ""
                          }`}
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                          View Details →
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
