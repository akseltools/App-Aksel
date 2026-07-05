/**
 * app/page.tsx
 * Root route — immediately redirects to /login.
 * The actual home is the dashboard (behind auth guard).
 */

import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/login");
}
