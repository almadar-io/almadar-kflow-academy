import { useCallback, useEffect, useState } from 'react';
import { EditingState } from '../types/mindMapTypes';
import { MINDMAP_CONSTANTS } from '../utils/mindMapConstants';

interface UseMindMapZoomPanProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  editingState: EditingState | null;
  showContentModal: boolean;
}

interface UseMindMapZoomPanReturn {
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
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: () => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  resetView: () => void;
}

export const useMindMapZoomPan = ({ 
  containerRef, 
  editingState, 
  showContentModal 
}: UseMindMapZoomPanProps): UseMindMapZoomPanReturn => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [containerWidth, setContainerWidth] = useState(800);
  const [containerHeight, setContainerHeight] = useState(600);
  const [pinchStart, setPinchStart] = useState<{ distance: number; center: { x: number; y: number }; zoom: number; pan: { x: number; y: number } } | null>(null);

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
    
    if (editingState || showContentModal) return;
    
    const deltaX = e.deltaX;
    const deltaY = e.deltaY;
    const deltaZ = e.deltaZ;
    
    // Handle horizontal scrolling (left/right mouse wheel movement)
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal scroll - move view left/right
      const scrollSpeed = MINDMAP_CONSTANTS.SCROLL_SPEED;
      setPan(prevPan => ({
        x: prevPan.x - deltaX * scrollSpeed,
        y: prevPan.y
      }));
      return;
    }
    
    // Handle vertical scrolling (up/down mouse wheel movement)
    if (Math.abs(deltaY) > 0) {
      // Vertical scroll - move view up/down
      const scrollSpeed = MINDMAP_CONSTANTS.SCROLL_SPEED;
      setPan(prevPan => ({
        x: prevPan.x,
        y: prevPan.y - deltaY * scrollSpeed
      }));
      return;
    }
    
    // Handle zooming (if no significant horizontal/vertical movement)
    if (Math.abs(deltaZ) > 0 || (Math.abs(deltaX) < 5 && Math.abs(deltaY) < 5)) {
      const zoomSpeed = MINDMAP_CONSTANTS.ZOOM_SPEED;
      const newZoom = Math.max(
        MINDMAP_CONSTANTS.MIN_ZOOM, 
        Math.min(MINDMAP_CONSTANTS.MAX_ZOOM, zoom - deltaY * zoomSpeed)
      );
      setZoom(newZoom);
    }
  }, [editingState, zoom, showContentModal]);

  // Handle mouse down for panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (editingState || showContentModal) return;
    
    if (e.button === 0) { // Left mouse button
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan, editingState, showContentModal]);

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
    if (editingState || showContentModal) return;
    setIsDragging(false);
  }, [editingState, showContentModal]);

  // Handle mouse leave for panning
  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Calculate distance between two touches
  const getTouchDistance = (touch1: React.Touch, touch2: React.Touch): number => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Calculate center point between two touches
  const getTouchCenter = (touch1: React.Touch, touch2: React.Touch): { x: number; y: number } => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  };

  // Handle touch start for mobile panning and pinch zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (editingState || showContentModal) return;
    
    if (e.touches.length === 1) { // Single touch for panning
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
      setPinchStart(null);
    } else if (e.touches.length === 2) { // Two touches for pinch zoom
      e.preventDefault();
      setIsDragging(false);
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = getTouchDistance(touch1, touch2);
      const center = getTouchCenter(touch1, touch2);
      setPinchStart({
        distance,
        center,
        zoom,
        pan: { ...pan }
      });
    }
  }, [pan, zoom, editingState, showContentModal]);

  // Handle touch move for mobile panning and pinch zoom
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (editingState || showContentModal) return;
    
    if (e.touches.length === 1 && isDragging) {
      // Single touch panning
      e.preventDefault();
      const touch = e.touches[0];
      setPan({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y
      });
    } else if (e.touches.length === 2 && pinchStart) {
      // Two touch pinch zoom
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = getTouchDistance(touch1, touch2);
      const currentCenter = getTouchCenter(touch1, touch2);
      
      // Calculate zoom factor based on distance change
      const scale = currentDistance / pinchStart.distance;
      const newZoom = Math.max(
        MINDMAP_CONSTANTS.MIN_ZOOM,
        Math.min(MINDMAP_CONSTANTS.MAX_ZOOM, pinchStart.zoom * scale)
      );
      
      // Calculate pan adjustment to keep the pinch center point stable
      // The center point in world coordinates should remain the same
      const worldCenterX = (currentCenter.x - pinchStart.pan.x) / pinchStart.zoom;
      const worldCenterY = (currentCenter.y - pinchStart.pan.y) / pinchStart.zoom;
      
      const newPanX = currentCenter.x - worldCenterX * newZoom;
      const newPanY = currentCenter.y - worldCenterY * newZoom;
      
      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    }
  }, [isDragging, dragStart, pinchStart, editingState, showContentModal]);

  // Handle touch end for mobile panning and pinch zoom
  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    setPinchStart(null);
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
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    setZoom,
    setPan,
    resetView
  };
};
