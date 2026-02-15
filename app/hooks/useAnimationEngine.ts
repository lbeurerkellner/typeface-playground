// Animation engine hook - manages animation loop and value updates

import { useEffect, useRef, useState } from 'react';
import type { EffectAnimations } from '../types/animation';
import { getAnimatedValue } from '../types/animation';
import type { Effect } from '../types/effects';

export function useAnimationEngine(
  effects: Effect[],
  animations: EffectAnimations,
  onUpdate: (effectId: string, paramName: string, value: number) => void
) {
  const [isRunning, setIsRunning] = useState(false);
  const startTimeRef = useRef<number>(Date.now() / 1000);
  const animationFrameRef = useRef<number>();

  // Check if any animations are enabled
  const hasActiveAnimations = Object.values(animations).some(effectAnims =>
    Object.values(effectAnims).some(config => config.enabled)
  );

  useEffect(() => {
    if (!hasActiveAnimations) {
      setIsRunning(false);
      return;
    }

    setIsRunning(true);
    startTimeRef.current = Date.now() / 1000;

    const animate = () => {
      const currentTime = Date.now() / 1000;
      const elapsed = currentTime - startTimeRef.current;

      // Update each animated parameter
      Object.entries(animations).forEach(([effectId, effectAnims]) => {
        Object.entries(effectAnims).forEach(([paramName, config]) => {
          if (config.enabled) {
            const value = getAnimatedValue(config, elapsed);
            onUpdate(effectId, paramName, value);
          }
        });
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [hasActiveAnimations, animations, onUpdate]);

  return { isRunning, hasActiveAnimations };
}
