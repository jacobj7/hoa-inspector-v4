import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function RootPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const role = session.user?.role as string | undefined;

  if (role === "manager") {
    redirect("/dashboard");
  } else if (role === "inspector") {
    redirect("/inspection");
  } else if (role === "owner") {
    redirect("/owner");
  } else {
    redirect("/login");
  }
}
