"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Property {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  property_type: string;
  units_count: number;
  monthly_rent: number;
  status: string;
  created_at: string;
}

interface PropertiesResponse {
  properties: Property[];
  total: number;
}

export default function PropertiesClient() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const [newProperty, setNewProperty] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    property_type: "residential",
    units_count: 1,
    monthly_rent: 0,
    status: "active",
  });

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterType) params.set("property_type", filterType);
      if (filterStatus) params.set("status", filterStatus);

      const res = await fetch(`/api/properties?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch properties");
      }
      const data: PropertiesResponse = await res.json();
      setProperties(data.properties || []);
      setTotal(data.total || 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [search, filterType, filterStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProperties();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchProperties]);

  const handleAddProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProperty),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add property");
      }

      setFormSuccess("Property added successfully!");
      setNewProperty({
        name: "",
        address: "",
        city: "",
        state: "",
        zip_code: "",
        property_type: "residential",
        units_count: 1,
        monthly_rent: 0,
        status: "active",
      });
      setShowAddForm(false);
      fetchProperties();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    setNewProperty((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const getPropertyTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      residential: "Residential",
      commercial: "Commercial",
      industrial: "Industrial",
      mixed: "Mixed Use",
    };
    return labels[type] || type;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Properties</h1>
          <p className="mt-1 text-sm text-gray-500">
            {total} {total === 1 ? "property" : "properties"} total
          </p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setFormError(null);
            setFormSuccess(null);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
        >
          {showAddForm ? (
            <>
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Cancel
            </>
          ) : (
            <>
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Property
            </>
          )}
        </button>
      </div>

      {/* Success Message */}
      {formSuccess && (
        <div className="mb-6 rounded-md bg-green-50 p-4">
          <div className="flex">
            <svg
              className="h-5 w-5 text-green-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <p className="ml-3 text-sm font-medium text-green-800">
              {formSuccess}
            </p>
          </div>
        </div>
      )}

      {/* Add Property Form */}
      {showAddForm && (
        <div className="mb-8 bg-white shadow rounded-lg p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Add New Property
          </h2>
          {formError && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{formError}</p>
            </div>
          )}
          <form
            onSubmit={handleAddProperty}
            className="grid grid-cols-1 gap-6 sm:grid-cols-2"
          >
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                Property Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={newProperty.name}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2"
                placeholder="e.g. Sunset Apartments"
              />
            </div>

            <div>
              <label
                htmlFor="property_type"
                className="block text-sm font-medium text-gray-700"
              >
                Property Type <span className="text-red-500">*</span>
              </label>
              <select
                id="property_type"
                name="property_type"
                required
                value={newProperty.property_type}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2"
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="industrial">Industrial</option>
                <option value="mixed">Mixed Use</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="address"
                className="block text-sm font-medium text-gray-700"
              >
                Street Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="address"
                name="address"
                required
                value={newProperty.address}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2"
                placeholder="123 Main Street"
              />
            </div>

            <div>
              <label
                htmlFor="city"
                className="block text-sm font-medium text-gray-700"
              >
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="city"
                name="city"
                required
                value={newProperty.city}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2"
                placeholder="New York"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="state"
                  className="block text-sm font-medium text-gray-700"
                >
                  State <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  required
                  maxLength={2}
                  value={newProperty.state}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 uppercase"
                  placeholder="NY"
                />
              </div>
              <div>
                <label
                  htmlFor="zip_code"
                  className="block text-sm font-medium text-gray-700"
                >
                  ZIP Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="zip_code"
                  name="zip_code"
                  required
                  value={newProperty.zip_code}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2"
                  placeholder="10001"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="units_count"
                className="block text-sm font-medium text-gray-700"
              >
                Number of Units <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="units_count"
                name="units_count"
                required
                min={1}
                value={newProperty.units_count}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2"
              />
            </div>

            <div>
              <label
                htmlFor="monthly_rent"
                className="block text-sm font-medium text-gray-700"
              >
                Monthly Rent ($) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="monthly_rent"
                name="monthly_rent"
                required
                min={0}
                step={0.01}
                value={newProperty.monthly_rent}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2"
              />
            </div>

            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-gray-700"
              >
                Status
              </label>
              <select
                id="status"
                name="status"
                value={newProperty.status}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>

            <div className="sm:col-span-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Saving...
                  </>
                ) : (
                  "Add Property"
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search and Filters */}
      <div className="mb-6 bg-white shadow rounded-lg p-4 border border-gray-200">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search properties..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">All Types</option>
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
              <option value="industrial">Industrial</option>
              <option value="mixed">Mixed Use</option>
            </select>
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
        </div>
      </div>

      {/* Properties List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <svg
              className="animate-spin h-8 w-8 text-indigo-600"
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
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <p className="text-sm text-gray-500">Loading properties...</p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-md bg-red-50 p-6 text-center">
          <svg
            className="mx-auto h-8 w-8 text-red-400 mb-3"
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
          <p className="text-sm font-medium text-red-800">{error}</p>
          <button
            onClick={fetchProperties}
            className="mt-3 text-sm text-red-600 underline hover:text-red-800"
          >
            Try again
          </button>
        </div>
      ) : properties.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200 shadow">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
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
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            No properties found
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {search || filterType || filterStatus
              ? "Try adjusting your search or filters."
              : "Get started by adding your first property."}
          </p>
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Property
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <Link
              key={property.id}
              href={`/properties/${property.id}`}
              className="block bg-white rounded-lg border border-gray-200 shadow hover:shadow-md hover:border-indigo-300 transition-all group"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                      {property.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {getPropertyTypeLabel(property.property_type)}
                    </p>
                  </div>
                  <span
                    className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadgeClass(property.status)}`}
                  >
                    {property.status}
                  </span>
                </div>

                <div className="flex items-start gap-1.5 text-sm text-gray-600 mb-4">
                  <svg
                    className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span className="line-clamp-2">
                    {property.address}, {property.city}, {property.state}{" "}
                    {property.zip_code}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                      Units
                    </p>
                    <p className="text-lg font-semibold text-gray-900 mt-0.5">
                      {property.units_count}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                      Monthly Rent
                    </p>
                    <p className="text-lg font-semibold text-gray-900 mt-0.5">
                      $
                      {Number(property.monthly_rent).toLocaleString("en-US", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center text-sm text-indigo-600 font-medium group-hover:text-indigo-700">
                  View details
                  <svg
                    className="ml-1 h-4 w-4 group-hover:translate-x-0.5 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
