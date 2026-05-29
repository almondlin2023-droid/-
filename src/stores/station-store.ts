import { create } from "zustand";
import type { Station, SubStation } from "@/types/diagnosis";

interface StationState {
  // 当前选中的电站
  currentStation: Station | null;
  subStations: SubStation[];
  // 视图模式
  viewMode: "station" | "sub-station";
  selectedSubStationId: string | null;

  // Actions
  setCurrentStation: (station: Station | null) => void;
  setSubStations: (subStations: SubStation[]) => void;
  setViewMode: (mode: "station" | "sub-station") => void;
  setSelectedSubStation: (id: string | null) => void;
}

export const useStationStore = create<StationState>((set) => ({
  currentStation: null,
  subStations: [],
  viewMode: "station",
  selectedSubStationId: null,

  setCurrentStation: (station) => set({ currentStation: station }),
  setSubStations: (subStations) => set({ subStations }),
  setViewMode: (viewMode) => set({ viewMode }),
  setSelectedSubStation: (id) => set({ selectedSubStationId: id }),
}));
