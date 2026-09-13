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

  // Handle mid-session token expiration / 401 events
  useEffect(() => {
    function handleAuthExpired() {
      if (!PUBLIC_PATHS.includes(pathname)) {
        router.replace("/login");
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener("collabboard-auth-expired", handleAuthExpired);
      return () => window.removeEventListener("collabboard-auth-expired", handleAuthExpired);
    }
  }, [pathname, router]);

  // Don't render until client-side hydration is complete
  if (!mounted) {
    return null;
  }

  return <>{children}</>;
}
