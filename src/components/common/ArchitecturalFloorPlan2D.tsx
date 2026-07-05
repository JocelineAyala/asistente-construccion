import { useEffect, useRef } from 'react';
import { FloorPlanAnalysis } from '../../types/floorPlan';
import { renderArchitecturalFloorPlan } from '../../utils/drawArchitecturalFloorPlan';

type ArchitecturalFloorPlan2DProps = {
  plan: FloorPlanAnalysis;
};

export function ArchitecturalFloorPlan2D({ plan }: ArchitecturalFloorPlan2DProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = renderArchitecturalFloorPlan(plan, container.clientWidth * 2, 900);
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    canvas.style.display = 'block';
    container.replaceChildren(canvas);
  }, [plan]);

  return (
    <div
      className="architectural-floor-plan-2d"
      ref={containerRef}
      aria-label="Vista en planta arquitectónica"
    />
  );
}
