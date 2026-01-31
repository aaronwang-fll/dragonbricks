import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: 'click' | 'type' | 'wait';
  nextOnAction?: boolean;
}

interface OnboardingState {
  // Tutorial state
  hasCompletedTutorial: boolean;
  showTutorial: boolean;
  currentTutorialStep: number;
  tutorialSteps: TutorialStep[];

  // Tooltip tour state
  showTooltipTour: boolean;
  currentTooltipStep: number;
  dismissedTooltips: Set<string>;

  // Actions
  startTutorial: () => void;
  nextTutorialStep: () => void;
  previousTutorialStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  resetTutorial: () => void;

  startTooltipTour: () => void;
  nextTooltip: () => void;
  dismissTooltip: (id: string) => void;
  endTooltipTour: () => void;
}

const DEFAULT_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to DragonBricks!',
    description:
      'DragonBricks helps you program LEGO SPIKE Prime robots using natural language. Let\'s take a quick tour!',
  },
  {
    id: 'setup',
    title: 'Setup Section',
    description:
      'Configure your robot here. Select a robot profile or manually set motor and sensor ports.',
    targetSelector: '[data-tour="setup"]',
    position: 'bottom',
  },
  {
    id: 'editor',
    title: 'Command Editor',
    description:
      'Type natural language commands here. Try "move forward 200mm" or "turn right 90 degrees".',
    targetSelector: '[data-tour="editor"]',
    position: 'right',
  },
  {
    id: 'try-command',
    title: 'Try a Command',
    description:
      'Type "move forward 100mm" and press Enter. DragonBricks will convert it to Python code automatically!',
    targetSelector: '[data-tour="editor"]',
    position: 'right',
    action: 'type',
    nextOnAction: true,
  },
  {
    id: 'preview',
    title: 'Path Preview',
    description:
      'See a visual preview of your robot\'s path. Click "Preview" on the right to open it.',
    targetSelector: '[data-tour="preview"]',
    position: 'left',
  },
  {
    id: 'routines',
    title: 'Reusable Routines',
    description:
      'Create reusable routines by typing "Define my_routine:" followed by commands. Use them anywhere in your program!',
    targetSelector: '[data-tour="routines"]',
    position: 'top',
  },
  {
    id: 'connect',
    title: 'Connect Your Robot',
    description:
      'Click "Connect Hub" to connect to your SPIKE Prime hub via Bluetooth. Then run your program!',
    targetSelector: '[data-tour="connect"]',
    position: 'bottom',
  },
  {
    id: 'run',
    title: 'Run Your Program',
    description:
      'Click the green "Run" button to upload and execute your program on the robot.',
    targetSelector: '[data-tour="run"]',
    position: 'bottom',
  },
  {
    id: 'complete',
    title: 'You\'re Ready!',
    description:
      'That\'s the basics! Explore more features like autocomplete, error translation, and team sharing. Have fun programming!',
  },
];

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      hasCompletedTutorial: false,
      showTutorial: false,
      currentTutorialStep: 0,
      tutorialSteps: DEFAULT_TUTORIAL_STEPS,

      showTooltipTour: false,
      currentTooltipStep: 0,
      dismissedTooltips: new Set(),

      startTutorial: () =>
        set({
          showTutorial: true,
          currentTutorialStep: 0,
        }),

      nextTutorialStep: () => {
        const { currentTutorialStep, tutorialSteps } = get();
        if (currentTutorialStep < tutorialSteps.length - 1) {
          set({ currentTutorialStep: currentTutorialStep + 1 });
        } else {
          get().completeTutorial();
        }
      },

      previousTutorialStep: () => {
        const { currentTutorialStep } = get();
        if (currentTutorialStep > 0) {
          set({ currentTutorialStep: currentTutorialStep - 1 });
        }
      },

      skipTutorial: () =>
        set({
          showTutorial: false,
          hasCompletedTutorial: true,
        }),

      completeTutorial: () =>
        set({
          showTutorial: false,
          hasCompletedTutorial: true,
        }),

      resetTutorial: () =>
        set({
          hasCompletedTutorial: false,
          showTutorial: false,
          currentTutorialStep: 0,
        }),

      startTooltipTour: () =>
        set({
          showTooltipTour: true,
          currentTooltipStep: 0,
        }),

      nextTooltip: () => {
        const { currentTooltipStep, tutorialSteps } = get();
        const stepsWithTargets = tutorialSteps.filter((s) => s.targetSelector);
        if (currentTooltipStep < stepsWithTargets.length - 1) {
          set({ currentTooltipStep: currentTooltipStep + 1 });
        } else {
          get().endTooltipTour();
        }
      },

      dismissTooltip: (id: string) => {
        const { dismissedTooltips } = get();
        const newDismissed = new Set(dismissedTooltips);
        newDismissed.add(id);
        set({ dismissedTooltips: newDismissed });
      },

      endTooltipTour: () =>
        set({
          showTooltipTour: false,
        }),
    }),
    {
      name: 'dragonbricks-onboarding',
      partialize: (state) => ({
        hasCompletedTutorial: state.hasCompletedTutorial,
        dismissedTooltips: Array.from(state.dismissedTooltips),
      }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as object),
        dismissedTooltips: new Set(
          (persisted as { dismissedTooltips?: string[] })?.dismissedTooltips || []
        ),
      }),
    }
  )
);
