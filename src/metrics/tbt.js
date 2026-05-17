export class LongTaskObserver {
  constructor() {
    this.tasks = [];
    this.observer = null;
    this._supported = false;
    this._init();
  }

  get supported() {
    return this._supported;
  }

  _init() {
    if (!('PerformanceObserver' in window)) return;
    if (!PerformanceObserver.supportedEntryTypes?.includes('longtask')) return;

    this._supported = true;
    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.tasks.push({
          startTime: entry.startTime,
          duration: entry.duration,
          blockingTime: Math.max(0, entry.duration - 50),
        });
      }
    });
    this.observer.observe({ type: 'longtask', buffered: true });
  }

  getTasksInWindow(startTime, endTime) {
    return this.tasks.filter(
      (t) => t.startTime >= startTime && t.startTime + t.duration <= endTime + 100,
    );
  }

  getTBTInWindow(startTime, endTime) {
    return this.getTasksInWindow(startTime, endTime).reduce(
      (sum, t) => sum + t.blockingTime,
      0,
    );
  }

  snapshot() {
    return [...this.tasks];
  }

  disconnect() {
    this.observer?.disconnect();
  }
}
