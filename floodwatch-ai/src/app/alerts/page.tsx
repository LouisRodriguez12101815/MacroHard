"use client";

import { useState } from "react";
import { useRealtime } from "@/context/RealtimeContext";
import { AlertTriangle, MapPin, Send, Zap, Loader2, Sparkles, X } from "lucide-react";

interface DraftedAlert {
  id: string;
  message: string;
  zone: string;
  severity: string;
  sensorContext: string;
  issuedAt: string;
  status: 'DRAFT' | 'PUBLISHED';
}

export default function AlertsView() {
  const { state } = useRealtime();
  const [showModal, setShowModal] = useState(false);
  const [zone, setZone] = useState('Brickell / Downtown');
  const [severity, setSeverity] = useState('Moderate');
  const [isGenerating, setIsGenerating] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [sensorContext, setSensorContext] = useState('');
  const [localAlerts, setLocalAlerts] = useState<DraftedAlert[]>([]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setDraftText('');
    try {
      const res = await fetch('/api/alerts/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zone, severity }),
      });
      const data = await res.json();
      setDraftText(data.draft || 'Failed to generate draft.');
      setSensorContext(data.sensorContext || '');
    } catch {
      setDraftText('Error connecting to Gemini. Please check your API key.');
    }
    setIsGenerating(false);
  };

  const handlePublish = () => {
    const newAlert: DraftedAlert = {
      id: `alert-${Date.now()}`,
      message: draftText,
      zone,
      severity,
      sensorContext,
      issuedAt: new Date().toISOString(),
      status: 'PUBLISHED',
    };
    setLocalAlerts(prev => [newAlert, ...prev]);
    setShowModal(false);
    setDraftText('');
  };

  const allAlerts = [
    ...localAlerts,
    ...state.alerts.map(a => ({
      id: a.id, message: a.message, zone: 'Miami-Dade', severity: 'High',
      sensorContext: '', issuedAt: a.issuedAt, status: a.status as 'DRAFT' | 'PUBLISHED',
    })),
  ];

  return (
    <div className="p-8 h-full flex flex-col bg-slate-950">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Citizen Alerts</h1>
          <p className="text-slate-400">AI-drafted emergency notifications powered by live sensor data.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="text-white px-4 py-2 rounded-lg font-medium shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2 hover:scale-105" style={{ background: 'linear-gradient(135deg, #EB001B, #FF5F00)' }}>
          <Sparkles className="w-4 h-4" /> Create AI Alert
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-8">
        {allAlerts.length === 0 ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-500 rounded-xl border border-slate-800 border-dashed">
            <AlertTriangle className="w-10 h-10 opacity-30 mb-3" />
            <p>No active alerts. Click &quot;Create AI Alert&quot; to draft one from live sensor data.</p>
          </div>
        ) : (
          allAlerts.map((alert) => (
            <div key={alert.id} className="bg-slate-900 border border-[#FF5F00]/30 rounded-xl flex flex-col overflow-hidden shadow-xl">
              <div className="border-b border-[#FF5F00]/20 px-5 py-3 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, rgba(235,0,27,0.1), rgba(255,95,0,0.1))' }}>
                <span className="flex items-center gap-2 font-bold text-sm tracking-widest uppercase" style={{ color: '#FF5F00' }}>
                  <AlertTriangle className="w-4 h-4" /> {alert.severity} Alert
                </span>
                <span className="text-xs font-semibold text-slate-400">{new Date(alert.issuedAt).toLocaleTimeString()}</span>
              </div>
              <div className="p-5 flex-1">
                <p className="text-slate-200 text-sm leading-relaxed mb-4">{alert.message}</p>
                <div className="flex flex-wrap gap-2">
                  <div className="bg-slate-800 text-slate-300 text-xs px-2.5 py-1 rounded-md flex items-center gap-1.5 font-medium border border-slate-700">
                    <MapPin className="w-3.5 h-3.5" style={{ color: '#FF5F00' }} /> {alert.zone}
                  </div>
                  <div className="bg-slate-800 text-slate-300 text-xs px-2.5 py-1 rounded-md flex items-center gap-1.5 font-medium border border-slate-700">
                    <Zap className="w-3.5 h-3.5" style={{ color: '#F79E1B' }} /> {alert.status}
                  </div>
                </div>
              </div>
              {alert.sensorContext && (
                <div className="px-5 py-3 bg-slate-950 border-t border-slate-800">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Sensor Context</p>
                  <pre className="text-[10px] font-mono text-slate-400 whitespace-pre-wrap">{alert.sensorContext}</pre>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" style={{ color: '#FF5F00' }} />
                <h2 className="text-lg font-bold text-white">Draft Alert with Gemini AI</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Zone</label>
                  <select value={zone} onChange={(e) => setZone(e.target.value)} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF5F00]">
                    <option>Brickell / Downtown</option>
                    <option>Wynwood / The LAB</option>
                    <option>Key Biscayne / Stiltsville</option>
                    <option>Miami Beach</option>
                    <option>Miami-Dade County</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Severity</label>
                  <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF5F00]">
                    <option>Low</option><option>Moderate</option><option>High</option><option>Critical</option>
                  </select>
                </div>
              </div>
              <button onClick={handleGenerate} disabled={isGenerating} className="w-full py-3 rounded-lg text-white font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #EB001B, #FF5F00, #F79E1B)' }}>
                {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Gemini is analyzing sensors...</> : <><Sparkles className="w-4 h-4" /> Generate Alert from Live Sensors</>}
              </button>
              {draftText && (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">AI-Generated Draft (editable)</label>
                  <textarea value={draftText} onChange={(e) => setDraftText(e.target.value)} rows={5} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF5F00] resize-none" />
                  {sensorContext && (
                    <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Sensor Data Used</p>
                      <pre className="text-[10px] font-mono text-emerald-400 whitespace-pre-wrap">{sensorContext}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
            {draftText && (
              <div className="px-6 py-4 border-t border-slate-800 flex gap-3 justify-end">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-700">Cancel</button>
                <button onClick={handlePublish} className="px-6 py-2 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:scale-105 transition-all" style={{ background: 'linear-gradient(135deg, #EB001B, #FF5F00)' }}>
                  <Send className="w-4 h-4" /> Broadcast Alert
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
