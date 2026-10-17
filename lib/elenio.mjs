export class ElenioUnavailable extends Error {
  constructor() {
    super("Layanan Elenio belum terhubung. Hubungi pengelola daycare.");
    this.status = 503;
    this.code = "ELENIO_UNVERIFIED";
  }
}
// Deliberately has no inferred URLs or protocol. Replace only against a verified contract.
export class ElenioAdapter {
  async listAuthorizedCameras() {
    throw new ElenioUnavailable();
  }
  async createPlaybackSession() {
    throw new ElenioUnavailable();
  }
  async stopPlaybackSession() {
    throw new ElenioUnavailable();
  }
  async listAnalyticsEvents() {
    throw new ElenioUnavailable();
  }
}
export const elenio = new ElenioAdapter();
// Contract harness for a future verified client. This defines no external routes.
export class ReliableElenioAdapter {
  constructor(
    verifiedClient,
    {
      timeoutMs = 5000,
      threshold = 3,
      cooldownMs = 30000,
      now = Date.now,
    } = {},
  ) {
    this.client = verifiedClient;
    this.timeoutMs = timeoutMs;
    this.threshold = threshold;
    this.cooldownMs = cooldownMs;
    this.now = now;
    this.failures = 0;
    this.openUntil = 0;
  }
  async invoke(method, input, readOnly = false) {
    if (!this.client || this.openUntil > this.now())
      throw new ElenioUnavailable();
    const attempts = readOnly ? 2 : 1;
    for (let attempt = 0; attempt < attempts; attempt++) {
      let timer;
      try {
        const controller = new AbortController();
        const timeout = new Promise((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new ElenioUnavailable());
          }, this.timeoutMs);
        });
        const result = await Promise.race([
          this.client[method](input, { signal: controller.signal }),
          timeout,
        ]);
        this.failures = 0;
        return result;
      } catch {
        this.failures++;
        if (this.failures >= this.threshold) {
          this.openUntil = this.now() + this.cooldownMs;
          throw new ElenioUnavailable();
        }
        if (attempt === attempts - 1) throw new ElenioUnavailable();
      } finally {
        clearTimeout(timer);
      }
    }
  }
  listAuthorizedCameras(input) {
    return this.invoke("listAuthorizedCameras", input, true);
  }
  listAnalyticsEvents(input) {
    return this.invoke("listAnalyticsEvents", input, true);
  }
  createPlaybackSession(input) {
    return this.invoke("createPlaybackSession", input, false);
  }
  stopPlaybackSession(input) {
    return this.invoke("stopPlaybackSession", input, false);
  }
}
