"use client";

import { ReactNode } from "react";
import { FamiliarityModal } from "./FamiliarityModal";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <>
      {children}
      <FamiliarityModal />
    </>
  );
}
