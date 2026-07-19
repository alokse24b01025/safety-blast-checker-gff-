import React, { useState, useEffect } from 'react';
import { Play, RotateCcw, Info } from 'lucide-react';

interface BlastVisualizerProps {
  burden: number;
  spacing: number;
  layout: 'GRID' | 'STAGGERED';
  delayTiming: number;
}

interface Hole {
  id: number;
  row: number;
  col: number;
  x: number;
  y: number;
  delay: number; // millisecond delay when it detonate
  detonated: boolean;
}

export default function BlastVisualizer({ burden, spacing, layout, delayTiming }: BlastVisualizerProps) {
  const [holes, setHoles] = useState<Hole[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // SVG grid settings
  const rowsCount = 4;
  const colsCount = 6;
  const svgWidth = 500;
  const svgHeight = 250;
  const paddingX = 60;
  const paddingY = 40;

  // Generate pattern layout
  useEffect(() => {
    const list: Hole[] = [];
    const stepX = (svgWidth - paddingX * 2) / (colsCount - 1);
    const stepY = (svgHeight - paddingY * 2) / (rowsCount - 1);

    let id = 1;
    for (let r = 0; r < rowsCount; r++) {
      const isOffsetRow = layout === 'STAGGERED' && r % 2 === 1;
      const rowDelay = r * delayTiming * 1.5; // row delay
      for (let c = 0; c < colsCount; c++) {
        // Offset alternate rows for Staggered
        const offsetX = isOffsetRow ? stepX / 2 : 0;
        const x = paddingX + c * stepX + offsetX;
        const y = paddingY + r * stepY;
        
        // Detonation delay is based on row-to-row delay plus a small hole-to-hole delay
        const holeDelay = rowDelay + (c * delayTiming);

        list.push({
          id,
          row: r,
          col: c,
          x,
          y,
          delay: Math.round(holeDelay),
          detonated: false
        });
        id++;
      }
    }
    setHoles(list);
    setIsSimulating(false);
    setCurrentTime(0);
  }, [burden, spacing, layout, delayTiming]);

  // Run simulation timer
  useEffect(() => {
    if (!isSimulating) return;

    const maxDelay = Math.max(...holes.map(h => h.delay));
    const step = 10; // ms step
    const interval = setInterval(() => {
      setCurrentTime(prev => {
        const next = prev + step;
        if (next >= maxDelay + 300) {
          clearInterval(interval);
          setIsSimulating(false);
          return maxDelay + 300;
        }
        return next;
      });
    }, 10);

    return () => clearInterval(interval);
  }, [isSimulating, holes]);

  const handleStartSim = () => {
    setCurrentTime(0);
    setIsSimulating(true);
  };

  const handleResetSim = () => {
    setIsSimulating(false);
    setCurrentTime(0);
  };

  return (
    <div className="bg-mining-card border border-mining-border p-4 rounded-xl flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-semibold text-white">2D Drill Pattern &amp; Detonation Simulation</h3>
          <p className="text-xs text-gray-400">Detonation delay propagation across {layout.toLowerCase()} pattern</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleStartSim}
            disabled={isSimulating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-mining-accent hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <Play size={14} />
            Simulate
          </button>
          <button
            onClick={handleResetSim}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <RotateCcw size={14} />
            Reset
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="w-full bg-mining-dark border border-mining-border rounded-lg overflow-hidden p-2 flex justify-center relative">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full max-w-[500px] h-[250px]">
          {/* Legend lines */}
          <line x1="20" y1="20" x2="20" y2="70" stroke="#ef6c00" strokeWidth="1.5" strokeDasharray="3" />
          <text x="25" y="48" fill="#ef6c00" fontSize="10" fontWeight="bold">Burden: {burden}m</text>

          <line x1="20" y1="20" x2="100" y2="20" stroke="#f9a825" strokeWidth="1.5" strokeDasharray="3" />
          <text x="40" y="15" fill="#f9a825" fontSize="10" fontWeight="bold">Spacing: {spacing}m</text>

          {/* Connection delay lines */}
          {holes.map((hole, i) => {
            const nextInRow = holes.find(h => h.row === hole.row && h.col === hole.col + 1);
            return nextInRow ? (
              <line
                key={`line-row-${i}`}
                x1={hole.x}
                y1={hole.y}
                x2={nextInRow.x}
                y2={nextInRow.y}
                stroke="#2a2a35"
                strokeWidth="1.5"
              />
            ) : null;
          })}

          {/* Render individual boreholes */}
          {holes.map(hole => {
            const detonated = currentTime >= hole.delay;
            // Draw expanding ring on detonation
            const ringRadius = detonated ? Math.min(30, (currentTime - hole.delay) / 4) : 0;
            const ringOpacity = detonated ? Math.max(0, 1 - (currentTime - hole.delay) / 250) : 0;

            return (
              <g key={hole.id}>
                {/* Expanding explosion wave */}
                {detonated && ringRadius > 0 && (
                  <circle
                    cx={hole.x}
                    cy={hole.y}
                    r={ringRadius}
                    fill="none"
                    stroke="#ef6c00"
                    strokeWidth="2"
                    strokeOpacity={ringOpacity}
                  />
                )}
                
                {/* Hole base circle */}
                <circle
                  cx={hole.x}
                  cy={hole.y}
                  r="8"
                  fill={detonated ? '#ef6c00' : '#1e1e24'}
                  stroke={detonated ? '#ff9800' : '#4a4a5a'}
                  strokeWidth="2"
                  className="transition-colors duration-200"
                />

                {/* Blasting delay labels */}
                <text
                  x={hole.x}
                  y={hole.y - 12}
                  textAnchor="middle"
                  fill={detonated ? '#ffb74d' : '#8a8a9a'}
                  fontSize="8"
                  fontWeight="bold"
                >
                  {hole.delay}ms
                </text>
              </g>
            );
          })}
        </svg>

        {/* Current Time Overlay */}
        <div className="absolute bottom-2 left-2 px-2 py-1 bg-mining-card border border-mining-border rounded text-[10px] font-mono text-gray-300">
          Simulation Time: {currentTime} ms
        </div>
      </div>

      <div className="flex gap-2 items-center bg-mining-dark/50 border border-mining-border p-2.5 rounded-lg text-xs text-gray-400">
        <Info size={14} className="text-mining-accent shrink-0" />
        <span>Holes are detonated in waves. The simulation propagates row-by-row and hole-by-hole to optimize fragmentation and direct the throw away from structures.</span>
      </div>
    </div>
  );
}
