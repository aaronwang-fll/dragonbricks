import { create } from 'zustand';
import type { RobotProfile } from '../types';

interface ProfileState {
  profiles: RobotProfile[];
  currentProfileId: string | null;
  useProfile: boolean;

  // Actions
  addProfile: (profile: RobotProfile) => void;
  updateProfile: (id: string, updates: Partial<RobotProfile>) => void;
  deleteProfile: (id: string) => void;
  setDefaultProfile: (id: string) => void;
  setCurrentProfileId: (id: string | null) => void;
  setUseProfile: (use: boolean) => void;
  getCurrentProfile: () => RobotProfile | null;
  getDefaultProfile: () => RobotProfile | null;
}

const createDefaultProfile = (): RobotProfile => ({
  id: 'main',
  name: 'Main',
  isDefault: true,
  leftMotor: { port: 'A', direction: 'counterclockwise' },
  rightMotor: { port: 'B', direction: 'clockwise' },
  wheelDiameter: 56,
  axleTrack: 112,
  sensors: [
    { type: 'color', port: 'C' },
    { type: 'ultrasonic', port: 'D' },
  ],
  extraMotors: [],
});

export const useProfileStore = create<ProfileState>((set, get) => ({
  profiles: [createDefaultProfile()],
  currentProfileId: 'main',
  useProfile: true,

  addProfile: (profile) => set((state) => ({
    profiles: [...state.profiles, profile],
  })),

  updateProfile: (id, updates) => set((state) => ({
    profiles: state.profiles.map((p) =>
      p.id === id ? { ...p, ...updates } : p
    ),
  })),

  deleteProfile: (id) => set((state) => ({
    profiles: state.profiles.filter((p) => p.id !== id),
    currentProfileId:
      state.currentProfileId === id
        ? state.profiles.find((p) => p.isDefault)?.id ?? null
        : state.currentProfileId,
  })),

  setDefaultProfile: (id) => set((state) => ({
    profiles: state.profiles.map((p) => ({
      ...p,
      isDefault: p.id === id,
    })),
  })),

  setCurrentProfileId: (id) => set({ currentProfileId: id }),
  setUseProfile: (use) => set({ useProfile: use }),

  getCurrentProfile: () => {
    const state = get();
    return state.profiles.find((p) => p.id === state.currentProfileId) ?? null;
  },

  getDefaultProfile: () => {
    const state = get();
    return state.profiles.find((p) => p.isDefault) ?? null;
  },
}));
