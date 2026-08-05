import React from 'react';
import { LayoutDashboard, ClipboardList, Flame, BookOpen } from 'lucide-react';

interface CentralHubProps {
  setActiveTab: (tab: 'dashboard' | 'checklist' | 'design' | 'incidents') => void;
  role: string;
}

export default function CentralHub({ setActiveTab, role }: CentralHubProps) {
  return (
    <div className="relative min-h-[82vh] flex flex-col justify-center items-center py-6 px-4 select-none overflow-hidden">
      
      {/* Off-screen Staggered Fly-In & Slow Orbit Styles */}
      <style>{`
        /* Staggered entry: Fly up from off-screen bottom with elastic bounce */
        @keyframes fly-in-from-bottom {
          0% { transform: translateY(300px) scale(0.4); opacity: 0; }
          75% { transform: translateY(-15px) scale(1.05); opacity: 0.95; }
          100% { transform: translateY(0px) scale(1); opacity: 1; }
        }

        /* Slow, organic drifting loops for liquid float state */
        @keyframes drift-left {
          0% { transform: translate(0px, 0px); }
          33% { transform: translate(-10px, 8px); }
          66% { transform: translate(8px, -6px); }
          100% { transform: translate(0px, 0px); }
        }
        @keyframes drift-center {
          0% { transform: translate(0px, 0px); }
          50% { transform: translate(6px, -12px); }
          100% { transform: translate(0px, 0px); }
        }
        @keyframes drift-right {
          0% { transform: translate(0px, 0px); }
          40% { transform: translate(10px, 10px); }
          75% { transform: translate(-8px, -5px); }
          100% { transform: translate(0px, 0px); }
        }
        
        /* Staggered delayed configurations */
        .bubble-anim-left {
          opacity: 0;
          animation: 
            fly-in-from-bottom 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) 1.5s forwards, 
            drift-left 9s ease-in-out 2.3s infinite;
        }
        .bubble-anim-center {
          opacity: 0;
          animation: 
            fly-in-from-bottom 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) 1.8s forwards, 
            drift-center 8s ease-in-out 2.6s infinite;
        }
        .bubble-anim-right {
          opacity: 0;
          animation: 
            fly-in-from-bottom 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) 2.1s forwards, 
            drift-right 10s ease-in-out 2.9s infinite;
        }
      `}</style>

      {/* Header and Title */}
      <div className="text-center z-10 mb-8 max-w-2xl reveal-on-mount animate-fade-in">
        <span className="text-mining-accent text-xs font-bold font-mono tracking-widest uppercase bg-mining-accent/10 border border-mining-accent/20 px-3 py-1 rounded-full">
          AI-Powered Mining Control Deck
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-3 font-display tracking-wide uppercase">
          System Decision Vector
        </h2>
        <p className="text-[11px] text-gray-400 mt-2 font-sans font-semibold">
          Select an operations node to initialize telemetry. Core safety controls are verified by the rule engine.
        </p>
      </div>

      {/* Grid Container */}
      <div className="w-full max-w-3xl flex flex-col items-center gap-10 z-10">
        
        {/* ROW 1: Center Hero Card (Safety Blast Checker) */}
        <div className="w-full flex justify-center reveal-on-mount" style={{ animationDelay: '100ms' }}>
          <div 
            onClick={() => setActiveTab('checklist')}
            className="w-full max-w-lg bg-mining-card border-2 border-mining-accent/50 p-6 rounded-3xl flex flex-col justify-between group cursor-pointer hover:border-mining-accent hover:shadow-[0_0_35px_rgba(255,90,31,0.25)] transition-all duration-300 border-l-4 border-l-mining-accent border-r-4 border-r-mining-accent"
          >
            <div className="flex gap-4 items-start">
              <div className="h-12 w-12 bg-mining-accent/15 border border-mining-accent/40 rounded-2xl flex items-center justify-center text-mining-gold group-hover:scale-110 transition-transform shrink-0">
                <ClipboardList size={24} />
              </div>
              <div className="flex-1">
                <span className="text-[8px] text-mining-gold font-bold font-mono tracking-widest uppercase border border-mining-accent/30 px-2 py-0.5 rounded bg-mining-accent/5">
                  Primary Control Node
                </span>
                <h3 className="text-lg font-black text-white mt-1.5 tracking-wide font-display">
                  Safety Blast Checker
                </h3>
                <p className="text-[9px] text-gray-500 font-mono uppercase tracking-widest mt-0.5">
                  Core Risk Scoring Engine
                </p>
                <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                  Submit pre-blast checklists, fetch dynamic browser GPS meteorological sensors, and auto-detect 18 rule exceptions.
                </p>
              </div>
            </div>
            <div className="text-[10px] font-mono text-mining-accent font-black tracking-widest uppercase pt-3.5 mt-4 border-t border-mining-border/50 flex justify-between items-center">
              <span>Initialize Pre-Blast Safety Core</span>
              <span>➔</span>
            </div>
          </div>
        </div>

        {/* ROW 2: 3 Floating Circles/Bubbles Orbiting Below */}
        <div className="w-full flex flex-col md:flex-row items-center justify-center gap-8 md:gap-14 mt-4">
          
          {/* Card 1: Dashboard Bubble */}
          <div className="bubble-anim-left">
            <div 
              onClick={() => setActiveTab('dashboard')}
              className="w-44 h-44 rounded-full bg-mining-card border border-[#00ccff]/30 flex flex-col items-center justify-center text-center p-4 group cursor-pointer hover:border-[#00ccff] hover:shadow-[0_0_30px_rgba(0,204,255,0.22)] transition-all duration-300 border-t-4 border-t-[#00ccff] relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-[#00ccff]/5 to-transparent pointer-events-none" />
              <div className="flex flex-col items-center gap-1.5 z-10">
                <div className="h-8 w-8 bg-[#00ccff]/10 border border-[#00ccff]/35 rounded-full flex items-center justify-center text-[#00ccff] group-hover:scale-110 transition-transform">
                  <LayoutDashboard size={15} />
                </div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider group-hover:text-[#00ccff] transition-colors font-display">
                  Dashboard
                </h4>
                <p className="text-[9px] text-gray-400 font-sans px-1 leading-normal">
                  KPI Analytics &amp; Safety Graphs
                </p>
              </div>
              <span className="text-[7.5px] font-mono text-[#00ccff] font-bold tracking-widest uppercase mt-2.5 z-10 group-hover:translate-y-0.5 transition-transform">
                OPEN ➔
              </span>
            </div>
          </div>

          {/* Card 2: Blast Prediction / Optimizer Bubble */}
          <div className="bubble-anim-center">
            <div 
              onClick={() => setActiveTab('design')}
              className="w-44 h-44 rounded-full bg-mining-card border border-[#a855f7]/30 flex flex-col items-center justify-center text-center p-4 group cursor-pointer hover:border-[#a855f7] hover:shadow-[0_0_30px_rgba(168,85,247,0.22)] transition-all duration-300 border-t-4 border-t-[#a855f7] relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-[#a855f7]/5 to-transparent pointer-events-none" />
              <div className="flex flex-col items-center gap-1.5 z-10">
                <div className="h-8 w-8 bg-[#a855f7]/10 border border-[#a855f7]/35 rounded-full flex items-center justify-center text-[#a855f7] group-hover:scale-110 transition-transform">
                  <Flame size={15} />
                </div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider group-hover:text-[#a855f7] transition-colors font-display">
                  Optimizer
                </h4>
                <p className="text-[9px] text-gray-400 font-sans px-1 leading-normal">
                  GIS Maps &amp; Design Simulator
                </p>
              </div>
              <span className="text-[7.5px] font-mono text-[#a855f7] font-bold tracking-widest uppercase mt-2.5 z-10 group-hover:translate-y-0.5 transition-transform">
                OPEN ➔
              </span>
            </div>
          </div>

          {/* Card 3: Safety Diary Bubble */}
          <div className="bubble-anim-right">
            <div 
              onClick={() => setActiveTab('incidents')}
              className="w-44 h-44 rounded-full bg-mining-card border border-[#ffcc00]/30 flex flex-col items-center justify-center text-center p-4 group cursor-pointer hover:border-[#ffcc00] hover:shadow-[0_0_30px_rgba(255,204,0,0.22)] transition-all duration-300 border-t-4 border-t-[#ffcc00] relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-[#ffcc00]/5 to-transparent pointer-events-none" />
              <div className="flex flex-col items-center gap-1.5 z-10">
                <div className="h-8 w-8 bg-[#ffcc00]/10 border border-[#ffcc00]/35 rounded-full flex items-center justify-center text-[#ffcc00] group-hover:scale-110 transition-transform">
                  <BookOpen size={15} />
                </div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider group-hover:text-[#ffcc00] transition-colors font-display">
                  Safety Diary
                </h4>
                <p className="text-[9px] text-gray-400 font-sans px-1 leading-normal">
                  Log Audit &amp; Event Register
                </p>
              </div>
              <span className="text-[7.5px] font-mono text-[#ffcc00] font-bold tracking-widest uppercase mt-2.5 z-10 group-hover:translate-y-0.5 transition-transform">
                OPEN ➔
              </span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
