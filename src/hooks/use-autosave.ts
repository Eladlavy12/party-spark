import { useEffect, useRef, useState } from 'react';

export function useAutosave<T>(
  value: T,
  onSave: (value: T) => Promise<void>,
  delay = 1200
) {
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const latestValue = useRef(value);
  const isFirstRender = useRef(true);

  latestValue.current = value;

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await onSave(latestValue.current);
        setLastSaved(new Date());
      } catch (e) {
        console.error('Autosave failed:', e);
      } finally {
        setSaving(false);
      }
    }, delay);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [value, delay]);

  return { saving, lastSaved };
}
