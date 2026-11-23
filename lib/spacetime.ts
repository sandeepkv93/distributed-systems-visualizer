import { MessageStatus } from './types';

export interface SpaceTimeActor {
  id: string;
  label: string;
  sublabel?: string;
  color: string;
  failed?: boolean;
}

export interface SpaceTimeFrame {
  id: string;
  from: string;
  to: string;
  label: string;
  sublabel?: string;
  color: string;
  status: MessageStatus | 'delivered' | 'dropped' | 'lost';
  dashed?: boolean;
}

export interface PositionedLifeline {
  actor: SpaceTimeActor;
  x: number;
}

export interface PositionedArrow {
  frame: SpaceTimeFrame;
  seq: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  dropped: boolean;
  midX: number;
  midY: number;
}

export interface SpaceTimeLayout {
  width: number;
  height: number;
  headerY: number;
  lifelineStartY: number;
  lifelineEndY: number;
  lifelines: PositionedLifeline[];
  arrows: PositionedArrow[];
  totalFrames: number;
  truncatedCount: number;
}

export interface SpaceTimeLayoutOptions {
  width?: number;
  maxFrames?: number;
  rowHeight?: number;
  slant?: number;
}

/**
 * Compute deterministic Lamport space-time swimlane coordinates for a list of actors and message frames.
 */
export function computeSpaceTimeLayout(
  actors: readonly SpaceTimeActor[],
  frames: readonly SpaceTimeFrame[],
  options: SpaceTimeLayoutOptions = {}
): SpaceTimeLayout {
  const width = options.width ?? 880;
  const maxFrames = options.maxFrames ?? 16;
  const rowHeight = options.rowHeight ?? 30;
  const slant = options.slant ?? 14;

  const leftPad = 115;
  const rightPad = 75;
  const usableWidth = Math.max(200, width - leftPad - rightPad);

  const lifelines: PositionedLifeline[] = actors.map((actor, index) => {
    const x =
      actors.length <= 1
        ? leftPad + usableWidth / 2
        : leftPad + (usableWidth * index) / (actors.length - 1);
    return { actor, x };
  });

  const xByActorId = new Map(lifelines.map((l) => [l.actor.id, l.x]));
  const validFrames = frames.filter((f) => xByActorId.has(f.from) && xByActorId.has(f.to));
  const totalFrames = validFrames.length;
  const truncatedCount = Math.max(0, totalFrames - maxFrames);
  const visibleFrames = validFrames.slice(truncatedCount);

  const headerY = 58;
  const lifelineStartY = 92;

  const arrows: PositionedArrow[] = visibleFrames.map((frame, idx) => {
    const seq = truncatedCount + idx + 1;
    const x1 = xByActorId.get(frame.from)!;
    const targetX = xByActorId.get(frame.to)!;
    const y1 = lifelineStartY + 18 + idx * rowHeight;
    const dropped = frame.status === 'dropped' || frame.status === 'lost';

    const x2 = dropped ? x1 + (targetX - x1) * 0.58 : targetX;
    const y2 = dropped ? y1 + slant * 0.6 : y1 + slant;

    return {
      frame,
      seq,
      x1,
      y1,
      x2,
      y2,
      dropped,
      midX: (x1 + x2) / 2,
      midY: (y1 + y2) / 2,
    };
  });

  const lifelineEndY = Math.max(
    460,
    lifelineStartY + Math.max(visibleFrames.length, 6) * rowHeight + 48
  );
  const height = lifelineEndY + 34;

  return {
    width,
    height,
    headerY,
    lifelineStartY,
    lifelineEndY,
    lifelines,
    arrows,
    totalFrames,
    truncatedCount,
  };
}
