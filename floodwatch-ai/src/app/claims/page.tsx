"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, Loader2, AlertCircle, MapPin, Tag, CheckCircle, Search, Shield, Zap } from "lucide-react";

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

interface SensorEvidence {
  queriedApis: number;
  summary: string;
}

interface FiledClaim {
  category: string;
  location: string;
  severity: string;
  summary: string;
  sensorVerdict?: string;
  evidenceCount?: number;
  filedAt: string;
}

const CATEGORIES = [
  'Flooding', 'Downed Tree', 'Vehicle Accident', 'Storm Drain Clog',
  'Sewer Backup', 'Power Outage', 'Road Hazard', 'Other'
];

export default function ClaimsView() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [filedClaims, setFiledClaims] = useState<FiledClaim[]>([]);
  const [sensorEvidence, setSensorEvidence] = useState<SensorEvidence | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const msgText = text || input.trim();
    if (!msgText) return;

    const userMsg: ChatMessage = { role: 'user', text: msgText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/claims/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();

      const modelMsg: ChatMessage = { role: 'model', text: data.reply || 'Sorry, I had trouble understanding. Could you try again?' };
      setMessages(prev => [...prev, modelMsg]);

      // Store sensor evidence if returned
      if (data.sensorEvidence) {
        setSensorEvidence(data.sensorEvidence);
      }

      // File claim if ready
      if (data.claim?.ready) {
        setFiledClaims(prev => [...prev, {
          category: data.claim.category,
          location: data.claim.location,
          severity: data.claim.severity,
          summary: data.claim.summary,
          sensorVerdict: data.claim.sensorVerdict,
          evidenceCount: data.claim.evidenceCount,
          filedAt: new Date().toISOString(),
        }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'model', text: 'Connection error. Please try again.' }]);
    }
    setIsLoading(false);
  };

  const startWithCategory = (cat: string) => {
    sendMessage(`I need to report a ${cat.toLowerCase()} issue.`);
  };

  const verdictColor = (v?: string) => {
    if (v === 'SUPPORTED') return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' };
    if (v === 'PARTIALLY SUPPORTED') return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400' };
    return { bg: 'bg-slate-800', border: 'border-slate-700', text: 'text-slate-400' };
  };

  return (
    <div className="h-full flex bg-slate-950">
      {/* Left: Filed Claims + Evidence */}
      <div className="w-[320px] border-r border-slate-800 flex flex-col bg-slate-900 shrink-0">
        <div className="p-5 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5" style={{ color: '#FF5F00' }} />
            Evidence & Claims
          </h2>
          <p className="text-xs text-slate-500 mt-1">{filedClaims.length} reports · {sensorEvidence ? `${sensorEvidence.queriedApis} APIs queried` : 'Awaiting claim'}</p>
        </div>

        {/* Sensor Evidence Panel */}
        {sensorEvidence && (
          <div className="border-b border-slate-800 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Search className="w-3.5 h-3.5" style={{ color: '#FF5F00' }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#FF5F00' }}>Live Sensor Evidence</span>
            </div>
            <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 max-h-[300px] overflow-y-auto">
              {sensorEvidence.summary.split('\n').map((line, i) => (
                <div key={i} className="flex items-start gap-2 py-1">
                  <Zap className="w-3 h-3 shrink-0 mt-0.5 text-emerald-500" />
                  <span className="text-[11px] font-mono text-emerald-400">{line}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-600 mt-2 text-center">{sensorEvidence.queriedApis} sensor APIs queried in real time</p>
          </div>
        )}

        {/* Filed Claims List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filedClaims.length === 0 && !sensorEvidence ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 text-xs p-4 text-center">
              <AlertCircle className="w-8 h-8 mb-2 opacity-30" />
              <p>Describe an issue in the chat.</p>
              <p className="mt-1 text-slate-700">The AI will automatically query sensors to verify your claim.</p>
            </div>
          ) : (
            filedClaims.map((claim, i) => {
              const vc = verdictColor(claim.sensorVerdict);
              return (
                <div key={i} className={`rounded-lg p-3 border ${vc.bg} ${vc.border}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded" style={{ color: '#FF5F00', background: 'rgba(255,95,0,0.1)' }}>
                      {claim.category}
                    </span>
                    <span className="text-[10px] text-slate-500">{new Date(claim.filedAt).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                    <MapPin className="w-3 h-3" style={{ color: '#FF5F00' }} />
                    {claim.location}
                  </div>
                  <p className="text-xs text-slate-300 mt-2">{claim.summary}</p>
                  {claim.sensorVerdict && (
                    <div className={`flex items-center gap-1.5 mt-2 text-[10px] font-bold ${vc.text}`}>
                      <CheckCircle className="w-3 h-3" />
                      Sensor Verdict: {claim.sensorVerdict}
                      {claim.evidenceCount && <span className="text-slate-500 font-normal ml-1">({claim.evidenceCount} data points)</span>}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right: Chat */}
      <div className="flex-1 flex flex-col">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" style={{ color: '#FF5F00' }} />
            <h1 className="text-xl font-bold text-white">Report an Issue</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">Describe what you see — our AI will verify it against <span style={{ color: '#FF5F00' }}>10 live sensor APIs</span> and produce an evidence report.</p>
        </div>

        {messages.length === 0 && (
          <div className="p-6">
            <p className="text-sm text-slate-500 mb-3">What type of issue are you reporting?</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => startWithCategory(cat)} className="px-3 py-3 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:text-white hover:border-[#FF5F00]/50 transition-all text-center">
                  <Tag className="w-4 h-4 mx-auto mb-1" style={{ color: '#FF5F00' }} />
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'text-white rounded-br-sm'
                  : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-sm'
              }`}
              style={msg.role === 'user' ? { background: 'linear-gradient(135deg, #EB001B, #FF5F00)' } : undefined}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#FF5F00' }} />
                <span className="text-sm text-slate-400">Querying sensors & analyzing...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Describe the issue you're seeing..." className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF5F00] transition-colors" disabled={isLoading} />
            <button type="submit" disabled={isLoading || !input.trim()} className="px-4 py-3 rounded-lg text-white font-bold disabled:opacity-30 transition-all hover:scale-105" style={{ background: 'linear-gradient(135deg, #EB001B, #FF5F00)' }}>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
