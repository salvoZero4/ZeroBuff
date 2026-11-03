type Visibility = {
  currentState: string | null | undefined;
  addEventListener(
    type: "change",
    listener: (state: string) => void,
  ): { remove(): void };
};

type Clock = {
  everySecond(callback: () => void): () => void;
  nextTick(callback: () => void): () => void;
};

const clock: Clock = {
  everySecond(callback) {
    const id = setInterval(callback, 1000);
    return () => clearInterval(id);
  },
  nextTick(callback) {
    const id = setTimeout(callback, 0);
    return () => clearTimeout(id);
  },
};

// Returning false from update stops ticking (expired rest or paused workout).
// Background transitions cancel the interval; returning recomputes from timestamps.
export function startForegroundTicker(
  visibility: Visibility,
  update: () => boolean,
  scheduler: Clock = clock,
): () => void {
  let stopInterval: (() => void) | undefined;
  const stop = () => {
    stopInterval?.();
    stopInterval = undefined;
  };
  const start = () => {
    stop();
    if (update())
      stopInterval = scheduler.everySecond(() => {
        if (!update()) stop();
      });
  };
  const cancelInitial = scheduler.nextTick(() => {
    if (visibility.currentState === "active") start();
  });
  const subscription = visibility.addEventListener("change", (state) => {
    if (state === "active") start();
    else stop();
  });
  return () => {
    cancelInitial();
    stop();
    subscription.remove();
  };
}
