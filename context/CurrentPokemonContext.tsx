import React, { createContext, useContext, useState, ReactNode } from "react";

export type CurrentPokemon = {
  id: number | null;
  name: string | null;
  types: string[]; // en minúsculas
};

type Ctx = {
  current: CurrentPokemon;
  setCurrent: (p: CurrentPokemon) => void;
  chatOpen: boolean;
  setChatOpen: (v: boolean) => void;
};

const CurrentPokemonContext = createContext<Ctx | null>(null);

export function CurrentPokemonProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<CurrentPokemon>({ id: null, name: null, types: [] });
  const [chatOpen, setChatOpen] = useState(false);
  return (
    <CurrentPokemonContext.Provider value={{ current, setCurrent, chatOpen, setChatOpen }}>
      {children}
    </CurrentPokemonContext.Provider>
  );
}

export function useCurrentPokemon() {
  const ctx = useContext(CurrentPokemonContext);
  if (!ctx) throw new Error("useCurrentPokemon must be used within CurrentPokemonProvider");
  return ctx;
}