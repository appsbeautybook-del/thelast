import { useState, useCallback, useRef } from "react";

/**
 * Simple client-side rate limiter for auth forms.
 * Limits attempts to maxAttempts within the windowMs period.
 */
export function useRateLimit({ maxAttempts = 5, windowMs = 300000 } = {}) {
  const [isLimited, setIsLimited] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const attemptsRef = useRef([]);
  const timerRef = useRef(null);

  const checkLimit = useCallback(() => {
    const now = Date.now();
    // Remove old attempts outside the window
    attemptsRef.current = attemptsRef.current.filter(t => now - t < windowMs);

    if (attemptsRef.current.length >= maxAttempts) {
      const oldestAttempt = attemptsRef.current[0];
      const timeLeft = Math.ceil((windowMs - (now - oldestAttempt)) / 1000);
      setIsLimited(true);
      setRemainingTime(timeLeft);

      // Clear any existing timer
      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsLimited(false);
            // Remove expired attempts
            const now2 = Date.now();
            attemptsRef.current = attemptsRef.current.filter(t => now2 - t < windowMs);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return false;
    }

    attemptsRef.current.push(now);
    return true;
  }, [maxAttempts, windowMs]);

  const reset = useCallback(() => {
    attemptsRef.current = [];
    setIsLimited(false);
    setRemainingTime(0);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  return { isLimited, remainingTime, checkLimit, reset };
}
