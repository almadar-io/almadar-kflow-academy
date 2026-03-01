import { useEffect, useState } from 'react';

export const useConceptLoaderProgress = (isLoading: boolean) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    let timeout: NodeJS.Timeout | null = null;

    if (isLoading) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress(prev => (prev >= 90 ? prev : prev + 5));
      }, 3000);
    } else {
      setProgress(prev => (prev > 0 && prev < 100 ? 100 : prev));
      timeout = setTimeout(() => setProgress(0), 400);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    };
  }, [isLoading]);

  return progress;
};


