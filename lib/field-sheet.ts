import { CONCEPTS_CATALOG, CONCEPT_DOMAINS, TOTAL_CONCEPTS, TOTAL_SCENARIOS } from './catalog';

export interface FieldSheetOptions {
  completedConceptIds: readonly string[];
  completedScenarioKeys: readonly string[];
  checkpointsSolved: number;
  totalCheckpoints: number;
  achievementsUnlocked: number;
  totalAchievements: number;
  totalTimeSpentMs: number;
  generatedDate?: string;
}

export function escapeXml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDuration(ms: number): string {
  const safe = Math.max(0, Math.floor(ms));
  const hours = Math.floor(safe / 3600000);
  const minutes = Math.floor((safe % 3600000) / 60000);
  const seconds = Math.floor((safe % 60000) / 1000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  if (seconds > 0) return `${seconds}s`;
  return '0m';
}

const INVARIANT_FORMULAS: ReadonlyArray<{ label: string; formula: string }> = [
  { label: 'DYNAMO QUORUM', formula: 'W + R > N  (min overlap = W + R - N)' },
  { label: 'CRASH CONSENSUS (CFT)', formula: 'N = 2f + 1  ·  Majority = floor(N/2) + 1' },
  { label: 'BYZANTINE (BFT)', formula: 'N = 3f + 1  ·  Quorum = 2f + 1 (>= f+1 overlap)' },
  { label: 'LAMPORT CLOCKS', formula: 'a -> b  =>  L(a) < L(b)  (O(1) scalar)' },
  { label: 'VECTOR CLOCKS', formula: 'a -> b  <=>  V(a) < V(b)  (O(N) exact causality)' },
  { label: 'CAP THEOREM', formula: 'Under Network Partition (P): choose C or A' },
];

/**
 * Generates a self-contained archival SVG Field Study Cheat-Sheet & Verification Record
 * summarizing mastery across all 22 distributed systems plates grouped by 5 domains.
 */
export function generateFieldSheetSvg(options: FieldSheetOptions): string {
  const completedConceptsSet = new Set(options.completedConceptIds);
  const completedScenariosSet = new Set(options.completedScenarioKeys);
  const completedConceptsCount = CONCEPTS_CATALOG.filter((c) =>
    completedConceptsSet.has(c.id)
  ).length;
  const completedScenariosCount = options.completedScenarioKeys.length;
  const completionPct =
    TOTAL_SCENARIOS > 0 ? Math.round((completedScenariosCount / TOTAL_SCENARIOS) * 100) : 0;
  const dateStr = options.generatedDate ?? new Date().toISOString().slice(0, 10);

  const width = 1200;
  const height = 1620;
  const padX = 56;
  const innerW = width - padX * 2;

  const lines: string[] = [];
  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
  );
  lines.push(`  <title>Distributed Systems Atlas — Field Study Record &amp; Protocol Cheat-Sheet</title>`);

  // Paper Background & Double Archival Border
  lines.push(`  <rect x="0" y="0" width="${width}" height="${height}" fill="#F4F0E8" />`);
  lines.push(
    `  <rect x="24" y="24" width="${width - 48}" height="${height - 48}" fill="#FAF7F1" stroke="#161614" stroke-width="2" />`
  );
  lines.push(
    `  <rect x="30" y="30" width="${width - 60}" height="${height - 60}" fill="none" stroke="#161614" stroke-opacity="0.22" stroke-width="1" />`
  );

  // Top Masthead Strip
  lines.push(
    `  <text x="${padX}" y="66" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11" font-weight="600" letter-spacing="2" fill="#D9441E">DISTRIBUTED SYSTEMS ATLAS · ARCHIVAL FIELD STUDY RECORD</text>`
  );
  lines.push(
    `  <text x="${width - padX}" y="66" text-anchor="end" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11" letter-spacing="1.5" fill="#6E6B62">ISSUED ${escapeXml(dateStr)}</text>`
  );
  lines.push(
    `  <line x1="${padX}" y1="78" x2="${width - padX}" y2="78" stroke="#161614" stroke-opacity="0.2" stroke-width="1" />`
  );

  // Title & Emblem
  lines.push(
    `  <text x="${padX}" y="122" font-family="Georgia, 'Times New Roman', serif" font-size="38" font-weight="500" fill="#161614">Protocol Mastery &amp; Reference Sheet</text>`
  );
  lines.push(
    `  <text x="${padX}" y="148" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="14" fill="#4A4842">Complete 22-plate curriculum ledger, canonical papers, and formal fault-tolerance invariants.</text>`
  );

  // Summary KPI Strip (6 Cells)
  const kpiY = 170;
  const kpiH = 74;
  const kpis = [
    { label: 'COMPLETION', value: `${completionPct}%`, accent: '#D9441E' },
    { label: 'PLATES MASTERED', value: `${completedConceptsCount}/${TOTAL_CONCEPTS}`, accent: '#161614' },
    { label: 'SCENARIOS RUN', value: `${completedScenariosCount}/${TOTAL_SCENARIOS}`, accent: '#161614' },
    {
      label: 'INTUITION CHECKS',
      value: `${options.checkpointsSolved}/${options.totalCheckpoints}`,
      accent: '#0F6B50',
    },
    {
      label: 'VERIFICATION SEALS',
      value: `${options.achievementsUnlocked}/${options.totalAchievements}`,
      accent: '#1D4B8F',
    },
    { label: 'BENCH TIME', value: formatDuration(options.totalTimeSpentMs), accent: '#161614' },
  ];

  lines.push(
    `  <rect x="${padX}" y="${kpiY}" width="${innerW}" height="${kpiH}" fill="#F4F0E8" stroke="#161614" stroke-width="1.25" />`
  );
  const cellW = innerW / kpis.length;
  kpis.forEach((kpi, idx) => {
    const x = padX + idx * cellW;
    if (idx > 0) {
      lines.push(
        `  <line x1="${x}" y1="${kpiY}" x2="${x}" y2="${kpiY + kpiH}" stroke="#161614" stroke-opacity="0.18" stroke-width="1" />`
      );
    }
    lines.push(
      `  <text x="${x + 14}" y="${kpiY + 24}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="9.5" letter-spacing="1.2" fill="#6E6B62">${escapeXml(kpi.label)}</text>`
    );
    lines.push(
      `  <text x="${x + 14}" y="${kpiY + 56}" font-family="Georgia, 'Times New Roman', serif" font-size="26" font-weight="600" fill="${kpi.accent}">${escapeXml(kpi.value)}</text>`
    );
  });

  // Domain-Grouped 22-Plate Catalog (2-Column Layout)
  let cursorY = 274;
  const colGap = 24;
  const colW = (innerW - colGap) / 2;

  for (const domain of CONCEPT_DOMAINS) {
    const domainConcepts = CONCEPTS_CATALOG.filter((c) => c.domainId === domain.id);

    // Domain Section Header
    lines.push(
      `  <text x="${padX}" y="${cursorY}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11" font-weight="700" letter-spacing="1.6" fill="#D9441E">SECTION ${escapeXml(domain.index)}</text>`
    );
    lines.push(
      `  <text x="${padX + 86}" y="${cursorY}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11" font-weight="700" letter-spacing="1.4" fill="#161614">${escapeXml(domain.label.toUpperCase())}</text>`
    );
    lines.push(
      `  <line x1="${padX}" y1="${cursorY + 8}" x2="${width - padX}" y2="${cursorY + 8}" stroke="#161614" stroke-width="1.2" />`
    );

    cursorY += 22;
    const rowH = 56;
    const rows = Math.ceil(domainConcepts.length / 2);

    domainConcepts.forEach((concept, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = padX + col * (colW + colGap);
      const y = cursorY + row * (rowH + 10);

      const isDone = completedConceptsSet.has(concept.id);
      const doneScenarios = concept.scenarioKeys.filter((k) =>
        completedScenariosSet.has(k)
      ).length;
      const totalScenarios = concept.scenarioKeys.length;
      const badgeText =
        totalScenarios > 0
          ? `${doneScenarios}/${totalScenarios}`
          : isDone
          ? 'DONE'
          : 'LIVE';

      lines.push(
        `  <rect x="${x}" y="${y}" width="${colW}" height="${rowH}" fill="${isDone ? '#F0F7F4' : '#F4F0E8'}" stroke="${isDone ? '#0F6B50' : '#161614'}" stroke-opacity="${isDone ? '0.85' : '0.18'}" stroke-width="1" />`
      );

      // Status Box
      lines.push(
        `  <rect x="${x + 12}" y="${y + 13}" width="16" height="16" fill="${isDone ? '#0F6B50' : '#FAF7F1'}" stroke="${isDone ? '#0F6B50' : '#161614'}" stroke-opacity="${isDone ? '1' : '0.35'}" stroke-width="1" />`
      );
      if (isDone) {
        lines.push(
          `  <path d="M ${x + 15} ${y + 21} L ${x + 18.5} ${y + 24.5} L ${x + 25} ${y + 17.5}" fill="none" stroke="#FAF7F1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />`
        );
      }

      // Plate Number + Name
      lines.push(
        `  <text x="${x + 36}" y="${y + 25}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="10.5" font-weight="600" fill="#6E6B62">${escapeXml(concept.plateNumber)}</text>`
      );
      lines.push(
        `  <text x="${x + 58}" y="${y + 25}" font-family="Georgia, 'Times New Roman', serif" font-size="15.5" font-weight="600" fill="#161614">${escapeXml(concept.name)}</text>`
      );

      // Scenario Count Pill
      lines.push(
        `  <text x="${x + colW - 12}" y="${y + 24}" text-anchor="end" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="10" font-weight="600" fill="${isDone ? '#0F6B50' : '#6E6B62'}">${escapeXml(badgeText)}</text>`
      );

      // Citation + Mechanism Subtitle
      lines.push(
        `  <text x="${x + 36}" y="${y + 44}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="10" fill="#4A4842">${escapeXml(concept.mechanism)}  ·  ${escapeXml(concept.citation)}</text>`
      );
    });

    cursorY += rows * (rowH + 10) + 18;
  }

  // Canonical Invariants Quick-Reference Footer Box
  const footerY = height - 208;
  lines.push(
    `  <rect x="${padX}" y="${footerY}" width="${innerW}" height="126" fill="#111413" stroke="#161614" stroke-width="1.5" />`
  );
  lines.push(
    `  <text x="${padX + 18}" y="${footerY + 24}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="10.5" font-weight="700" letter-spacing="1.6" fill="#F97316">CANONICAL DISTRIBUTED SYSTEMS INVARIANTS · QUICK REFERENCE</text>`
  );

  INVARIANT_FORMULAS.forEach((item, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const fx = padX + 18 + col * ((innerW - 36) / 2);
    const fy = footerY + 50 + row * 28;
    lines.push(
      `  <text x="${fx}" y="${fy}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="10" font-weight="700" fill="#9E9B90">${escapeXml(item.label)}:</text>`
    );
    lines.push(
      `  <text x="${fx + 165}" y="${fy}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="10.5" fill="#F4F0E8">${escapeXml(item.formula)}</text>`
    );
  });

  // Colophon Line
  lines.push(
    `  <text x="${padX}" y="${height - 52}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="10" letter-spacing="1.2" fill="#6E6B62">DISTRIBUTED SYSTEMS ATLAS · INTERACTIVE MONOGRAPH · VOLUME I</text>`
  );
  lines.push(
    `  <text x="${width - padX}" y="${height - 52}" text-anchor="end" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="10" letter-spacing="1.2" fill="#6E6B62">22 PLATES · 79 SCENARIOS · 06 PROTOCOL DUELS · QUORUM BENCH</text>`
  );

  lines.push(`</svg>`);
  return lines.join('\n');
}
