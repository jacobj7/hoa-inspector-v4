"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

type ViolationStatus = "open" | "in_progress" | "resolved" | "dismissed";

interface Violation {
  id: string;
  property_id: string;
  property_name: string;
  property_address: string;
  unit_number: string | null;
  tenant_name: string | null;
  tenant_email: string | null;
  violation_type: string;
  description: string;
  status: ViolationStatus;
  severity: "low" | "medium" | "high" | "critical";
  reported_by: string;
  reported_at: string;
  updated_at: string;
  notes: string | null;
}

interface Property {
  id: string;
  name: string;
  address: string;
}

const STATUS_OPTIONS: { value: ViolationStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
];

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-red-100 text-red-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-800",
  dismissed: "bg-gray-100 text-gray-800",
};

export default function ViolationsClient() {
  const { data: session } = useSession();
  const [violations, setViolations] = useState<Violation[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ViolationStatus | "all">(
    "all",
  );
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(
    null,
  );
  const [notesInput, setNotesInput] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newStatus, setNewStatus] = useState<ViolationStatus>("open");

  const fetchViolations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (propertyFilter !== "all") params.set("property_id", propertyFilter);

      const res = await fetch(`/api/violations?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch violations");
      }
      const data = await res.json();
      setViolations(data.violations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, propertyFilter]);

  const fetchProperties = useCallback(async () => {
    try {
      const res = await fetch("/api/properties");
      if (!res.ok) return;
      const data = await res.json();
      setProperties(data.properties || []);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  useEffect(() => {
    fetchViolations();
  }, [fetchViolations]);

  const openUpdateModal = (violation: Violation) => {
    setSelectedViolation(violation);
    setNewStatus(violation.status);
    setNotesInput(violation.notes || "");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedViolation(null);
    setNotesInput("");
  };

  const handleStatusUpdate = async () => {
    if (!selectedViolation) return;
    setUpdatingId(selectedViolation.id);
    try {
      const res = await fetch(`/api/violations/${selectedViolation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, notes: notesInput }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update violation");
      }
      await fetchViolations();
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Violations</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage and track property violations across all your properties.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label
                htmlFor="status-filter"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Filter by Status
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as ViolationStatus | "all")
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label
                htmlFor="property-filter"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Filter by Property
              </label>
              <select
                id="property-filter"
                value={propertyFilter}
                onChange={(e) => setPropertyFilter(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">All Properties</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchViolations}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-md bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-xs text-red-600 underline hover:text-red-800"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
            <span className="ml-3 text-gray-600">Loading violations...</span>
          </div>
        ) : violations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No violations found
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              No violations match your current filters.
            </p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="mb-4 text-sm text-gray-600">
              Showing {violations.length} violation
              {violations.length !== 1 ? "s" : ""}
            </div>

            {/* Violations List */}
            <div className="space-y-4">
              {violations.map((violation) => (
                <div
                  key={violation.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Title Row */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-base font-semibold text-gray-900 truncate">
                          {violation.violation_type}
                        </h3>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${SEVERITY_COLORS[violation.severity] || "bg-gray-100 text-gray-800"}`}
                        >
                          {violation.severity.charAt(0).toUpperCase() +
                            violation.severity.slice(1)}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[violation.status] || "bg-gray-100 text-gray-800"}`}
                        >
                          {violation.status
                            .replace("_", " ")
                            .replace(/\b\w/g, (c) => c.toUpperCase())}
                        </span>
                      </div>

                      {/* Property Info */}
                      <div className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">
                          {violation.property_name}
                        </span>
                        {violation.property_address && (
                          <span className="text-gray-400">
                            {" "}
                            — {violation.property_address}
                          </span>
                        )}
                        {violation.unit_number && (
                          <span className="text-gray-500">
                            {" "}
                            · Unit {violation.unit_number}
                          </span>
                        )}
                      </div>

                      {/* Tenant Info */}
                      {violation.tenant_name && (
                        <div className="text-sm text-gray-500 mb-2">
                          Tenant: {violation.tenant_name}
                          {violation.tenant_email && (
                            <span className="text-gray-400">
                              {" "}
                              ({violation.tenant_email})
                            </span>
                          )}
                        </div>
                      )}

                      {/* Description */}
                      <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                        {violation.description}
                      </p>

                      {/* Notes */}
                      {violation.notes && (
                        <div className="text-xs text-gray-500 bg-gray-50 rounded p-2 mb-3">
                          <span className="font-medium">Notes:</span>{" "}
                          {violation.notes}
                        </div>
                      )}

                      {/* Meta */}
                      <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                        <span>
                          Reported: {formatDate(violation.reported_at)}
                        </span>
                        <span>Updated: {formatDate(violation.updated_at)}</span>
                        {violation.reported_by && (
                          <span>By: {violation.reported_by}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0">
                      <button
                        onClick={() => openUpdateModal(violation)}
                        disabled={updatingId === violation.id}
                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Update Status
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Update Modal */}
      {showModal && selectedViolation && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black bg-opacity-40 transition-opacity"
              onClick={closeModal}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6 z-10">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Update Violation
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedViolation.violation_type} —{" "}
                  {selectedViolation.property_name}
                </p>
              </div>

              <div className="space-y-4">
                {/* Status Select */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) =>
                      setNewStatus(e.target.value as ViolationStatus)
                    }
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="dismissed">Dismissed</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    rows={4}
                    placeholder="Add notes about this violation..."
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStatusUpdate}
                  disabled={updatingId === selectedViolation.id}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {updatingId === selectedViolation.id
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
