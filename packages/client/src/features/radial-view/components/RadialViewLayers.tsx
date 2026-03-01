import React from 'react';
import { RadialViewLayersProps } from '../types/radialViewTypes';
import { useTheme } from '../../../contexts/ThemeContext';

const RadialViewLayers: React.FC<RadialViewLayersProps> = ({
  layers,
  centerX,
  centerY,
  zoom,
  pan
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const layerStroke = isDark ? '#818cf8' : '#6366f1';
  
  return (
    <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
      {layers.map((layer, index) => {
        // Skip layer 0 (center point)
        if (layer.radius === 0) return null;
        
        return (
          <circle
            key={`layer-${layer.layer}`}
            cx={centerX}
            cy={centerY}
            r={layer.radius}
            fill="none"
            stroke={layerStroke}
            strokeWidth="3"
            strokeDasharray="8,4"
            opacity={0.7}
          />
        );
      })}
    </g>
  );
};

export default RadialViewLayers;

