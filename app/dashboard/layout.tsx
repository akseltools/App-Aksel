/**
 * app/dashboard/layout.tsx
 * Protected layout for all /dashboard/* routes.
 * - Reads session cookie on the server; redirects to /login if absent.
 * - Renders Sidebar + TopBar alongside page content.
 */

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/actions";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ─── Server-side auth guard ─────────────────────────────────────────────────
  const session = await getSession();

  if (!session.user) {
    // Not logged in → kick to login
    redirect("/login");
  }

  const { user } = session;

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      {/* Left sidebar navigation */}
      <Sidebar userRole={user.role} />

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top bar with user info */}
        <TopBar user={user} />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
