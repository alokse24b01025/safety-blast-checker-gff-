import React, { useState, useEffect } from 'react';
import { Layers, Zap, Info, ShieldAlert, RefreshCw, Navigation, Map } from 'lucide-react';
import BlastVisualizer from './BlastVisualizer.tsx';
import FragmentationCurve from './FragmentationCurve.tsx';
import { submitBlastPlan, optimizeBlastParams } from '../api/client.ts';

const initialForm = {
  blast_id: 'PLAN-SEC5-03',
  bench_height: '10',
  burden: '3.5',
  spacing: '4.5',
  hole_diameter: '115', // mm
  subdrill: '1.2',
  stemming_height: '3.0',
  hole_layout: 'STAGGERED' as 'GRID' | 'STAGGERED',
  
  explosive_type: 'ANFO' as 'ANFO' | 'EMULSION',
  explosive_qty: '80', // kg per hole
  charge_distribution: 'CONTINUOUS',
  delay_timing: '17', // ms
  primer_position: 'BOTTOM' as 'BOTTOM' | 'MIDDLE' | 'TOP',
  deck_charging: false,
};

interface GISAsset {
  id: string;
  name: string;
  type: 'VILLAGE' | 'ROAD' | 'EQUIPMENT' | 'WORKER' | 'VEHICLE' | 'PIPELINE';
  x: number; // local coordinate map relative X (0 - 500)
  y: number; // local coordinate map relative Y (0 - 320)
  label: string;
}

const gisAssets: GISAsset[] = [
  { id: 'v1', name: 'Site Access Boundary Gate', type: 'VILLAGE', x: 80, y: 70, label: 'Access Gate' },
  { id: 'v2', name: 'Field Operations Station', type: 'VILLAGE', x: 420, y: 90, label: 'Ops Station' },
  { id: 'e1', name: 'Primary Heavy Excavator', type: 'EQUIPMENT', x: 340, y: 130, label: 'Excavator' },
  { id: 'e2', name: 'Drilling Machinery Unit', type: 'EQUIPMENT', x: 280, y: 165, label: 'Drill Unit' },
  { id: 'w1', name: 'Field Inspection Crew', type: 'WORKER', x: 220, y: 155, label: 'Crew A' },
  { id: 'w2', name: 'Safety Officer Station', type: 'WORKER', x: 130, y: 220, label: 'Safety Officer' },
  { id: 't1', name: 'Haul Transport Vehicle', type: 'VEHICLE', x: 190, y: 260, label: 'Haul Truck' },
  { id: 't2', name: 'Water Tanker Unit', type: 'VEHICLE', x: 380, y: 260, label: 'Water Tanker' },
];

// Distance helper from a point to a line segment (used for Boundary overlap check)
const getDistanceToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
  const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  if (l2 === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt((px - (x1 + t * (x2 - x1))) ** 2 + (py - (y1 + t * (y2 - y1))) ** 2);
};

