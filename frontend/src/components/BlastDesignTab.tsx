import React, { useState } from 'react';
import { Layers, Zap, Info, ShieldAlert, Award, FileSpreadsheet, RefreshCw } from 'lucide-react';
import BlastVisualizer from './BlastVisualizer.tsx';
import FragmentationCurve from './FragmentationCurve.tsx';
import { submitBlastPlan, optimizeBlastParams } from '../api/client.ts';

const initialForm = {
  blast_id: '',
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

export default function BlastDesignTab() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  // Dynamic quick-optimise state
  const [optSuggestions, setOptSuggestions] = useState<any>(null);
  const [loadingOpt, setLoadingOpt] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setForm(prev => {
      const updated = {
        ...prev,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
      };
      return updated;
    });
  };

  const handleOptimize = async () => {
    setLoadingOpt(true);
    try {
      const res = await optimizeBlastParams({
        bench_height: Number(form.bench_height),
        hole_diameter: Number(form.hole_diameter)
      });
      setOptSuggestions(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingOpt(false);
    }
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
    } catch (err: any) {
      setError(err.message || 'Failed to submit blast design plan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Pattern Form Input */}
      <form onSubmit={handleSubmit} className="lg:col-span-5 bg-mining-card border border-mining-border p-6 rounded-2xl flex flex-col gap-5">
        <div>
          <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
            <Layers className="text-mining-accent" /> Blast Pattern &amp; Charging Parameters
          </h2>
          <p className="text-xs text-[var(--text-muted)]">Define drill pattern geometry and explosive charge distribution</p>
        </div>

        {/* Identification */}
        <div className="border-t border-mining-border pt-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[var(--text-muted)] font-semibold">Blast Plan ID</label>
            <input
              type="text"
              name="blast_id"
              value={form.blast_id}
              onChange={handleInputChange}
              required
              placeholder="e.g. PLAN-SEC3-01"
              className="bg-mining-dark border border-mining-border rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-mining-accent"
            />
          </div>
        </div>

        {/* Pattern Designer */}
        <div className="border-t border-mining-border pt-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-semibold text-mining-accent uppercase">1. Pattern Designer</h3>
            <button
              type="button"
              onClick={handleOptimize}
              className="text-[10px] bg-[var(--orange-dim)] hover:bg-[var(--orange-dim)] border border-mining-accent text-mining-gold px-2 py-0.5 rounded flex items-center gap-1 transition-colors"
            >
              <RefreshCw size={10} className={loadingOpt ? "animate-spin" : ""} /> AI Pre-Optimize
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-muted)]">Bench Height (m)</label>
              <input
                type="number" step="0.1" name="bench_height"
                value={form.bench_height} onChange={handleInputChange} required
                className="bg-mining-dark border border-mining-border rounded-lg px-3 py-1.5 text-xs text-[var(--text)] focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-muted)]">Hole Diameter (mm)</label>
              <input
                type="number" name="hole_diameter"
                value={form.hole_diameter} onChange={handleInputChange} required
                className="bg-mining-dark border border-mining-border rounded-lg px-3 py-1.5 text-xs text-[var(--text)] focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-muted)]">Burden (m)</label>
              <input
                type="number" step="0.1" name="burden"
                value={form.burden} onChange={handleInputChange} required
                className="bg-mining-dark border border-mining-border rounded-lg px-3 py-1.5 text-xs text-[var(--text)] focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-muted)]">Spacing (m)</label>
              <input
                type="number" step="0.1" name="spacing"
                value={form.spacing} onChange={handleInputChange} required
                className="bg-mining-dark border border-mining-border rounded-lg px-3 py-1.5 text-xs text-[var(--text)] focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-muted)]">Subdrill (m)</label>
              <input
                type="number" step="0.1" name="subdrill"
                value={form.subdrill} onChange={handleInputChange} required
                className="bg-mining-dark border border-mining-border rounded-lg px-3 py-1.5 text-xs text-[var(--text)] focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-muted)]">Stemming Height (m)</label>
              <input
                type="number" step="0.1" name="stemming_height"
                value={form.stemming_height} onChange={handleInputChange} required
                className="bg-mining-dark border border-mining-border rounded-lg px-3 py-1.5 text-xs text-[var(--text)] focus:outline-none"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--text-muted)]">Drillhole Layout Layout</label>
            <select
              name="hole_layout"
              value={form.hole_layout}
              onChange={handleInputChange}
              className="bg-mining-dark border border-mining-border rounded-lg px-3 py-2 text-xs text-[var(--text)] focus:outline-none"
            >
              <option value="STAGGERED">STAGGERED (Alternate Row Offset)</option>
              <option value="GRID">GRID (Square/Rectangular Columns)</option>
            </select>
          </div>
        </div>

        {/* Charge Calculations */}
        <div className="border-t border-mining-border pt-4">
          <h3 className="text-xs font-semibold text-mining-accent uppercase mb-3">2. Charge Calculation</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-muted)]">Explosive Type</label>
              <select
                name="explosive_type"
                value={form.explosive_type}
                onChange={handleInputChange}
                className="bg-mining-dark border border-mining-border rounded-lg px-3 py-1.5 text-xs text-[var(--text)]"
              >
                <option value="ANFO">ANFO (Dry Holes)</option>
                <option value="EMULSION">EMULSION (Wet Holes / Hard Rock)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-muted)]">Qty Per Hole (kg)</label>
              <input
                type="number" name="explosive_qty"
                value={form.explosive_qty} onChange={handleInputChange} required
                className="bg-mining-dark border border-mining-border rounded-lg px-3 py-1.5 text-xs text-[var(--text)]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-muted)]">Primer Position</label>
              <select
                name="primer_position"
                value={form.primer_position}
                onChange={handleInputChange}
                className="bg-mining-dark border border-mining-border rounded-lg px-3 py-1.5 text-xs text-[var(--text)]"
              >
                <option value="BOTTOM">BOTTOM (Preferred)</option>
                <option value="MIDDLE">MIDDLE</option>
                <option value="TOP">TOP</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-muted)]">Detonation Delay (ms)</label>
              <input
                type="number" name="delay_timing"
                value={form.delay_timing} onChange={handleInputChange} required
                className="bg-mining-dark border border-mining-border rounded-lg px-3 py-1.5 text-xs text-[var(--text)]"
              />
            </div>
          </div>
          <div className="flex justify-between items-center bg-mining-dark border border-mining-border p-3 rounded-lg">
            <span className="text-xs text-[var(--text-muted)]">Deck Charging Configuration</span>
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
          <div className="bg-[var(--red-dim)] border border-[var(--red)] text-[var(--red)] p-3 rounded-lg text-xs">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full btn-neon-yellow py-3 rounded-xl font-bold mt-2"
        >
          {submitting ? 'COMPUTING SIMULATIONS...' : 'GENERATE PLAN & RUN SIMULATION'}
        </button>
      </form>

      {/* Outputs / Dashboard Column */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        {/* AI Pre-Optimize Suggestions (If requested) */}
        {optSuggestions && (
          <div className="bg-mining-card border border-mining-accent p-4 rounded-2xl flex flex-col gap-3">
            <div className="flex items-center gap-2 text-mining-gold">
              <Award size={18} />
              <h3 className="text-xs font-bold uppercase tracking-wider">AI Optimizer Recommendations</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <div className="bg-[var(--panel-raised)] p-2.5 rounded-lg border border-mining-border">
                <span className="text-[9px] text-[var(--text-muted)] block uppercase">Optimal Burden</span>
                <span className="text-sm font-bold text-[var(--text)]">{optSuggestions.opt_burden} m</span>
              </div>
              <div className="bg-[var(--panel-raised)] p-2.5 rounded-lg border border-mining-border">
                <span className="text-[9px] text-[var(--text-muted)] block uppercase">Optimal Spacing</span>
                <span className="text-sm font-bold text-[var(--text)]">{optSuggestions.opt_spacing} m</span>
              </div>
              <div className="bg-[var(--panel-raised)] p-2.5 rounded-lg border border-mining-border">
                <span className="text-[9px] text-[var(--text-muted)] block uppercase">Optimal Hole Depth</span>
                <span className="text-sm font-bold text-[var(--text)]">{optSuggestions.opt_hole_depth} m</span>
              </div>
              <div className="bg-[var(--panel-raised)] p-2.5 rounded-lg border border-mining-border">
                <span className="text-[9px] text-[var(--text-muted)] block uppercase">Powder Factor Target</span>
                <span className="text-sm font-bold text-[var(--text)]">{optSuggestions.opt_powder_factor} kg/m³</span>
              </div>
            </div>
            <div className="text-[11px] text-[var(--text-muted)] flex items-start gap-1">
              <Info size={12} className="text-mining-gold shrink-0 mt-0.5" />
              <span>Recommended parameters are derived from structural engineering rock-shatter guidelines. Apply parameters to form to simulate.</span>
            </div>
          </div>
        )}

        {!result ? (
          <div className="bg-mining-card border border-mining-border p-6 rounded-2xl flex flex-col items-center justify-center text-center h-full min-h-[350px]">
            <Zap size={48} className="text-[var(--text-faint)] mb-3 animate-pulse" />
            <h3 className="text-[var(--text)] font-semibold text-sm">Awaiting Blast Plan Submission</h3>
            <p className="text-xs text-[var(--text-muted)] max-w-[280px] mt-1">Submit pattern and charges to view 2D layouts, delay animation waveforms, and Rosin-Rammler fragmentation curves</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Simulation Results Card */}
            <div className="bg-mining-card border border-mining-border p-6 rounded-2xl flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--text)] uppercase tracking-wider text-mining-accent">3. Blast Simulation Output</h3>
                <p className="text-xs text-[var(--text-muted)]">Calculated impact metrics at 150m monitoring distance</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                <div className="bg-[var(--panel-raised)] p-3 rounded-xl border border-mining-border flex flex-col justify-between">
                  <span className="text-[9px] text-[var(--text-muted)] block uppercase font-bold">Ground PPV</span>
                  <span className={`text-lg font-black ${result.ground_vibration > 15 ? 'text-[var(--red)]' : 'text-[var(--green)]'}`}>
                    {result.ground_vibration} mm/s
                  </span>
                  <span className="text-[8px] text-[var(--text-faint)] block mt-1">Safe Limit: 15</span>
                </div>
                <div className="bg-[var(--panel-raised)] p-3 rounded-xl border border-mining-border flex flex-col justify-between">
                  <span className="text-[9px] text-[var(--text-muted)] block uppercase font-bold">Air Blast Noise</span>
                  <span className={`text-lg font-black ${result.air_blast > 120 ? 'text-[var(--orange)]' : 'text-[var(--green)]'}`}>
                    {result.air_blast} dB
                  </span>
                  <span className="text-[8px] text-[var(--text-faint)] block mt-1">Safe Limit: 120</span>
                </div>
                <div className="bg-[var(--panel-raised)] p-3 rounded-xl border border-mining-border flex flex-col justify-between">
                  <span className="text-[9px] text-[var(--text-muted)] block uppercase font-bold">Throw Distance</span>
                  <span className="text-lg font-black text-mining-gold">
                    {result.throw_distance} m
                  </span>
                  <span className="text-[8px] text-[var(--text-faint)] block mt-1">Ideal: 15 - 35m</span>
                </div>
                <div className="bg-[var(--panel-raised)] p-3 rounded-xl border border-mining-border flex flex-col justify-between">
                  <span className="text-[9px] text-[var(--text-muted)] block uppercase font-bold">Flyrock Risk</span>
                  <span className={`text-lg font-black ${
                    result.flyrock_risk === 'HIGH' ? 'text-[var(--red)]' :
                    result.flyrock_risk === 'MEDIUM' ? 'text-[var(--orange)]' : 'text-[var(--green)]'
                  }`}>
                    {result.flyrock_risk}
                  </span>
                  <span className="text-[8px] text-[var(--text-faint)] block mt-1">Safety zone active</span>
                </div>
              </div>

              {/* Warning flags if critical */}
              {(result.ground_vibration > 15 || result.air_blast > 120 || result.flyrock_risk === 'HIGH') && (
                <div className="bg-[var(--red-dim)] border border-[var(--red)] text-[var(--red)] p-3 rounded-lg text-xs flex items-start gap-2">
                  <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <strong>Safety Alarm Triggered:</strong> Certain calculated metrics exceed environmental regulations.
                    {result.ground_vibration > 15 && " PPV ground vibration exceeds structure thresholds. "}
                    {result.air_blast > 120 && " Air blast dB rating represents noise compliance risk. "}
                    {result.flyrock_risk === 'HIGH' && " High powder factor may produce dangerous flyrock debris."}
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
    </div>
  );
}