// Opt-in observer installed before navigation by the local profiling harness.
// Normal app sessions allocate no samples, create no marks, and send no telemetry.
export const profileObserver = globalThis.__ALCHEMY_PROFILE__ ?? null;
