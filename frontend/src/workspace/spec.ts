import { createContext, useContext } from "react";
import type { Spec } from "@/domain";

const SpecContext = createContext<Spec | null>(null);

export const SpecProvider = SpecContext.Provider;

export function useSpec(): Spec {
  const spec = useContext(SpecContext);
  if (!spec) throw new Error("useSpec must be used inside <SpecProvider>");
  return spec;
}
