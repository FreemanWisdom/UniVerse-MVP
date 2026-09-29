/**
 * Dev-only workaround for vercel/next.js#86060 (Next 16 + Turbopack):
 * React's development component instrumentation calls performance.measure()
 * with a negative childrenEndTime when a Server Component layout redirects
 * before its children render (StudentLayout / PublicLayout auth guards).
 * The negative check is missing on the abort path in the Turbopack dev
 * bundle, so the error overlay shows a runtime TypeError that never occurs
 * in production builds. Swallow only that specific failure.
 *
 * Delete this file once the upstream fix ships in a stable Next.js release.
 */
if (process.env.NODE_ENV === "development") {
  const original = performance.measure.bind(performance);
  performance.measure = ((...args: Parameters<typeof original>) => {
    try {
      return original(...args);
    } catch (error) {
      if (error instanceof Error && error.message.includes("negative time stamp")) {
        return undefined as unknown as PerformanceMeasure;
      }
      throw error;
    }
  }) as typeof performance.measure;
}

export {};
