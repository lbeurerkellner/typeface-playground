// Animation configuration types

export type EasingFunction = 
  | 'linear'
  | 'ease'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'bounce'
  | 'elastic';

export interface AnimationConfig {
  enabled: boolean;
  min: number;
  max: number;
  speed: number; // cycles per second
  easing: EasingFunction;
  pingPong: boolean; // if true, oscillates min→max→min, otherwise loops min→max→min (jump)
}

// Animation state for a single parameter
export interface ParameterAnimation {
  [paramName: string]: AnimationConfig;
}

// Animation state for all effects
export interface EffectAnimations {
  [effectId: string]: ParameterAnimation;
}

// Easing function implementations
export const easingFunctions: Record<EasingFunction, (t: number) => number> = {
  linear: (t: number) => t,
  
  ease: (t: number) => {
    // CSS ease equivalent
    return t < 0.5
      ? 2 * t * t
      : -1 + (4 - 2 * t) * t;
  },
  
  'ease-in': (t: number) => t * t,
  
  'ease-out': (t: number) => t * (2 - t),
  
  'ease-in-out': (t: number) => {
    return t < 0.5
      ? 2 * t * t
      : -1 + (4 - 2 * t) * t;
  },
  
  bounce: (t: number) => {
    // Bounce easing out
    const n1 = 7.5625;
    const d1 = 2.75;
    
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  },
  
  elastic: (t: number) => {
    // Elastic easing out
    const c4 = (2 * Math.PI) / 3;
    
    return t === 0
      ? 0
      : t === 1
      ? 1
      : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
};

// Calculate animated value based on time
export function getAnimatedValue(
  config: AnimationConfig,
  time: number // current time in seconds
): number {
  if (!config.enabled) {
    return config.min; // Return min when not animated
  }
  
  const { min, max, speed, easing, pingPong } = config;
  
  // Calculate progress (0 to 1) based on speed
  const cycleTime = 1 / speed; // seconds per cycle
  let progress = (time % cycleTime) / cycleTime;
  
  // If ping-pong mode, make it go 0→1→0 instead of 0→1→0 (jump)
  if (pingPong) {
    // Double the progress so 0→0.5 becomes 0→1, and 0.5→1 becomes 1→0
    if (progress < 0.5) {
      progress = progress * 2; // 0→1 (forward)
    } else {
      progress = (1 - progress) * 2; // 1→0 (backward)
    }
  }
  
  // Apply easing function
  const easedProgress = easingFunctions[easing](progress);
  
  // Interpolate between min and max
  return min + (max - min) * easedProgress;
}

// Default animation config
export const DEFAULT_ANIMATION_CONFIG: AnimationConfig = {
  enabled: false,
  min: 0,
  max: 100,
  speed: 1,
  easing: 'ease-in-out',
  pingPong: true, // Default to smooth oscillation
};
