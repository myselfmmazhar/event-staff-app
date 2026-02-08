"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
}

/**
 * Animated counter with easing effect
 * Smoothly animates from 0 to target value
 */
export function AnimatedCounter({
  value,
  duration = 1000,
  className = "",
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    // Reset animation when value changes
    startTimeRef.current = null;
    countRef.current = 0;
    setCount(0);

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const progress = timestamp - startTimeRef.current;
      const percentage = Math.min(progress / duration, 1);

      // Ease-out cubic function for smooth deceleration
      const easeOutCubic = 1 - Math.pow(1 - percentage, 3);
      const currentCount = Math.floor(easeOutCubic * value);

      countRef.current = currentCount;
      setCount(currentCount);

      if (percentage < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(value); // Ensure we end at exact value
      }
    };

    if (value > 0) {
      requestAnimationFrame(animate);
    }
  }, [value, duration]);

  // Format number with commas for readability
  const formatNumber = (num: number) => {
    return num.toLocaleString("en-US");
  };

  return <span className={className}>{formatNumber(count)}</span>;
}
