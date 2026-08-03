import {
  PointerEvent,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

interface GraphViewportProps {
  children: ReactNode;
  contentWidth: number;
  contentHeight: number;
  label: string;
}

interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}

const MIN_SCALE = 0.3;
const MAX_SCALE = 2.5;
const VIEWPORT_PADDING = 24;

const clampScale = (scale: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));

export const GraphViewport = (props: GraphViewportProps) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const initializedRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [transform, setTransform] = useState<ViewTransform>({ x: 0, y: 0, scale: 1 });

  const fit = useCallback((keepReadable = false) => {
    const viewport = viewportRef.current;
    if (viewport === null) return;
    const bounds = viewport.getBoundingClientRect();
    const availableWidth = Math.max(1, bounds.width - VIEWPORT_PADDING * 2);
    const availableHeight = Math.max(1, bounds.height - VIEWPORT_PADDING * 2);
    const fittedScale = clampScale(Math.min(
      1,
      availableWidth / props.contentWidth,
      availableHeight / props.contentHeight,
    ));
    const scale = keepReadable ? Math.max(0.65, fittedScale) : fittedScale;
    setTransform({
      x: (bounds.width - props.contentWidth * scale) / 2,
      y: (bounds.height - props.contentHeight * scale) / 2,
      scale,
    });
  }, [props.contentHeight, props.contentWidth]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport === null) return;
    const observer = new ResizeObserver(() => {
      if (initializedRef.current) return;
      initializedRef.current = true;
      fit(true);
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [fit]);

  const zoomAt = useCallback((factor: number, clientX: number, clientY: number) => {
    const bounds = viewportRef.current?.getBoundingClientRect();
    if (bounds === undefined) return;
    const pointX = clientX - bounds.left;
    const pointY = clientY - bounds.top;
    setTransform((current) => {
      const scale = clampScale(current.scale * factor);
      const contentX = (pointX - current.x) / current.scale;
      const contentY = (pointY - current.y) / current.scale;
      return {
        x: pointX - contentX * scale,
        y: pointY - contentY * scale,
        scale,
      };
    });
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport === null) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoomAt(Math.exp(-event.deltaY * 0.0015), event.clientX, event.clientY);
    };
    viewport.addEventListener("wheel", handleWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handleWheel);
  }, [zoomAt]);

  const zoomFromCenter = (factor: number) => {
    const bounds = viewportRef.current?.getBoundingClientRect();
    if (bounds === undefined) return;
    zoomAt(factor, bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest("button, select") !== null) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    setDragging(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag === null || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.x;
    const deltaY = event.clientY - drag.y;
    dragRef.current = { ...drag, x: event.clientX, y: event.clientY };
    setTransform((current) => ({
      ...current,
      x: current.x + deltaX,
      y: current.y + deltaY,
    }));
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div
      ref={viewportRef}
      className={`graph-viewport${dragging ? " graph-viewport--dragging" : ""}`}
      aria-label={props.label}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        className="graph-viewport__stage"
        style={{
          width: props.contentWidth,
          height: props.contentHeight,
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
        }}
      >
        {props.children}
      </div>
      <div className="graph-viewport__controls" aria-label="Graph zoom controls">
        <button type="button" aria-label="Zoom out" onClick={() => zoomFromCenter(0.8)}>−</button>
        <span>{Math.round(transform.scale * 100)}%</span>
        <button type="button" aria-label="Zoom in" onClick={() => zoomFromCenter(1.25)}>+</button>
        <button type="button" className="graph-viewport__fit" onClick={() => fit()}>Fit</button>
      </div>
    </div>
  );
};
