import { Suspense } from "react";
import ViolationsClient from "./ViolationsClient";

export const metadata = {
  title: "Violations | Manager",
  description: "View and manage violations",
};

export default function ViolationsPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center">Loading violations...</div>}
    >
      <ViolationsClient />
    </Suspense>
  );
}
