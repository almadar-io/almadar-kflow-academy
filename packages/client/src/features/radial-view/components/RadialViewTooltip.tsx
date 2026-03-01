import React from 'react';

interface RadialViewTooltipProps {
  x: number;
  y: number;
  text: string;
  visible: boolean;
}

const RadialViewTooltip: React.FC<RadialViewTooltipProps> = ({
  x,
  y,
  text,
  visible
}) => {
  if (!visible) return null;

  // Calculate text width approximately (rough estimate)
  const textLength = text.length;
  const estimatedWidth = Math.max(120, textLength * 7);
  const halfWidth = estimatedWidth / 2;

  return (
    <g>
      {/* Tooltip background */}
      <rect
        x={x - halfWidth}
        y={y - 20}
        width={estimatedWidth}
        height={26}
        rx={4}
        fill="#1f2937"
        opacity={0.95}
        stroke="#374151"
        strokeWidth={1}
      />
      {/* Tooltip text */}
      <text
        x={x}
        y={y - 7}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="white"
        fontSize="12"
        fontWeight="500"
        pointerEvents="none"
      >
        {text}
      </text>
    </g>
  );
};

export default RadialViewTooltip;

