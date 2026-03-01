import { useState, useEffect, useRef } from 'react';
import { getJumpBackInItems, type JumpBackInItem } from '../preferencesApi';

export function useJumpBackIn() {
  const [items, setItems] = useState<JumpBackInItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current || isFetchingRef.current) return;

    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    getJumpBackInItems()
      .then((data) => {
        setItems(data);
        hasFetchedRef.current = true;
      })
      .catch((err: any) => {
        console.error('Failed to load jump back in items:', err);
        setError(err.message || 'Failed to load jump back in items');
      })
      .finally(() => {
        setIsLoading(false);
        isFetchingRef.current = false;
      });
  }, []);

  return {
    items,
    isLoading,
    error,
  };
}