export default function BlastDesignTab() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  // AI suggestion state
  const [loadingOpt, setLoadingOpt] = useState(false);

  // User's actual GPS location state
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lon: number }>({ lat: 23.7957, lon: 86.4304 }); // default to Dhanbad coalfields

  // GIS blast center point relative coordinates
  const [blastCoords, setBlastCoords] = useState<{ x: number; y: number }>({ x: 250, y: 160 });
  const [activeTab, setActiveTab] = useState<'gis' | 'physics'>('gis');

  // Load User Location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsCoords({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        }
      );
    }
  }, []);

  // --- BLAST PHYSICS LOGICAL CALCULATOR (Langefors & Ash Formulations) ---
  const holeDiameterMm = Number(form.hole_diameter) || 115;
  const benchHeightM = Number(form.bench_height) || 10;
  const subdrillM = Number(form.subdrill) || 1.2;

  // 1. Hole Depth: Bench Height + Subdrill
  const calculatedHoleDepth = parseFloat((benchHeightM + subdrillM).toFixed(2));

  // 2. Ash's Burden Ratio (Typically 30 times hole diameter in meters)
  const calculatedBurden = parseFloat(((30 * holeDiameterMm) / 1000).toFixed(2));

  // 3. Spacing Ratio (Typically 1.25 times Burden for staggered pattern)
  const calculatedSpacing = parseFloat((1.25 * calculatedBurden).toFixed(2));

  // 4. Volumetric explosive charge estimate per hole based on rock yield and powder factor
  // Rock Volume = Spacing * Burden * Bench Height
  const rockVolumePerHole = calculatedSpacing * calculatedBurden * benchHeightM;
  const powderFactorTarget = 0.5; // kg/m³ standard structural fragmentation yield
  const calculatedExplosiveQty = Math.round(rockVolumePerHole * powderFactorTarget);

  const applyLogicalFormulas = () => {
    setForm(prev => ({
      ...prev,
      burden: String(calculatedBurden),
      spacing: String(calculatedSpacing),
      explosive_qty: String(calculatedExplosiveQty),
    }));
  };

  // --- DYNAMIC GIS COMPUTATIONS ---
  const chargeWeight = Number(form.explosive_qty) || 80;
  const dangerRadiusM = Math.round(chargeWeight * 4.5); // 360m at 80kg
  const dangerRadiusPx = dangerRadiusM / 2; // 1 pixel = 2 meters

  // Pipeline Coordinates (Dashed yellow utility line passing through sector)
  const pipelineCoords = { x1: 50, y1: 40, x2: 450, y2: 280 };

  // Calculate distance to pipeline
  const pipelineDistancePx = getDistanceToSegment(
    blastCoords.x,
    blastCoords.y,
    pipelineCoords.x1,
    pipelineCoords.y1,
    pipelineCoords.x2,
    pipelineCoords.y2
  );
  const pipelineDistanceM = Math.round(pipelineDistancePx * 2);
  const isPipelineViolated = pipelineDistanceM < dangerRadiusM;

  // Calculate distances to all point assets
  const scale = 2; // 1px = 2m
  const conflicts = gisAssets.map(asset => {
    const dx = asset.x - blastCoords.x;
    const dy = asset.y - blastCoords.y;
    const distanceM = Math.round(Math.sqrt(dx * dx + dy * dy) * scale);
    const hasIntrusion = distanceM < dangerRadiusM;
    return { ...asset, distanceM, hasIntrusion };
  });

  const activeIntrusions = conflicts.filter(c => c.hasIntrusion);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleOptimize = async () => {
    setLoadingOpt(true);
    try {
      const res = await optimizeBlastParams({
        bench_height: Number(form.bench_height),
        hole_diameter: Number(form.hole_diameter)
      });
      if (res) {
        setForm(prev => ({
          ...prev,
          burden: String(res.opt_burden),
          spacing: String(res.opt_spacing),
        }));
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingOpt(false);
    }
  };

  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setBlastCoords({
      x: Math.min(500, Math.max(0, x)),
      y: Math.min(320, Math.max(0, y))
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        bench_height: Number(form.bench_height),
        burden: Number(form.burden),
        spacing: Number(form.spacing),
        hole_diameter: Number(form.hole_diameter),
        subdrill: Number(form.subdrill),
        stemming_height: Number(form.stemming_height),
        explosive_qty: Number(form.explosive_qty),
        delay_timing: Number(form.delay_timing),
      };

      const res = await submitBlastPlan(payload);
      setResult(res);
      setActiveTab('physics');
    } catch (err: any) {
      setError(err.message || 'Failed to submit blast design plan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Pattern Form Input - Left Column */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        
        {/* Form panel */}
        <form onSubmit={handleSubmit} className="bg-mining-card border border-mining-border p-5 rounded-2xl flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-wider font-display">
              <Layers className="text-mining-accent" size={16} /> Pattern Designer &amp; Charges
            </h2>
            <p className="text-[10px] text-gray-500">Define drill pattern geometry and explosive charge weight.</p>
          </div>

          {/* Identification */}
          <div className="border-t border-mining-border/60 pt-3 flex gap-3">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-[10px] text-gray-400 font-mono uppercase">Blast Plan ID</label>
              <input
                type="text"
                name="blast_id"
                value={form.blast_id}
                onChange={handleInputChange}
                required
                className="bg-mining-dark border border-mining-border rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-mining-accent"
              />
            </div>
            <div className="flex-1 flex flex-col gap-1 justify-end">
              <button
                type="button"
                onClick={handleOptimize}
                className="py-1.5 bg-mining-accent/10 hover:bg-mining-accent/20 border border-mining-accent/40 text-mining-gold rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <RefreshCw size={12} className={loadingOpt ? "animate-spin" : ""} /> AI Pre-Optimize
              </button>
            </div>
          </div>

          {/* Pattern Details */}
          <div className="border-t border-mining-border/60 pt-3">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-mono">Bench Height (m)</label>
                <input
                  type="number" step="0.1" name="bench_height"
                  value={form.bench_height} onChange={handleInputChange} required
                  className="bg-mining-dark border border-mining-border rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-mining-accent"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-mono">Hole Diameter (mm)</label>
                <input
                  type="number" name="hole_diameter"
                  value={form.hole_diameter} onChange={handleInputChange} required
                  className="bg-mining-dark border border-mining-border rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-mining-accent"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-mono">Burden (m)</label>
                <input
                  type="number" step="0.1" name="burden"
                  value={form.burden} onChange={handleInputChange} required
                  className="bg-mining-dark border border-mining-border rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-mining-accent"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-mono">Spacing (m)</label>
                <input
                  type="number" step="0.1" name="spacing"
                  value={form.spacing} onChange={handleInputChange} required
                  className="bg-mining-dark border border-mining-border rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-mining-accent"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-mono">Subdrill (m)</label>
                <input
                  type="number" step="0.1" name="subdrill"
                  value={form.subdrill} onChange={handleInputChange} required
                  className="bg-mining-dark border border-mining-border rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-mining-accent"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-mono">Stemming Height (m)</label>
                <input
                  type="number" step="0.1" name="stemming_height"
                  value={form.stemming_height} onChange={handleInputChange} required
                  className="bg-mining-dark border border-mining-border rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-mining-accent"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-400 font-mono">Drill Layout</label>
              <select
                name="hole_layout"
                value={form.hole_layout}
                onChange={handleInputChange}
                className="bg-mining-dark border border-mining-border rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-mining-accent"
              >
                <option value="STAGGERED">STAGGERED Layout</option>
                <option value="GRID">GRID Layout</option>
              </select>
            </div>
          </div>

          {/* Charge Settings */}
          <div className="border-t border-mining-border/60 pt-3">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-mono">Explosive Type</label>
                <select
                  name="explosive_type"
                  value={form.explosive_type}
                  onChange={handleInputChange}
                  className="bg-mining-dark border border-mining-border rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-mining-accent"
                >
                  <option value="ANFO">ANFO (Dry)</option>
                  <option value="EMULSION">EMULSION (Wet)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-mono">Qty Per Hole (kg)</label>
                <input
                  type="number" name="explosive_qty"
                  value={form.explosive_qty} onChange={handleInputChange} required
                  className="bg-mining-dark border border-mining-border rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-mining-accent"
                />
              </div>
            </div>
            <div className="flex justify-between items-center bg-mining-dark border border-mining-border/60 p-3 rounded-xl text-xs">
              <span className="text-gray-400 font-sans">Deck Charging</span>
              <input
                type="checkbox"
                name="deck_charging"
                checked={form.deck_charging}
                onChange={(e) => setForm(prev => ({ ...prev, deck_charging: e.target.checked }))}
                className="accent-mining-accent h-4 w-4"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-950/20 border border-red-800 text-red-400 p-3 rounded-xl text-xs font-mono">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full btn-neon-yellow py-2.5 rounded-xl font-bold mt-2 text-xs uppercase"
          >
            {submitting ? 'COMPUTING SIMULATIONS...' : 'RUN METRIC SIMULATIONS'}
          </button>
        </form>

        {/* LOGICAL FORMULA AUDIT PANEL */}
        <div className="bg-mining-card border border-mining-border p-4 rounded-2xl flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5 text-mining-gold text-xs font-black uppercase font-mono">
              <Info size={14} /> Blasting Physics Formula Audit
            </div>
            <button
              type="button"
              onClick={applyLogicalFormulas}
              className="px-2 py-0.5 bg-mining-accent/15 border border-mining-accent text-mining-gold font-mono rounded text-[8px] font-bold hover:bg-mining-accent/30 transition-colors"
            >
              APPLY DESIGN VALUES
            </button>
          </div>

          <div className="flex flex-col gap-2 text-[10px] text-gray-300 font-mono">
            <div className="flex justify-between border-b border-mining-border/40 pb-1.5">
              <span>Hole Depth (K + J)</span>
              <span className="text-white font-bold">{calculatedHoleDepth} m</span>
            </div>
            <div className="flex justify-between border-b border-mining-border/40 pb-1.5">
              <span>Ash's Burden (30 * d / 1000)</span>
              <span className="text-white font-bold">{calculatedBurden} m</span>
            </div>
            <div className="flex justify-between border-b border-mining-border/40 pb-1.5">
              <span>Ash's Spacing (1.25 * Burden)</span>
              <span className="text-white font-bold">{calculatedSpacing} m</span>
            </div>
            <div className="flex justify-between border-b border-mining-border/40 pb-1.5">
              <span>Volumetric Yield (S * B * K)</span>
              <span className="text-white font-bold">{rockVolumePerHole.toFixed(1)} m³</span>
            </div>
            <div className="flex justify-between">
              <span>Target Charge Mass (Vol * 0.5 kg/m³)</span>
              <span className="text-mining-accent font-bold">{calculatedExplosiveQty} kg / hole</span>
            </div>
          </div>
        </div>

      </div>

      {/* Outputs & GIS Map - Right Column */}
      <div className="lg:col-span-7 flex flex-col gap-5">
        
        {/* TAB CONTROLLERS */}
        <div className="flex border-b border-mining-border/60">
          <button
            onClick={() => setActiveTab('gis')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase transition-colors border-b-2 ${
              activeTab === 'gis' ? 'border-b-2 border-mining-accent text-white font-black' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <Map size={13} /> GIS Blast Planner Map
          </button>
          <button
            onClick={() => setActiveTab('physics')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase transition-colors border-b-2 ${
              activeTab === 'physics' ? 'border-b-2 border-mining-accent text-white font-black' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <Zap size={13} /> Physics &amp; Blasting Waveforms
          </button>
        </div>

        {/* TAB 1: GIS BLAST MAP VIEW */}
        {activeTab === 'gis' && (
          <div className="bg-mining-card border border-mining-border p-5 rounded-2xl flex flex-col gap-4">
            <div>
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-white uppercase tracking-wider font-mono">Interactive GIS Blast Planner Map</h3>
                <span className="text-[8px] bg-mining-dark text-mining-gold px-2 py-0.5 rounded-lg font-mono border border-mining-border">
                  Centered on Actual GPS Location
                </span>
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5">Click on the mine sector to relocate the blast. Relocation computes the danger radius relative to your actual coordinates.</p>
            </div>

            {/* INTERACTIVE SVG MAP */}
            <div className="relative border border-mining-border/80 rounded-2xl overflow-hidden bg-[#0d0c0c] shadow-inner select-none">
              <svg 
                width="100%" 
                viewBox="0 0 500 320" 
                onClick={handleMapClick}
                className="cursor-crosshair transition-all"
              >
                {/* Grid Overlay background */}
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,90,31,0.025)" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* Roads */}
                {/* Haul Road Alpha */}
                <path d="M 0 240 Q 250 220 500 240" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" strokeLinecap="round" />
                <path d="M 0 240 Q 250 220 500 240" fill="none" stroke="#222" strokeWidth="6" strokeDasharray="5 5" />
                <text x="30" y="250" fill="rgba(255,255,255,0.25)" fontSize="8" fontFamily="monospace" transform="rotate(-2, 30, 250)">Haul Road Alpha</text>

                {/* High-Pressure Slurry/Utility Pipeline (Yellow Dashed Line) */}
                <line 
                  x1={pipelineCoords.x1} 
                  y1={pipelineCoords.y1} 
                  x2={pipelineCoords.x2} 
                  y2={pipelineCoords.y2} 
                  stroke={isPipelineViolated ? '#ef4444' : '#fbbf24'} 
                  strokeWidth="2.5" 
                  strokeDasharray="6 4" 
                />
                <text 
                  x="150" 
                  y="120" 
                  fill={isPipelineViolated ? '#ef4444' : '#fbbf24'} 
                  fontSize="7" 
                  fontFamily="monospace" 
                  transform="rotate(31, 150, 120)"
                  fontWeight="bold"
                >
                  ⚡ Perimeter Power & Utility Line
                </text>

                {/* Mine Pit Edge boundary lines */}
                <path d="M 50 120 L 150 100 L 300 110 L 450 130" fill="none" stroke="rgba(255,165,0,0.15)" strokeWidth="2" strokeDasharray="3 3" />
                <path d="M 30 150 L 180 130 L 320 140 L 470 160" fill="none" stroke="rgba(255,165,0,0.1)" strokeWidth="1" />

                {/* Danger Exclusions Zone (Translucent Circle) */}
                <circle 
                  cx={blastCoords.x} 
                  cy={blastCoords.y} 
                  r={dangerRadiusPx} 
                  fill="rgba(255, 90, 31, 0.12)" 
                  stroke="var(--orange)" 
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                  className="animate-pulse"
                />

                {/* Blast Radius Target Indicator */}
                <g transform={`translate(${blastCoords.x}, ${blastCoords.y})`}>
                  <circle cx="0" cy="0" r="8" fill="rgba(255,90,31,0.3)" />
                  <circle cx="0" cy="0" r="3" fill="var(--orange)" />
                  <line x1="-15" y1="0" x2="15" y2="0" stroke="var(--orange)" strokeWidth="1" />
                  <line x1="0" y1="-15" x2="0" y2="15" stroke="var(--orange)" strokeWidth="1" />
                </g>

                {/* Assets Markers */}
                {conflicts.map(asset => {
                  let color = 'rgba(255,255,255,0.4)';
                  let iconChar = '•';
                  if (asset.type === 'VILLAGE') { color = '#3b82f6'; iconChar = '🏠'; }
                  if (asset.type === 'EQUIPMENT') { color = '#fbbf24'; iconChar = '🏗️'; }
                  if (asset.type === 'WORKER') { color = '#10b981'; iconChar = '👷'; }
                  if (asset.type === 'VEHICLE') { color = '#a855f7'; iconChar = '🚛'; }

                  if (asset.hasIntrusion) {
                    color = '#ef4444'; // Red if conflict detected
                  }

                  return (
                    <g key={asset.id} className="transition-all duration-300">
                      {asset.hasIntrusion && (
                        <circle cx={asset.x} cy={asset.y} r="12" fill="none" stroke="#ef4444" strokeWidth="1.5" className="animate-ping" style={{ transformOrigin: `${asset.x}px ${asset.y}px` }} />
                      )}
                      <circle cx={asset.x} cy={asset.y} r="5" fill="#111" stroke={color} strokeWidth="2" />
                      <text x={asset.x} y={asset.y + 3} textAnchor="middle" fontSize="7" fill={color}>{iconChar}</text>
                      <text x={asset.x} y={asset.y - 8} textAnchor="middle" fontSize="7" fill={asset.hasIntrusion ? '#ef4444' : '#bbb'} fontWeight={asset.hasIntrusion ? 'bold' : 'normal'} className="font-mono">
                        {asset.label}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Dynamic Coordinate overlay label (Uses real browser GPS center coords!) */}
              <div className="absolute top-3 left-3 bg-black/75 px-3 py-1 rounded-lg border border-mining-border/50 text-[9px] font-mono text-gray-300 flex flex-col gap-0.5">
                <span className="flex items-center gap-1.5 text-mining-gold">
                  <Navigation size={10} className="text-mining-accent animate-pulse" />
                  <strong>REAL SITE CENTER:</strong> {gpsCoords.lat.toFixed(5)}°N, {gpsCoords.lon.toFixed(5)}°E
                </span>
                <span className="text-[8px] text-gray-400">
                  BLAST TARGET: {(gpsCoords.lat + (blastCoords.y - 160) * 0.00002).toFixed(5)}°N, {(gpsCoords.lon + (blastCoords.x - 250) * 0.00003).toFixed(5)}°E
                </span>
              </div>

              <div className="absolute bottom-3 right-3 bg-black/75 px-3 py-1 rounded-lg border border-mining-border/50 text-[9px] font-mono text-mining-gold font-bold">
                Calculated Danger Exclusion: {dangerRadiusM}m
              </div>
            </div>

            {/* GIS Real-time Intrusion Warnings Panel */}
            <div className="bg-mining-dark border border-mining-border p-4 rounded-xl flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">GIS Utility & Danger Area Audit</span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                  (activeIntrusions.length > 0 || isPipelineViolated) ? 'bg-red-950/40 text-red-400 border border-red-800' : 'bg-green-950/40 text-green-400 border border-green-800'
                }`}>
                  {activeIntrusions.length + (isPipelineViolated ? 1 : 0)} WARNINGS DETECTED
                </span>
              </div>

              <div className="max-h-[120px] overflow-y-auto pr-1 flex flex-col gap-2 mt-1">
                {/* Pipeline collision status */}
                <div className={`flex justify-between items-center bg-black/20 p-2 rounded-lg border text-xs font-mono ${
                  isPipelineViolated ? 'border-red-900/60' : 'border-mining-border/40'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={isPipelineViolated ? 'text-red-400' : 'text-yellow-400'}>⚡</span>
                    <span className={isPipelineViolated ? 'text-red-300 font-bold' : 'text-white'}>Primary Utility Pipe (Mining)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 text-[10px]">Range: {pipelineDistanceM}m</span>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded ${
                      isPipelineViolated ? 'bg-red-950 text-red-400 border border-red-900' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                    }`}>
                      {isPipelineViolated ? 'RUPTURE RISK' : 'SECURE'}
                    </span>
                  </div>
                </div>

                {/* Point asset statuses */}
                {conflicts.map(c => (
                  <div key={c.id} className="flex justify-between items-center bg-black/20 p-2 rounded-lg border border-mining-border/40 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className={c.hasIntrusion ? 'text-red-400' : 'text-gray-400'}>
                        {c.type === 'VILLAGE' ? '🏠' : c.type === 'EQUIPMENT' ? '🏗️' : c.type === 'WORKER' ? '👷' : '🚛'}
                      </span>
                      <span className={c.hasIntrusion ? 'text-red-300 font-bold' : 'text-white'}>{c.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 text-[10px]">Range: {c.distanceM}m</span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded ${
                        c.hasIntrusion ? 'bg-red-950 text-red-400 border border-red-900' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                      }`}>
                        {c.hasIntrusion ? 'CLEARANCE BREACHED' : 'SAFE ZONE'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Dynamic recommendation alert text box */}
              {(activeIntrusions.length > 0 || isPipelineViolated) ? (
                <div className="mt-2 p-3 bg-red-950/20 border border-red-800/40 text-red-200 text-xs rounded-xl flex gap-2 items-start">
                  <ShieldAlert size={14} className="shrink-0 mt-0.5 text-red-400" />
                  <div>
                    <strong>Blasting Safety Violations:</strong> 
                    {isPipelineViolated && ` Blasting point is too close (${pipelineDistanceM}m) to the high-pressure pipeline.`}
                    {activeIntrusions.map(i => ` ${i.name} is within the ${dangerRadiusM}m exclusion sector.`).join('')}
                    <span className="block mt-1 font-bold text-mining-gold">Recommendation: Decrease explosive charge mass or relocate the blast point further north.</span>
                  </div>
                </div>
              ) : (
                <div className="mt-2 p-3 bg-green-950/15 border border-green-800/40 text-green-300 text-xs rounded-xl flex gap-2 items-start">
                  <span>✓</span>
                  <div>
                    <strong>Clearance margins verified:</strong> No personnel, high-pressure pipelines, or villages detected inside the {dangerRadiusM}m danger radius. Clear to blast!
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: PHYSICS & BLATING WAVEFORMS */}
        {activeTab === 'physics' && (
          <div className="flex flex-col gap-5">
            {!result ? (
              <div className="bg-mining-card border border-mining-border p-6 rounded-2xl flex flex-col items-center justify-center text-center min-h-[300px]">
                <Zap size={36} className="text-gray-500 mb-3 animate-pulse" />
                <h3 className="text-white font-bold text-xs font-sans">Run Simulations First</h3>
                <p className="text-[10px] text-gray-500 max-w-[240px] mt-1 font-sans">Submit pattern design on the left to review spacing grids, noise dB levels, and Rosin-Rammler fragmentation curves.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {/* Simulation Output Card */}
                <div className="bg-mining-card border border-mining-border p-5 rounded-2xl flex flex-col gap-4">
                  <div>
                    <h3 className="text-xs font-black text-mining-accent uppercase tracking-wider font-mono">Blast Physics Output</h3>
                    <p className="text-[10px] text-gray-500">Calculated impact metrics at 150m monitoring distance</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="bg-black/30 p-2.5 rounded-xl border border-mining-border flex flex-col justify-between">
                      <span className="text-[8px] text-gray-500 block uppercase font-bold">Ground PPV</span>
                      <span className={`text-sm font-black ${result.ground_vibration > 15 ? 'text-red-400' : 'text-green-400'}`}>
                        {result.ground_vibration} mm/s
                      </span>
                      <span className="text-[7.5px] text-gray-500 block mt-0.5">Limit: 15</span>
                    </div>
                    <div className="bg-black/30 p-2.5 rounded-xl border border-mining-border flex flex-col justify-between">
                      <span className="text-[8px] text-gray-500 block uppercase font-bold">Air Blast</span>
                      <span className={`text-sm font-black ${result.air_blast > 120 ? 'text-orange-400' : 'text-green-400'}`}>
                        {result.air_blast} dB
                      </span>
                      <span className="text-[7.5px] text-gray-500 block mt-0.5">Limit: 120</span>
                    </div>
                    <div className="bg-black/30 p-2.5 rounded-xl border border-mining-border flex flex-col justify-between">
                      <span className="text-[8px] text-gray-500 block uppercase font-bold">Throw</span>
                      <span className="text-sm font-black text-mining-gold">
                        {result.throw_distance} m
                      </span>
                      <span className="text-[7.5px] text-gray-500 block mt-0.5">Target: 15-35</span>
                    </div>
                    <div className="bg-black/30 p-2.5 rounded-xl border border-mining-border flex flex-col justify-between">
                      <span className="text-[8px] text-gray-500 block uppercase font-bold">Flyrock Risk</span>
                      <span className={`text-sm font-black ${
                        result.flyrock_risk === 'HIGH' ? 'text-red-400' :
                        result.flyrock_risk === 'MEDIUM' ? 'text-orange-400' : 'text-green-400'
                      }`}>
                        {result.flyrock_risk}
                      </span>
                      <span className="text-[7.5px] text-gray-500 block mt-0.5">Safety zone</span>
                    </div>
                  </div>

                  {/* Warning flags if critical */}
                  {(result.ground_vibration > 15 || result.air_blast > 120 || result.flyrock_risk === 'HIGH') && (
                    <div className="bg-red-950/20 border border-red-800/40 text-red-400 p-3 rounded-xl text-[10px] flex items-start gap-2">
                      <ShieldAlert size={14} className="shrink-0 mt-0.5" />
                      <div>
                        <strong>Safety Alarm Triggered:</strong> Certain metrics exceed thresholds: 
                        {result.ground_vibration > 15 && " PPV ground vibration limit breached."}
                        {result.air_blast > 120 && " High air blast dB noise hazard."}
                        {result.flyrock_risk === 'HIGH' && " Dangerous flyrock projection potential."}
                      </div>
                    </div>
                  )}
                </div>

                {/* Visualizer & Charts */}
                <BlastVisualizer
                  burden={result.burden}
                  spacing={result.spacing}
                  layout={result.hole_layout}
                  delayTiming={result.delay_timing}
                />

                <FragmentationCurve meanSizeCm={result.fragmentation_size} />
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}