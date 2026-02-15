// Preset system types

import type { Effect } from './effects';
import type { EffectAnimations } from './animation';

export interface Preset {
  id: string;
  name: string;
  effects: Effect[];
  animations: EffectAnimations;
  createdAt: number;
}

export interface PresetCollection {
  presets: Preset[];
}
