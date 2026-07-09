"use client";

import { useEffect, useState } from "react";

/** True when the page was loaded with `?embed=1` — lets Guardian Line
 * be dropped into an iframe (a partner site, a bank's fraud-education
 * page) with its own header/footer/nav chrome hidden, showing just the
 * Live Monitor or Voice Demo content. Read from `window.location`
 * directly (not `next/navigation`'s `useSearchParams`) so this can be
 * called from components rendered in the root layout without forcing
 * the whole app out of static rendering. */
export function useEmbedMode(): boolean {
  const [embed, setEmbed] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEmbed(new URLSearchParams(window.location.search).get("embed") === "1");
  }, []);
  return embed;
}
