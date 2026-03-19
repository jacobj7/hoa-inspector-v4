import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import InspectionClient from "./InspectionClient";

export default async function InspectionPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const userRole = (session.user as { role?: string }).role;

  if (userRole !== "inspector" && userRole !== "manager") {
    redirect("/unauthorized");
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <InspectionClient session={session} />
    </main>
  );
}
