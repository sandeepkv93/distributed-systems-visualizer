import type { InvariantCheck } from './invariants';
import { summarizeInvariants } from './invariants';

export interface WireTraceFrame {
  id: string;
  from: string;
  to: string;
  type: string;
  status: string;
  detail?: string;
}

export interface WireTracePayload {
  protocol: string;
  scenario: string;
  exportedAt?: string;
  invariants: readonly InvariantCheck[];
  frames: readonly WireTraceFrame[];
}

export interface WireFrameSummary {
  total: number;
  delivered: number;
  inFlight: number;
  dropped: number;
}

export function summarizeWireFrames(frames: readonly WireTraceFrame[]): WireFrameSummary {
  let delivered = 0;
  let inFlight = 0;
  let dropped = 0;

  for (const frame of frames) {
    if (frame.status === 'dropped' || frame.status === 'lost' || frame.status === 'failure') {
      dropped += 1;
    } else if (frame.status === 'in-flight') {
      inFlight += 1;
    } else {
      delivered += 1;
    }
  }

  return {
    total: frames.length,
    delivered,
    inFlight,
    dropped,
  };
}

function escapeCell(raw: string): string {
  return raw.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
}

export function formatTraceMarkdown(payload: WireTracePayload): string {
  const frameStats = summarizeWireFrames(payload.frames);
  const invStats = summarizeInvariants(payload.invariants);
  const timestamp = payload.exportedAt ?? new Date().toISOString();

  const lines: string[] = [];
  lines.push(`# ${payload.protocol} — Wire Trace Transcript`);
  lines.push('');
  lines.push(`- **Scenario:** \`${payload.scenario || 'manual'}\``);
  lines.push(`- **Captured:** ${timestamp}`);
  lines.push(
    `- **Frames:** ${frameStats.total} total (${frameStats.delivered} delivered, ${frameStats.inFlight} in-flight, ${frameStats.dropped} dropped)`
  );
  if (payload.invariants.length > 0) {
    lines.push(
      `- **Formal Invariants:** ${invStats.holdingCount}/${invStats.totalCount} (${invStats.overall.toUpperCase()})`
    );
  }
  lines.push('');

  if (payload.invariants.length > 0) {
    lines.push('## Formal Invariants');
    lines.push('');
    lines.push('| Property | Formula | Status | Diagnostic |');
    lines.push('| --- | --- | --- | --- |');
    for (const inv of payload.invariants) {
      lines.push(
        `| ${escapeCell(inv.name)} | \`${escapeCell(inv.formula)}\` | **${inv.status.toUpperCase()}** | ${escapeCell(inv.detail)} |`
      );
    }
    lines.push('');
  }

  lines.push('## Wire Transcript');
  lines.push('');
  if (payload.frames.length === 0) {
    lines.push('_No wire frames captured yet._');
  } else {
    lines.push('| Seq | From | To | Frame Type | Status | Detail |');
    lines.push('| --- | --- | --- | --- | --- | --- |');
    payload.frames.forEach((frame, idx) => {
      const seq = `T${String(idx + 1).padStart(2, '0')}`;
      lines.push(
        `| ${seq} | \`${escapeCell(frame.from)}\` | \`${escapeCell(frame.to)}\` | ${escapeCell(frame.type)} | ${escapeCell(frame.status)} | ${escapeCell(frame.detail ?? '—')} |`
      );
    });
  }

  return lines.join('\n');
}

export function formatTraceJson(payload: WireTracePayload): string {
  const frameStats = summarizeWireFrames(payload.frames);
  const invStats = summarizeInvariants(payload.invariants);
  return JSON.stringify(
    {
      protocol: payload.protocol,
      scenario: payload.scenario || 'manual',
      exportedAt: payload.exportedAt ?? new Date().toISOString(),
      summary: {
        frames: frameStats,
        invariants: invStats,
      },
      invariants: payload.invariants,
      frames: payload.frames,
    },
    null,
    2
  );
}
