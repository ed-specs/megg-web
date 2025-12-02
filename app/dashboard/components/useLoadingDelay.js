import { useState, useEffect, useRef } from 'react';

/**
 * Hook to ensure loading state displays for at least a minimum duration
 * @param {boolean} isLoading - Current loading state
 * @param {number} minDisplayTime - Minimum time to show loading in milliseconds (default: 500ms)
 * @returns {boolean} - Delayed loading state
 */
export function useLoadingDelay(isLoading, minDisplayTime = 500) {
  const [showLoading, setShowLoading] = useState(isLoading);
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (isLoading) {
      // Start loading - set showLoading to true immediately
      setShowLoading(true);
      startTimeRef.current = Date.now();
    } else {
      // Stop loading - calculate if minimum time has passed
      if (startTimeRef.current !== null) {
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = minDisplayTime - elapsed;

        if (remaining > 0) {
          // Wait for remaining time before hiding loading
          timerRef.current = setTimeout(() => {
            setShowLoading(false);
            timerRef.current = null;
          }, remaining);
        } else {
          // Minimum time already passed, hide immediately
          setShowLoading(false);
        }
        // Reset start time after handling
        startTimeRef.current = null;
      } else {
        setShowLoading(false);
      }
    }

    // Cleanup function
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isLoading, minDisplayTime]);

  return showLoading;
}

