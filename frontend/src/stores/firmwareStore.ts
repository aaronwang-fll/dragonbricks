import { create } from 'zustand';
import type { HubType } from '../lib/firmware/hubTypes';
import type { InstallProgress } from '../lib/firmware/installer';

export type WizardStep = 'hub-select' | 'license' | 'naming' | 'update-mode' | 'flashing' | 'complete';

interface FirmwareState {
  // Wizard state
  isOpen: boolean;
  currentStep: WizardStep;
  
  // User selections
  selectedHub: HubType | null;
  hubName: string;
  licenseAccepted: boolean;
  
  // Installation progress
  installProgress: InstallProgress | null;
  error: string | null;
  
  // Actions
  openWizard: () => void;
  closeWizard: () => void;
  reset: () => void;
  
  setStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  
  selectHub: (hub: HubType) => void;
  setHubName: (name: string) => void;
  acceptLicense: () => void;
  
  setInstallProgress: (progress: InstallProgress | null) => void;
  setError: (error: string | null) => void;
}

const STEP_ORDER: WizardStep[] = ['hub-select', 'license', 'naming', 'update-mode', 'flashing', 'complete'];

const initialState = {
  isOpen: false,
  currentStep: 'hub-select' as WizardStep,
  selectedHub: null,
  hubName: '',
  licenseAccepted: false,
  installProgress: null,
  error: null,
};

export const useFirmwareStore = create<FirmwareState>((set, get) => ({
  ...initialState,
  
  openWizard: () => set({ ...initialState, isOpen: true }),
  
  closeWizard: () => set({ isOpen: false }),
  
  reset: () => set(initialState),
  
  setStep: (step) => set({ currentStep: step, error: null }),
  
  nextStep: () => {
    const { currentStep } = get();
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex < STEP_ORDER.length - 1) {
      set({ currentStep: STEP_ORDER[currentIndex + 1], error: null });
    }
  },
  
  prevStep: () => {
    const { currentStep } = get();
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex > 0) {
      set({ currentStep: STEP_ORDER[currentIndex - 1], error: null });
    }
  },
  
  selectHub: (hub) => set({ selectedHub: hub }),
  
  setHubName: (name) => set({ hubName: name }),
  
  acceptLicense: () => set({ licenseAccepted: true }),
  
  setInstallProgress: (progress) => set({ installProgress: progress }),
  
  setError: (error) => set({ error }),
}));
