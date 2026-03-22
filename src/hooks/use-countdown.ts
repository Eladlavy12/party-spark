import { useState, useEffect, useRef, useCallback } from 'react';

interface UseCountdownOptions {
  /** Total seconds */
  duration: number | null;
  /** Whether the countdown is active */
  active: boolean;
  /** Called when timer reaches 0 */
  onExpire?: () => void;
  /** Change this to force a timer reset (e.g. slide id) */
  resetKey?: string | number;
}

export function useCountdown({ duration, active, onExpire, resetKey }: UseCountdownOptions) {
  const [remaining, setRemaining] = useState(duration ?? 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  // Reset when duration, active, or resetKey changes
  useEffect(() => {
    if (!active || !duration || duration <= 0) {
      setRemaining(duration ?? 0);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    setRemaining(duration);
    const start = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const left = Math.max(0, duration - elapsed);
      setRemaining(left);
      if (left <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        onExpireRef.current?.();
      }
    }, 250);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [duration, active, resetKey]);

  const progress = duration && duration > 0 ? remaining / duration : 0;

  return { remaining, progress, expired: active && remaining <= 0 };
}
