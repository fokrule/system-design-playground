import { useCallback, useEffect, useState } from 'react';

/**
 * Shared animation clock for lesson simulations.
 * `elapsed` is in model milliseconds; `slow` stretches real time
 * (slow = 10 means 1 model ms takes 10 real ms).
 */
export function usePlayback(totalMs: number, slow = 1) {
  const [elapsed, setElapsed] = useState(0);
  const [stopAt, setStopAt] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      setElapsed((e) => Math.min(e + dt / slow, stopAt));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, slow, stopAt]);

  useEffect(() => {
    if (playing && elapsed >= stopAt) setPlaying(false);
  }, [playing, elapsed, stopAt]);

  /** Play until `target`, optionally jumping to `from` first. */
  const playTo = useCallback((target: number, from?: number) => {
    if (from !== undefined) setElapsed(from);
    setStopAt(target);
    setPlaying(true);
  }, []);

  const pause = useCallback(() => setPlaying(false), []);

  const seek = useCallback((t: number) => {
    setPlaying(false);
    setElapsed(t);
  }, []);

  return {
    elapsed,
    playing,
    done: elapsed >= totalMs - 0.001,
    playTo,
    pause,
    seek,
  };
}
