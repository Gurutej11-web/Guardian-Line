"use client";

import { usePathname } from "next/navigation";

/** Re-mounts (and so re-plays a fade-in) on every route change, giving
 * navigation a subtle transition without pulling in a routing-animation
 * library. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-fade-in flex flex-1 flex-col">
      {children}
    </div>
  );
}
