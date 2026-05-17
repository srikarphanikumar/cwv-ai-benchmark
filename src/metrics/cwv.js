export class CWVObserver {
  constructor() {
    this.lcp = null;
    this.fcp = null;
    this.inp = null;
    this._observers = [];
    this._init();
  }

  _init() {
    const supported = PerformanceObserver.supportedEntryTypes ?? [];

    if (supported.includes('largest-contentful-paint')) {
      const obs = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) this.lcp = last.startTime;
      });
      obs.observe({ type: 'largest-contentful-paint', buffered: true });
      this._observers.push(obs);
    }

    if (supported.includes('paint')) {
      const obs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.fcp = entry.startTime;
          }
        }
      });
      obs.observe({ type: 'paint', buffered: true });
      this._observers.push(obs);
    }

    if (supported.includes('event')) {
      const obs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const delay = entry.processingStart - entry.startTime;
          const duration = entry.duration;
          const inp = delay + duration;
          if (this.inp === null || inp > this.inp) {
            this.inp = inp;
          }
        }
      });
      obs.observe({ type: 'event', buffered: true, durationThreshold: 16 });
      this._observers.push(obs);
    }
  }

  snapshot() {
    return { lcp: this.lcp, fcp: this.fcp, inp: this.inp };
  }

  disconnect() {
    this._observers.forEach((o) => o.disconnect());
  }
}

export async function measureFrameDrops(durationMs) {
  return new Promise((resolve) => {
    const frames = [];
    let last = performance.now();
    const end = last + durationMs;

    function tick(now) {
      frames.push(now - last);
      last = now;
      if (now < end) requestAnimationFrame(tick);
      else {
        const jankFrames = frames.filter((f) => f > 50).length;
        const avgFps = 1000 / (frames.reduce((a, b) => a + b, 0) / frames.length);
        resolve({ frames, jankFrames, avgFps, totalFrames: frames.length });
      }
    }

    requestAnimationFrame(tick);
  });
}

export function measureINP(interactionFn) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    Promise.resolve(interactionFn()).then(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve(performance.now() - t0);
        });
      });
    });
  });
}
