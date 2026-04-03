import { create } from 'zustand';
import type {
  RobotPose,
  Waypoint,
  Obstacle,
  RobotSize,
  ComputedPath,
  WaypointTool,
  DragTarget,
  FieldPoint,
} from '../types/waypoint';
import {
  DEFAULT_ROBOT_SIZE,
  DEFAULT_START_POSE,
  DEFAULT_END_POSE,
  UNEARTHED_PRESETS,
} from '../lib/waypoint/fieldData';

interface WaypointState {
  startPose: RobotPose;
  endPose: RobotPose;
  waypoints: Waypoint[];
  obstacles: Obstacle[];
  robotSize: RobotSize;
  computedPath: ComputedPath | null;
  generatedCode: string;
  activeTool: WaypointTool;
  dragTarget: DragTarget;
  selectedId: string | null;
  zoom: number;
  panOffset: FieldPoint;
  fieldImageDataUrl: string | null;

  setStartPose: (pose: RobotPose) => void;
  setEndPose: (pose: RobotPose) => void;
  addWaypoint: (waypoint: Waypoint) => void;
  updateWaypoint: (id: string, updates: Partial<Omit<Waypoint, 'id'>>) => void;
  removeWaypoint: (id: string) => void;
  moveWaypoint: (fromIndex: number, toIndex: number) => void;
  addObstacle: (obstacle: Obstacle) => void;
  updateObstacle: (id: string, updates: Partial<Omit<Obstacle, 'id'>>) => void;
  removeObstacle: (id: string) => void;
  setRobotSize: (size: RobotSize) => void;
  setComputedPath: (path: ComputedPath | null) => void;
  setGeneratedCode: (code: string) => void;
  setActiveTool: (tool: WaypointTool) => void;
  setDragTarget: (target: DragTarget) => void;
  setSelectedId: (id: string | null) => void;
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: FieldPoint) => void;
  setFieldImageDataUrl: (url: string | null) => void;
  loadPresetObstacles: () => void;
  clearPresetObstacles: () => void;
  reset: () => void;
}

const initialState = {
  startPose: { ...DEFAULT_START_POSE },
  endPose: { ...DEFAULT_END_POSE },
  waypoints: [] as Waypoint[],
  obstacles: [] as Obstacle[],
  robotSize: { ...DEFAULT_ROBOT_SIZE },
  computedPath: null as ComputedPath | null,
  generatedCode: '',
  activeTool: 'select' as WaypointTool,
  dragTarget: null as DragTarget,
  selectedId: null as string | null,
  zoom: 1,
  panOffset: { x: 0, y: 0 } as FieldPoint,
  fieldImageDataUrl: null as string | null,
};

export const useWaypointStore = create<WaypointState>((set) => ({
  ...initialState,

  setStartPose: (pose) => set({ startPose: pose, computedPath: null, generatedCode: '' }),
  setEndPose: (pose) => set({ endPose: pose, computedPath: null, generatedCode: '' }),

  addWaypoint: (waypoint) =>
    set((state) => ({
      waypoints: [...state.waypoints, waypoint],
      computedPath: null,
      generatedCode: '',
    })),

  updateWaypoint: (id, updates) =>
    set((state) => ({
      waypoints: state.waypoints.map((wp) => (wp.id === id ? { ...wp, ...updates } : wp)),
      computedPath: null,
      generatedCode: '',
    })),

  removeWaypoint: (id) =>
    set((state) => ({
      waypoints: state.waypoints.filter((wp) => wp.id !== id),
      computedPath: null,
      generatedCode: '',
      selectedId: state.selectedId === id ? null : state.selectedId,
    })),

  moveWaypoint: (fromIndex, toIndex) =>
    set((state) => {
      const newWaypoints = [...state.waypoints];
      const [moved] = newWaypoints.splice(fromIndex, 1);
      newWaypoints.splice(toIndex, 0, moved);
      return { waypoints: newWaypoints, computedPath: null, generatedCode: '' };
    }),

  addObstacle: (obstacle) =>
    set((state) => ({
      obstacles: [...state.obstacles, obstacle],
      computedPath: null,
      generatedCode: '',
    })),

  updateObstacle: (id, updates) =>
    set((state) => ({
      obstacles: state.obstacles.map((obs) => (obs.id === id ? { ...obs, ...updates } : obs)),
      computedPath: null,
      generatedCode: '',
    })),

  removeObstacle: (id) =>
    set((state) => ({
      obstacles: state.obstacles.filter((obs) => obs.id !== id),
      computedPath: null,
      generatedCode: '',
      selectedId: state.selectedId === id ? null : state.selectedId,
    })),

  setRobotSize: (size) => set({ robotSize: size, computedPath: null, generatedCode: '' }),
  setComputedPath: (path) => set({ computedPath: path }),
  setGeneratedCode: (code) => set({ generatedCode: code }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setDragTarget: (target) => set({ dragTarget: target }),
  setSelectedId: (id) => set({ selectedId: id }),
  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(4, zoom)) }),
  setPanOffset: (offset) => set({ panOffset: offset }),
  setFieldImageDataUrl: (url) => set({ fieldImageDataUrl: url }),

  loadPresetObstacles: () =>
    set((state) => {
      const existingPresetIds = new Set(state.obstacles.filter((o) => o.isPreset).map((o) => o.id));
      const newPresets = UNEARTHED_PRESETS.filter((p) => !existingPresetIds.has(p.id));
      return {
        obstacles: [...state.obstacles, ...newPresets.map((p) => ({ ...p }))],
        computedPath: null,
        generatedCode: '',
      };
    }),

  clearPresetObstacles: () =>
    set((state) => ({
      obstacles: state.obstacles.filter((o) => !o.isPreset),
      computedPath: null,
      generatedCode: '',
    })),

  reset: () => set({ ...initialState, waypoints: [], obstacles: [] }),
}));
