"use client";

import { ChangelogModal, useChangelogVisible } from "./ChangelogModal";

export function ChangelogGate() {
  const [visible, setVisible] = useChangelogVisible();
  if (!visible) return null;
  return <ChangelogModal onClose={() => setVisible(false)} />;
}
