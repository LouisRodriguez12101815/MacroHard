"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, Loader2, AlertCircle, MapPin, Tag, CheckCircle } from "lucide-react";

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

interface FiledClaim {
  category: string;
  location: string;
  severity: string;
  summary: string;
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
  const [selectedCategory, setSelectedCategory] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
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

      // If Gemini produced a structured claim, file it
      if (data.claim?.ready) {
        setFiledClaims(prev => [...prev, {
          category: data.claim.category,
          location: data.claim.location,
          severity: data.claim.severity,
          summary: data.claim.summary,
          filedAt: new Date().toISOString(),
        }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'model', text: 'Connection error. Please try again.' }]);
    }
    setIsLoading(false);
  };

  const startWithCategory = (cat: string) => {
    setSelectedCategory(cat);
    sendMessage(`I need to report a ${cat.toLowerCase()} issue.`);
  };

  return (
    <div className="h-full flex bg-slate-950">
      {/* Left: Filed Claims */}
      <div className="w-[300px] border-r border-slate-800 flex flex-col bg-slate-900 shrink-0">
        <div className="p-5 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white">Filed Claims</h2>
          <p className="text-xs text-slate-500 mt-1">{filedClaims.length} reports submitted</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filedClaims.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 text-xs p-4 text-center">
              <AlertCircle className="w-8 h-8 mb-2 opacity-30" />
              <p>No claims filed yet. Use the chat to report an issue.</p>
            </div>
          ) : (
            filedClaims.map((claim, i) => (
              <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
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
                <p className="text-xs text-slate-300 mt-2 line-clamp-2">{claim.summary}</p>
                <div className="flex items-center gap-1 mt-2 text-[10px] text-emerald-400">
                  <CheckCircle className="w-3 h-3" /> Submitted
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right: Gemini Chat */}
      <div className="flex-1 flex flex-col">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" style={{ color: '#FF5F00' }} />
            <h1 className="text-xl font-bold text-white">Report an Issue</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">Describe what you see — our AI assistant will help file your claim.</p>
        </div>

        {/* Category Quick-Start (shown when no messages) */}
        {messages.length === 0 && (
          <div className="p-6">
            <p className="text-sm text-slate-500 mb-3">What type of issue are you reporting?</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => startWithCategory(cat)}
                  className="px-3 py-3 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:text-white hover:border-[#FF5F00]/50 transition-all text-center"
                >
                  <Tag className="w-4 h-4 mx-auto mb-1" style={{ color: '#FF5F00' }} />
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm ${
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
                <span className="text-sm text-slate-400">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe the issue you're seeing..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF5F00] transition-colors"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-4 py-3 rounded-lg text-white font-bold disabled:opacity-30 transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #EB001B, #FF5F00)' }}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
