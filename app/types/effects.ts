// Effect type definitions for the layered effects system

export type EffectType = 'multiply' | 'distortion' | 'outline' | 'subdivide' | 'color';

// Base effect interface
interface BaseEffect {
  id: string;
  enabled: boolean;
}

// Multiply effect - duplicates each letter multiple times
export interface MultiplyEffect extends BaseEffect {
  type: 'multiply';
  parameters: {
    count: number;        // 1-20
    offsetX: number;      // -100 to 100
    offsetY: number;      // -100 to 100
    rotation: number;     // 0-360
    opacityDecay: number; // 0-1
  };
}

// Distortion effect - applies wave functions along path normals
export interface DistortionEffect extends BaseEffect {
  type: 'distortion';
  parameters: {
    waveType: 'sin' | 'saw' | 'triangle';
    amplitude: number;  // 0-50
    frequency: number;  // 0.1-5
    phase: number;      // 0-360
  };
}

// Outline effect - expands paths outward
export interface OutlineEffect extends BaseEffect {
  type: 'outline';
  parameters: {
    thickness: number;           // 0-50
    style: 'round' | 'square';  // stroke-linejoin
  };
}

// Subdivide effect - adds more points to curves for higher resolution
export interface SubdivideEffect extends BaseEffect {
  type: 'subdivide';
  parameters: {
    subdivisions: number;  // 1-20, number of segments per curve
  };
}

// Color effect - changes the color using HSL
export interface ColorEffect extends BaseEffect {
  type: 'color';
  parameters: {
    hue: number;        // 0-360 degrees
    saturation: number; // 0-100 percent
    lightness: number;  // 0-100 percent
  };
}

// Discriminated union of all effects
export type Effect = MultiplyEffect | DistortionEffect | OutlineEffect | SubdivideEffect | ColorEffect;

// Default parameter values for each effect type
export const DEFAULT_PARAMETERS = {
  multiply: {
    count: 5,
    offsetX: 10,
    offsetY: 10,
    rotation: 0,
    opacityDecay: 0.2,
  },
  distortion: {
    waveType: 'sin' as const,
    amplitude: 10,
    frequency: 1,
    phase: 0,
  },
  outline: {
    thickness: 8,
    style: 'round' as const,
  },
  subdivide: {
    subdivisions: 10,
  },
  color: {
    hue: 0,
    saturation: 100,
    lightness: 50,
  },
};

// Parameter ranges for validation and UI
export const PARAMETER_RANGES = {
  multiply: {
    count: { min: 1, max: 20, step: 1 },
    offsetX: { min: -100, max: 100, step: 1 },
    offsetY: { min: -100, max: 100, step: 1 },
    rotation: { min: 0, max: 360, step: 1 },
    opacityDecay: { min: 0, max: 1, step: 0.01 },
  },
  distortion: {
    amplitude: { min: 0, max: 50, step: 0.5 },
    frequency: { min: 0.1, max: 5, step: 0.1 },
    phase: { min: 0, max: 360, step: 1 },
  },
  outline: {
    thickness: { min: 0, max: 50, step: 0.5 },
  },
  subdivide: {
    subdivisions: { min: 1, max: 20, step: 1 },
  },
  color: {
    hue: { min: 0, max: 360, step: 1 },
    saturation: { min: 0, max: 100, step: 1 },
    lightness: { min: 0, max: 100, step: 1 },
  },
};

// Helper function to create a new effect with default parameters
export function createEffect(type: EffectType): Effect {
  const id = crypto.randomUUID();
  
  switch (type) {
    case 'multiply':
      return {
        id,
        type: 'multiply',
        enabled: true,
        parameters: { ...DEFAULT_PARAMETERS.multiply },
      };
    case 'distortion':
      return {
        id,
        type: 'distortion',
        enabled: true,
        parameters: { ...DEFAULT_PARAMETERS.distortion },
      };
    case 'outline':
      return {
        id,
        type: 'outline',
        enabled: true,
        parameters: { ...DEFAULT_PARAMETERS.outline },
      };
    case 'subdivide':
      return {
        id,
        type: 'subdivide',
        enabled: true,
        parameters: { ...DEFAULT_PARAMETERS.subdivide },
      };
    case 'color':
      return {
        id,
        type: 'color',
        enabled: true,
        parameters: { ...DEFAULT_PARAMETERS.color },
      };
  }
}

// Display names for effect types
export const EFFECT_DISPLAY_NAMES: Record<EffectType, string> = {
  multiply: 'Multiply',
  distortion: 'Distortion',
  outline: 'Outline',
  subdivide: 'Subdivide',
  color: 'Color',
};
