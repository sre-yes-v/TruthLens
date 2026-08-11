/**
 * `/admin` — system health and logs (UC-7).
 *
 * A separate route because it serves a different audience (the system
 * administrator, per SRS §2.3) with a different kind of information.
 *
 * NOTE: there is no authentication here. The SRS lists JWT in its acronyms
 * but defines no admin auth endpoint or requirement, and inventing one would
 * be adding a feature the specification doesn't have. Flagged in
 * docs/implementation-notes.md as something the backend must address before
 * any real deployment.
 */
import type { Metadata } from "next";
import { AdminView } from "@/components/admin/AdminView";

export const metadata: Metadata = { title: "Admin · System health" };

export default function AdminPage() {
  return <AdminView />;
}
