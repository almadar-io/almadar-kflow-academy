import { useCallback, useEffect, useState } from 'react';
import { RADIAL_VIEW_CONSTANTS } from '../utils/radialViewConstants';

interface UseRadialViewZoomPanProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

interface UseRadialViewZoomPanReturn {
  zoom: number;
  pan: { x: number; y: number };
  isDragging: boolean;
  containerWidth: number;
  containerHeight: number;
  handleWheel: (e: React.WheelEvent) => void;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp: () => void;
  handleMouseLeave: () => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  resetView: () => void;
}

export const useRadialViewZoomPan = ({ 
  containerRef
}: UseRadialViewZoomPanProps): UseRadialViewZoomPanReturn => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [containerWidth, setContainerWidth] = useState(800);
  const [containerHeight, setContainerHeight] = useState(600);

  // Update container dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
        setContainerHeight(containerRef.current.offsetHeight);
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [containerRef]);

  // Handle mouse wheel for zooming and scrolling
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const deltaX = e.deltaX;
    const deltaY = e.deltaY;
    
    // Handle horizontal scrolling
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      const scrollSpeed = RADIAL_VIEW_CONSTANTS.SCROLL_SPEED;
      setPan(prevPan => ({
        x: prevPan.x - deltaX * scrollSpeed,
        y: prevPan.y
      }));
      return;
    }
    
    // Handle vertical scrolling
    if (Math.abs(deltaY) > 0) {
      const scrollSpeed = RADIAL_VIEW_CONSTANTS.SCROLL_SPEED;
      setPan(prevPan => ({
        x: prevPan.x,
        y: prevPan.y - deltaY * scrollSpeed
      }));
      return;
    }
    
    // Handle zooming
    const zoomSpeed = RADIAL_VIEW_CONSTANTS.ZOOM_SPEED;
    const newZoom = Math.max(
      RADIAL_VIEW_CONSTANTS.MIN_ZOOM, 
      Math.min(RADIAL_VIEW_CONSTANTS.MAX_ZOOM, zoom - deltaY * zoomSpeed)
    );
    setZoom(newZoom);
  }, [zoom]);

  // Handle mouse down for panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  // Handle mouse move for panning
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart]);

  // Handle mouse up for panning
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle mouse leave for panning
  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Reset view to center
  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  return {
    zoom,
    pan,
    isDragging,
    containerWidth,
    containerHeight,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    setZoom,
    setPan,
    resetView
  };
};

