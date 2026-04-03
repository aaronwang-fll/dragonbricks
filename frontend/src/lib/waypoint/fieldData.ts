import type { Obstacle, RobotPose, RobotSize } from '../../types/waypoint';

/** FLL Unearthed field dimensions in mm (height matches field photo aspect) */
export const FIELD = {
  matWidth: 2362,
  matHeight: 1388,
  homeAreaWidth: 343,
} as const;

/** Default SPIKE Prime robot dimensions in mm */
export const DEFAULT_ROBOT_SIZE: RobotSize = {
  width: 160,
  length: 200,
};

/** Default start pose: home area, upper position, facing east */
export const DEFAULT_START_POSE: RobotPose = {
  x: FIELD.homeAreaWidth / 2,
  y: FIELD.matHeight * 0.35,
  angle: 0,
};

/** Default end pose: home area, lower position, facing east */
export const DEFAULT_END_POSE: RobotPose = {
  x: FIELD.homeAreaWidth / 2,
  y: FIELD.matHeight * 0.65,
  angle: 0,
};

/**
 * Approximate bounding boxes for FLL Unearthed mission models.
 * Positions are measured from the top-left corner of the mat in mm.
 * These are rough approximations for collision detection.
 */
export const UNEARTHED_PRESETS: Obstacle[] = [
  {
    id: 'preset-oil-platform',
    name: 'Oil Platform',
    x: 540,
    y: 60,
    width: 180,
    height: 180,
    isPreset: true,
  },
  {
    id: 'preset-power-plant',
    name: 'Power Plant',
    x: 780,
    y: 80,
    width: 200,
    height: 160,
    isPreset: true,
  },
  {
    id: 'preset-water-reservoir',
    name: 'Water Reservoir',
    x: 1020,
    y: 100,
    width: 150,
    height: 150,
    isPreset: true,
  },
  {
    id: 'preset-wind-turbine',
    name: 'Wind Turbine',
    x: 1250,
    y: 60,
    width: 120,
    height: 200,
    isPreset: true,
  },
  {
    id: 'preset-solar-farm',
    name: 'Solar Farm',
    x: 1450,
    y: 120,
    width: 200,
    height: 140,
    isPreset: true,
  },
  {
    id: 'preset-toy-factory',
    name: 'Toy Factory',
    x: 1700,
    y: 80,
    width: 180,
    height: 180,
    isPreset: true,
  },
  {
    id: 'preset-smart-grid',
    name: 'Smart Grid',
    x: 1920,
    y: 100,
    width: 160,
    height: 160,
    isPreset: true,
  },
  {
    id: 'preset-dinosaur',
    name: 'Dinosaur',
    x: 600,
    y: 500,
    width: 180,
    height: 160,
    isPreset: true,
  },
  {
    id: 'preset-tree-planting',
    name: 'Tree Planting',
    x: 900,
    y: 450,
    width: 140,
    height: 140,
    isPreset: true,
  },
  {
    id: 'preset-mining-site',
    name: 'Mining Site',
    x: 1200,
    y: 500,
    width: 200,
    height: 180,
    isPreset: true,
  },
  {
    id: 'preset-geothermal',
    name: 'Geothermal Energy',
    x: 1500,
    y: 480,
    width: 160,
    height: 160,
    isPreset: true,
  },
  {
    id: 'preset-water-well',
    name: 'Water Well',
    x: 1800,
    y: 500,
    width: 120,
    height: 120,
    isPreset: true,
  },
  {
    id: 'preset-coral-reef',
    name: 'Coral Reef',
    x: 700,
    y: 850,
    width: 200,
    height: 160,
    isPreset: true,
  },
  {
    id: 'preset-hydroelectric',
    name: 'Hydroelectric Dam',
    x: 1100,
    y: 820,
    width: 220,
    height: 180,
    isPreset: true,
  },
  {
    id: 'preset-energy-storage',
    name: 'Energy Storage',
    x: 1600,
    y: 850,
    width: 160,
    height: 140,
    isPreset: true,
  },
];
