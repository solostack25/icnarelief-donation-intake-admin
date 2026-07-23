"use client";

import { usePathname } from "next/navigation";
import Nav from "./Nav";

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  if (isLogin) return <>{children}</>;

  return (
    <>
      <Nav />
      <div className="max-w-5xl mx-auto">{children}</div>
    </>
  );
}
