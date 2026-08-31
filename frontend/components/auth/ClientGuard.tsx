"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getToken } from "@/lib/api";

const PUBLIC_PATHS = ["/login", "/register"];

export function ClientGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = getToken();
    
    if (!token && !PUBLIC_PATHS.includes(pathname)) {
      router.replace("/login");
    } else if (token && PUBLIC_PATHS.includes(pathname)) {
      router.replace("/dashboard");
    }
  }, [pathname, router]);

  // Don't render until client-side hydration is complete
  if (!mounted) {
    return null;
  }

  return <>{children}</>;
}
