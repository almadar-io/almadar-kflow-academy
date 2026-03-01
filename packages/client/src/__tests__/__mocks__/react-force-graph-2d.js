// Mock for react-force-graph-2d to avoid ES module transformation issues in tests
import React from 'react';

const ForceGraph2D = React.forwardRef((props, ref) => {
  return React.createElement('div', {
    'data-testid': 'force-graph-2d',
    ref,
    ...props,
  });
});

ForceGraph2D.displayName = 'ForceGraph2D';

export default ForceGraph2D;

