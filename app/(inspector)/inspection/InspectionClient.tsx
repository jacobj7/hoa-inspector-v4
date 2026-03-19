"use client";

import { useState, useRef, ChangeEvent, FormEvent } from "react";

interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
}

interface ViolationResponse {
  id: string;
  property_id: string;
  violation_type: string;
  severity: string;
  description: string;
  status: string;
  created_at: string;
}

const VIOLATION_TYPES = [
  "Structural Damage",
  "Electrical Hazard",
  "Plumbing Issue",
  "Fire Safety",
  "Pest Infestation",
  "Mold / Water Damage",
  "Code Violation",
  "Zoning Violation",
  "Unsafe Conditions",
  "Other",
];

const SEVERITY_LEVELS = [
  {
    value: "low",
    label: "Low",
    color: "bg-green-100 text-green-800 border-green-300",
  },
  {
    value: "medium",
    label: "Medium",
    color: "bg-yellow-100 text-yellow-800 border-yellow-300",
  },
  {
    value: "high",
    label: "High",
    color: "bg-orange-100 text-orange-800 border-orange-300",
  },
  {
    value: "critical",
    label: "Critical",
    color: "bg-red-100 text-red-800 border-red-300",
  },
];

export default function InspectionClient() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertySearch, setPropertySearch] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    null,
  );
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingProperties, setLoadingProperties] = useState(false);

  const [violationType, setViolationType] = useState("");
  const [severity, setSeverity] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchProperties = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setProperties([]);
      setShowDropdown(false);
      return;
    }
    setLoadingProperties(true);
    try {
      const res = await fetch(
        `/api/properties?search=${encodeURIComponent(query)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setProperties(data.properties || []);
        setShowDropdown(true);
      }
    } catch {
      // silently fail search
    } finally {
      setLoadingProperties(false);
    }
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPropertySearch(value);
    setSelectedProperty(null);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      searchProperties(value);
    }, 300);
  };

  const handleSelectProperty = (property: Property) => {
    setSelectedProperty(property);
    setPropertySearch(
      `${property.address}, ${property.city}, ${property.state}`,
    );
    setShowDropdown(false);
    setProperties([]);
  };

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newPhotos = [...photos, ...files].slice(0, 5);
    setPhotos(newPhotos);

    const newUrls = newPhotos.map((file) => URL.createObjectURL(file));
    photoPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    setPhotoPreviewUrls(newUrls);
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviewUrls[index]);
    const newPhotos = photos.filter((_, i) => i !== index);
    const newUrls = photoPreviewUrls.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    setPhotoPreviewUrls(newUrls);
  };

  const uploadPhotos = async (violationId: string) => {
    if (photos.length === 0) return;
    setUploadingPhotos(true);
    try {
      for (const photo of photos) {
        const formData = new FormData();
        formData.append("photo", photo);
        await fetch(`/api/violations/${violationId}/photos`, {
          method: "POST",
          body: formData,
        });
      }
    } finally {
      setUploadingPhotos(false);
    }
  };

  const resetForm = () => {
    setSelectedProperty(null);
    setPropertySearch("");
    setViolationType("");
    setSeverity("");
    setDescription("");
    photoPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    setPhotos([]);
    setPhotoPreviewUrls([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    if (!selectedProperty) {
      setErrorMessage("Please select a property.");
      return;
    }
    if (!violationType) {
      setErrorMessage("Please select a violation type.");
      return;
    }
    if (!severity) {
      setErrorMessage("Please select a severity level.");
      return;
    }
    if (!description.trim()) {
      setErrorMessage("Please enter a description.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/violations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: selectedProperty.id,
          violation_type: violationType,
          severity,
          description: description.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${res.status}`);
      }

      const violation: ViolationResponse = await res.json();

      if (photos.length > 0) {
        await uploadPhotos(violation.id);
      }

      setSuccessMessage(
        `Violation #${violation.id.slice(0, 8)} submitted successfully${photos.length > 0 ? ` with ${photos.length} photo(s)` : ""}.`,
      );
      resetForm();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">New Inspection</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Report a property violation
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="px-4 py-6 space-y-6 max-w-lg mx-auto"
      >
        {/* Success Message */}
        {successMessage && (
          <div className="rounded-xl bg-green-50 border border-green-200 p-4 flex items-start gap-3">
            <svg
              className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-green-800 font-medium">
              {successMessage}
            </p>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-red-800 font-medium">{errorMessage}</p>
          </div>
        )}

        {/* Property Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Property <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <svg
                className="w-4 h-4 text-gray-400"
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
              value={propertySearch}
              onChange={handleSearchChange}
              onFocus={() => properties.length > 0 && setShowDropdown(true)}
              placeholder="Search by address..."
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
              autoComplete="off"
            />
            {loadingProperties && (
              <div className="absolute inset-y-0 right-3 flex items-center">
                <svg
                  className="w-4 h-4 text-gray-400 animate-spin"
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
              </div>
            )}
          </div>

          {/* Dropdown */}
          {showDropdown && properties.length > 0 && (
            <div className="mt-1 border border-gray-200 rounded-xl overflow-hidden shadow-lg bg-white">
              {properties.map((property) => (
                <button
                  key={property.id}
                  type="button"
                  onClick={() => handleSelectProperty(property)}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0"
                >
                  <p className="text-sm font-medium text-gray-900">
                    {property.address}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {property.city}, {property.state}
                  </p>
                </button>
              ))}
            </div>
          )}

          {showDropdown &&
            properties.length === 0 &&
            !loadingProperties &&
            propertySearch.length >= 2 && (
              <div className="mt-1 border border-gray-200 rounded-xl p-4 bg-white text-center">
                <p className="text-sm text-gray-500">No properties found</p>
              </div>
            )}

          {selectedProperty && (
            <div className="mt-2 flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2">
              <svg
                className="w-4 h-4 text-blue-500 flex-shrink-0"
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
              <span className="text-xs text-blue-700 font-medium">
                Property selected
              </span>
            </div>
          )}
        </div>

        {/* Violation Type */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Violation Type <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              value={violationType}
              onChange={(e) => setViolationType(e.target.value)}
              className="w-full appearance-none px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 pr-10"
            >
              <option value="">Select violation type...</option>
              {VIOLATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Severity */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Severity <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {SEVERITY_LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() => setSeverity(level.value)}
                className={`py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                  severity === level.value
                    ? `${level.color} border-current shadow-sm scale-[0.98]`
                    : "bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300"
                }`}
              >
                {level.label}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the violation in detail..."
            rows={4}
            maxLength={2000}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 resize-none"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">
            {description.length}/2000
          </p>
        </div>

        {/* Photo Upload */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Photos{" "}
            <span className="text-gray-400 font-normal">(optional, max 5)</span>
          </label>

          {/* Photo Previews */}
          {photoPreviewUrls.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {photoPreviewUrls.map((url, index) => (
                <div
                  key={index}
                  className="relative aspect-square rounded-xl overflow-hidden bg-gray-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center"
                  >
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {photos.length < 5 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-300 rounded-xl py-6 flex flex-col items-center gap-2 hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="text-sm text-gray-500">
                {photos.length === 0
                  ? "Add photos"
                  : `Add more (${5 - photos.length} remaining)`}
              </span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            onChange={handlePhotoChange}
            className="hidden"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || uploadingPhotos}
          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-semibold text-base shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting || uploadingPhotos ? (
            <>
              <svg
                className="w-5 h-5 animate-spin"
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
              {uploadingPhotos ? "Uploading photos..." : "Submitting..."}
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Submit Violation
            </>
          )}
        </button>

        <div className="h-6" />
      </form>
    </div>
  );
}
