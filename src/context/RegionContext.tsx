import React, { createContext, useContext, useState } from "react";

export interface RegionData {
  name: string;
  density: number;
  population: number;
  area: number;
  growthRate: number;
  populationHistory: { year: number; population: number }[];
  ageGroups: { age: string; male: number; female: number }[];
}

interface RegionContextType {
  selectedRegion: RegionData | null;
  setSelectedRegion: (region: RegionData | null) => void;
}

const RegionContext = createContext<RegionContextType>({
  selectedRegion: null,
  setSelectedRegion: () => {},
});

export const RegionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedRegion, setSelectedRegion] = useState<RegionData | null>(null);
  return (
    <RegionContext.Provider value={{ selectedRegion, setSelectedRegion }}>
      {children}
    </RegionContext.Provider>
  );
};

export const useRegion = () => useContext(RegionContext);
