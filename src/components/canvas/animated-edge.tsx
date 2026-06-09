'use client';

import { BaseEdge, EdgeProps, getSmoothStepPath } from '@xyflow/react';

export function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  // Destructure ALL React Flow Edge props to prevent them from being
  // spread to the DOM via {...rest}, which causes React console warnings:
  // "Received `true` for a non-boolean attribute `animated`/`selectable`"
  // and "React does not recognize the `sourceHandleId` prop on a DOM element"
  animated,
  selectable,
  deletable,
  hidden,
  focusable,
  sourceHandleId,
  targetHandleId,
  pathOptions,
  label,
  labelStyle,
  labelShowBg,
  labelBgStyle,
  labelBgPadding,
  labelBgBorderRadius,
  markerStart,
  markerEnd,
  interactionWidth,
  ...rest
}: EdgeProps & { hidden?: boolean; focusable?: boolean }) {
  const status = (data as { status?: string })?.status || 'default';

  const colors: Record<string, string> = {
    default: '#94a3b8',
    active: '#10b981',
    error: '#ef4444',
    success: '#10b981',
  };

  const strokeColor = colors[status] || colors.default;

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
  });

  return (
    <>
      {/* SVG Defs for arrowhead marker */}
      <defs>
        <marker
          id="animated-edge-arrow"
          viewBox="0 0 10 10"
          refX="10"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={strokeColor} />
        </marker>
      </defs>
      {/* Background path for better visibility */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth: 2,
          opacity: 0.3,
        }}
        {...rest}
      />
      {/* Animated dashed path */}
      <path
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={2}
        strokeDasharray="6 4"
        className="animated-edge-path"
        style={{
          animation: status === 'active' ? 'edgeDash 0.6s linear infinite' : undefined,
        }}
        markerEnd="url(#animated-edge-arrow)"
      />
      <style>{`
        @keyframes edgeDash {
          to {
            stroke-dashoffset: -10;
          }
        }
      `}</style>
    </>
  );
}
