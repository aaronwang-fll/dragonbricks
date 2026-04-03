export type HubButton = 'center' | 'left' | 'right' | 'bluetooth';

export type ButtonAction = 'run' | 'next' | 'previous' | 'stop' | 'unused';

export interface ButtonMapping {
  center: ButtonAction;
  left: ButtonAction;
  right: ButtonAction;
  bluetooth: ButtonAction;
}

export interface UberCodeRun {
  programId: string;
  programName: string;
}

export const DEFAULT_BUTTON_MAPPING: ButtonMapping = {
  center: 'run',
  right: 'next',
  left: 'previous',
  bluetooth: 'unused',
};

/** Maps our button names to Pybricks Button enum values */
export const PYBRICKS_BUTTON_MAP: Record<HubButton, string> = {
  center: 'Button.CENTER',
  left: 'Button.LEFT',
  right: 'Button.RIGHT',
  bluetooth: 'Button.BLUETOOTH',
};
