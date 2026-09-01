import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isPlatformMember } from "@/lib/authz";
import { getAdminDashboardData } from "@/lib/queries";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const metadata: Metadata = {
  title: "Admin — AutoRescue",
};

// Route segment default for consistency with the other pages; in practice
// this segment is already fully dynamic (auth() reads cookies) so it
// re-renders on every request regardless — the 5s client poll on top of
// that is what actually keeps the tables current.
export const revalidate = 10;

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user || !(await isPlatformMember(session.user.id))) {
    redirect("/");
  }

  // Fetched here (not client-side after mount) so the tables have real data
  // on the very first paint — no loading skeleton on every visit. The
  // dashboard keeps this fresh afterwards by polling /api/admin/data.
  const initialData = await getAdminDashboardData();

  return <AdminDashboard initialData={initialData} />;
}
