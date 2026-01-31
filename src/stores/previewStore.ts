import { create } from 'zustand';

interface PathPoint {
  x: number;
  y: number;
  angle: number;
}

interface PreviewState {
  isOpen: boolean;
  isExpanded: boolean;
  width: number;
  fieldImage: string | null;
  robotPath: PathPoint[];
  startPosition: { x: number; y: number; angle: number };
  isPlaying: boolean;
  playbackSpeed: number;
  estimatedTime: number;

  // Actions
  setIsOpen: (open: boolean) => void;
  setIsExpanded: (expanded: boolean) => void;
  setWidth: (width: number) => void;
  setFieldImage: (image: string | null) => void;
  setRobotPath: (path: PathPoint[]) => void;
  setStartPosition: (pos: { x: number; y: number; angle: number }) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  setEstimatedTime: (time: number) => void;
  reset: () => void;
}

export const usePreviewStore = create<PreviewState>((set) => ({
  isOpen: false,
  isExpanded: false,
  width: 300,
  fieldImage: null,
  robotPath: [],
  startPosition: { x: 100, y: 100, angle: 0 },
  isPlaying: false,
  playbackSpeed: 1,
  estimatedTime: 0,

  setIsOpen: (open) => set({ isOpen: open }),
  setIsExpanded: (expanded) => set({ isExpanded: expanded }),
  setWidth: (width) => set({ width: Math.max(200, Math.min(600, width)) }),
  setFieldImage: (image) => set({ fieldImage: image }),
  setRobotPath: (path) => set({ robotPath: path }),
  setStartPosition: (pos) => set({ startPosition: pos }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  setEstimatedTime: (time) => set({ estimatedTime: time }),
  reset: () => set({
    robotPath: [],
    isPlaying: false,
  }),
}));
