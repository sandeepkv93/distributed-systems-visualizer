export interface ScenarioDeepLink {
  scenarioId: string | null;
  step: number | null;
}

/**
 * Parse `?scenario=<id>&step=<n>` query parameters safely for static-exported visualizer plates.
 */
export function parseScenarioDeepLink(search: string): ScenarioDeepLink {
  const params = new URLSearchParams(search);
  const rawScenario = params.get('scenario')?.trim() ?? '';
  const scenarioId = rawScenario.length > 0 ? rawScenario : null;

  const rawStep = params.get('step')?.trim() ?? '';
  let step: number | null = null;
  if (rawStep.length > 0 && /^\d+$/.test(rawStep)) {
    const parsed = Number.parseInt(rawStep, 10);
    if (Number.isSafeInteger(parsed) && parsed >= 0) {
      step = parsed;
    }
  }

  return { scenarioId, step };
}

/**
 * Clamp a requested deep-link step index to the valid `[0, maxStep]` range.
 */
export function clampDeepLinkStep(step: number, maxStep: number): number {
  if (!Number.isFinite(step) || maxStep <= 0) return 0;
  return Math.max(0, Math.min(Math.floor(step), Math.floor(maxStep)));
}

/**
 * Update `?scenario` and `?step` query params on a URL while preserving unrelated params and hash.
 * Omits `step` when step is 0 or null so initial scenario links remain concise.
 */
export function buildScenarioDeepLinkUrl(
  currentHref: string,
  scenarioId: string | null | undefined,
  step?: number | null
): string {
  const url = new URL(currentHref);
  const normalizedScenario = scenarioId?.trim() ?? '';

  if (!normalizedScenario) {
    url.searchParams.delete('scenario');
    url.searchParams.delete('step');
    return url.toString();
  }

  url.searchParams.set('scenario', normalizedScenario);

  if (typeof step === 'number' && Number.isFinite(step) && Math.floor(step) > 0) {
    url.searchParams.set('step', String(Math.floor(step)));
  } else {
    url.searchParams.delete('step');
  }

  return url.toString();
}
