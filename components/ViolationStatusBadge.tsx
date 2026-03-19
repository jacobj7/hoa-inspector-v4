"use client";

import React from "react";

type ViolationStatus = "open" | "in_review" | "resolved" | "closed";

interface ViolationStatusBadgeProps {
  status: ViolationStatus;
}

const statusConfig: Record<
  ViolationStatus,
  { label: string; className: string }
> = {
  open: {
    label: "Open",
    className: "bg-red-100 text-red-800 border border-red-200",
  },
  in_review: {
    label: "In Review",
    className: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  },
  resolved: {
    label: "Resolved",
    className: "bg-green-100 text-green-800 border border-green-200",
  },
  closed: {
    label: "Closed",
    className: "bg-gray-100 text-gray-800 border border-gray-200",
  },
};

export default function ViolationStatusBadge({
  status,
}: ViolationStatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-800 border border-gray-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
