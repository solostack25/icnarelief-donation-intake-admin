"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

const links = [
  { href: "/", label: "Today" },
  { href: "/weekly", label: "Weekly" },
  { href: "/monthly", label: "Monthly" },
  { href: "/users", label: "Users" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <span className="font-bold text-brand-dark">Donation Admin</span>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm font-medium ${
                pathname === l.href ? "text-brand-dark" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <button onClick={signOut} className="text-sm text-gray-400 hover:text-gray-600">
          Sign out
        </button>
      </div>
    </nav>
  );
}
