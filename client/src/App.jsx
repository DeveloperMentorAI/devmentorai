import { useState, useEffect, useRef } from "react";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const SESSION_ID = "user-" + Math.random().toString(36).slice(2, 8);

// ── Markdown renderer ────────────────────────────────────────────────────────
function renderMarkdown(text) {
  const lines = text.split("\n");
  const els = [];
  let i = 0, k = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const code = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) { code.push(lines[i]); i++; }
      els.push(
        <div key={k++} style={{ margin: "14px 0", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
          {lang && <div style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8", fontSize: "11px", padding: "6px 14px", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{lang}</div>}
          <pre style={{ background: "rgba(0,0,0,0.4)", color: "#e2e8f0", padding: "16px", margin: 0, overflowX: "auto", fontSize: "13px", lineHeight: "1.75", fontFamily: "'JetBrains Mono','Fira Code',monospace" }}>
            <code>{code.join("\n")}</code>
          </pre>
        </div>
      );
      i++; continue;
    }
    if (line.startsWith("### ")) els.push(<h3 key={k++} style={{ margin: "14px 0 5px", fontSize: "14px", color: "#f1f5f9", fontWeight: 700 }}>{line.slice(4)}</h3>);
    else if (line.startsWith("## ")) els.push(<h2 key={k++} style={{ margin: "16px 0 6px", fontSize: "16px", color: "#f1f5f9", fontWeight: 700 }}>{line.slice(3)}</h2>);
    else if (line.startsWith("# ")) els.push(<h1 key={k++} style={{ margin: "18px 0 8px", fontSize: "19px", color: "#f8fafc", fontWeight: 800 }}>{line.slice(2)}</h1>);
    else if (line.startsWith("- ") || line.startsWith("* "))
      els.push(<div key={k++} style={{ display: "flex", gap: "10px", margin: "4px 0", alignItems: "flex-start" }}><span style={{ color: "#38bdf8", flexShrink: 0, marginTop: "4px" }}>›</span><span style={{ color: "#cbd5e1" }}>{inlineFmt(line.slice(2))}</span></div>);
    else if (line.trim() === "") els.push(<div key={k++} style={{ height: "10px" }} />);
    else els.push(<p key={k++} style={{ margin: "4px 0", lineHeight: "1.8", color: "#cbd5e1" }}>{inlineFmt(line)}</p>);
    i++;
  }
  return els;
}

function inlineFmt(text) {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g).map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} style={{ color: "#f1f5f9", fontWeight: 700 }}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*")) return <em key={i} style={{ color: "#94a3b8" }}>{p.slice(1, -1)}</em>;
    if (p.startsWith("`") && p.endsWith("`")) return <code key={i} style={{ background: "rgba(56,189,248,0.15)", color: "#38bdf8", padding: "1px 7px", borderRadius: "5px", fontFamily: "monospace", fontSize: "12.5px" }}>{p.slice(1, -1)}</code>;
    return p;
  });
}

// ── Copy button for code ────────────────────────────────────────────────────

export default function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState("");
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("openai/gpt-4o-mini");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hoveredMsg, setHoveredMsg] = useState(null);
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    fetch(`${API_URL}/models`)
      .then(r => r.json())
      .then(d => setModels(d.models || []))
      .catch(() => { });
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const handleGenerate = async () => {
    const msg = input.trim();
    if (!msg || loading) return;

    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setInput("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    setLoading(true);
    setStreaming("");

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: msg,
          sessionId: SESSION_ID,
          model: selectedModel,
        }),
      });
      if (!res.ok) throw new Error();
      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n").filter(l => l.startsWith("data:"))) {
          const raw = line.replace(/^data:\s*/, "");
          try {
            const p = JSON.parse(raw);
            if (p.error) { full = "⚠ " + p.error; setStreaming(full); break; }
            if (p.token) { full += p.token; setStreaming(full); }
            if (p.done) { setMessages(prev => [...prev, { role: "assistant", content: full }]); setStreaming(""); }
          } catch (_) { }
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠ Failed to connect. Is the backend running on port 5000?" }]);
      setStreaming("");
    } finally { setLoading(false); }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerate(); }
  };

  const clearChat = () => {
    fetch(`http://localhost:5000/history/${SESSION_ID}`, { method: "DELETE" });
    setMessages([]); setStreaming("");
  };

  const userMsgs = messages.filter(m => m.role === "user");
  const modelLabel = models.find(m => m.id === selectedModel)?.label || "GPT-4o Mini";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #060910;
          --surface: rgba(255,255,255,0.04);
          --surface-hover: rgba(255,255,255,0.07);
          --border: rgba(255,255,255,0.08);
          --border-bright: rgba(255,255,255,0.14);
          --accent: #38bdf8;
          --accent2: #818cf8;
          --text-primary: #f1f5f9;
          --text-secondary: #64748b;
          --text-muted: #334155;
          --sidebar-w: 300px;
        }

        html, body, #root {
          width: 100%; height: 100%; overflow: hidden;
          font-family: 'Plus Jakarta Sans', sans-serif;
          background: var(--bg); color: var(--text-primary);
        }

        ::-webkit-scrollbar { width: 3px; height: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }

        textarea { font-family: 'Plus Jakarta Sans', sans-serif; }
        textarea:focus, select:focus, button:focus { outline: none; }

        @keyframes fadeUp   { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
        @keyframes blink    { 0%,100% { opacity:1; } 50% { opacity:0; } }
        @keyframes spin     { to { transform:rotate(360deg); } }
        @keyframes pulse    { 0%,100% { transform:scale(1); opacity:.7; } 50% { transform:scale(1.15); opacity:1; } }
        @keyframes orb1     { 0%,100% { transform:translate(0,0) scale(1); } 50% { transform:translate(60px,-40px) scale(1.1); } }
        @keyframes orb2     { 0%,100% { transform:translate(0,0) scale(1.05); } 50% { transform:translate(-50px,30px) scale(0.95); } }
        @keyframes dotBounce { 0%,80%,100% { transform:translateY(0); opacity:.4; } 40% { transform:translateY(-5px); opacity:1; } }
        @keyframes shimmer  { from { background-position: -200% center; } to { background-position: 200% center; } }
        @keyframes slideIn  { from { opacity:0; transform:translateX(-16px); } to { opacity:1; transform:translateX(0); } }

        .msg-in  { animation: fadeUp .28s cubic-bezier(.16,1,.3,1); }
        .sidebar-item { transition: background .15s, border-color .15s; }
        .sidebar-item:hover { background: var(--surface-hover) !important; border-color: var(--border-bright) !important; }
        .send-btn:not(:disabled):hover { filter: brightness(1.15); transform: scale(1.05); }
        .send-btn { transition: all .15s; }
        .model-opt:hover { background: rgba(56,189,248,0.1) !important; }

        .gradient-text {
          background: linear-gradient(135deg, #38bdf8, #818cf8, #f472b6);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .input-wrap:focus-within {
          border-color: rgba(56,189,248,0.5) !important;
          box-shadow: 0 0 0 3px rgba(56,189,248,0.08);
        }
      `}</style>

      {/* Ambient orbs */}
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-10%", right: "15%", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(56,189,248,0.06) 0%, transparent 70%)", animation: "orb1 18s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "-5%", left: "20%", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(129,140,248,0.07) 0%, transparent 70%)", animation: "orb2 22s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: "40%", left: "45%", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle, rgba(244,114,182,0.04) 0%, transparent 70%)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, display: "flex", width: "100vw", height: "100vh", overflow: "hidden" }}>

        {/* ══════════════════ SIDEBAR ══════════════════ */}
        <aside style={{
          width: sidebarOpen ? "var(--sidebar-w)" : "0px",
          minWidth: sidebarOpen ? "var(--sidebar-w)" : "0px",
          transition: "all .35s cubic-bezier(.4,0,.2,1)",
          overflow: "hidden",
          background: "rgba(255,255,255,0.025)",
          backdropFilter: "blur(24px)",
          borderRight: "1px solid var(--border)",
          display: "flex", flexDirection: "column",
          flexShrink: 0,
        }}>

          {/* Sidebar header */}
          <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "linear-gradient(135deg,#38bdf8,#818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", flexShrink: 0 }}>✦</div>
              <span style={{ fontWeight: 800, fontSize: "15px", letterSpacing: "-0.02em" }} className="gradient-text">Neural Chat</span>
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "6px", marginLeft: "38px" }}>Session · <span style={{ color: "#38bdf8", fontFamily: "monospace" }}>{SESSION_ID}</span></div>
          </div>

          {/* New chat + clear */}
          <div style={{ padding: "14px 16px 10px", flexShrink: 0 }}>
            <button onClick={clearChat} style={{ width: "100%", padding: "9px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", color: "var(--text-primary)", cursor: "pointer", fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px", fontFamily: "Plus Jakarta Sans, sans-serif", transition: "all .15s" }}
              onMouseOver={e => e.currentTarget.style.background = "var(--surface-hover)"}
              onMouseOut={e => e.currentTarget.style.background = "var(--surface)"}
            >
              <span style={{ fontSize: "16px", lineHeight: 1 }}>+</span> New conversation
            </button>
          </div>

          {/* History label */}
          <div style={{ padding: "4px 20px 8px", flexShrink: 0 }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.12em", textTransform: "uppercase" }}>Recent</span>
          </div>

          {/* History list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0 10px 16px" }}>
            {userMsgs.length === 0
              ? <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "13px", marginTop: "32px", lineHeight: 1.6 }}>
                <div style={{ fontSize: "24px", marginBottom: "8px", opacity: .4 }}>💬</div>
                Start a conversation
              </div>
              : [...userMsgs].reverse().map((m, i) => (
                <div key={i} className="sidebar-item" style={{ padding: "10px 12px", borderRadius: "10px", marginBottom: "4px", background: i === 0 ? "rgba(56,189,248,0.06)" : "transparent", border: `1px solid ${i === 0 ? "rgba(56,189,248,0.2)" : "transparent"}`, cursor: "default" }}>
                  <div style={{ fontSize: "13px", color: i === 0 ? "#e2e8f0" : "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: "1.45" }}>{m.content}</div>
                </div>
              ))
            }
          </div>

          {/* Sidebar footer */}
          <div style={{ padding: "14px 16px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: "12px", color: "#64748b" }}>Backend connected · port 5000</span>
            </div>
          </div>
        </aside>

        {/* ══════════════════ MAIN ══════════════════ */}
        <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

          {/* Top bar */}
          <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", height: "64px", background: "rgba(6,9,16,0.7)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              {/* Hamburger */}
              <button onClick={() => setSidebarOpen(v => !v)} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", width: "38px", height: "38px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px", transition: "all .15s" }}
                onMouseOver={e => e.currentTarget.style.background = "var(--surface-hover)"}
                onMouseOut={e => e.currentTarget.style.background = "var(--surface)"}
              >
                {[0, 1, 2].map(i => <div key={i} style={{ width: "14px", height: "1.5px", background: "#94a3b8", borderRadius: "2px" }} />)}
              </button>

              <div style={{ width: "1px", height: "28px", background: "var(--border)" }} />

              <div>
                <div style={{ fontWeight: 800, fontSize: "16px", letterSpacing: "-0.03em" }} className="gradient-text">DevMentor AI</div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "1px" }}>
                  {loading ? <span style={{ color: "#38bdf8" }}>● Generating…</span> : `${messages.filter(m => m.role === "assistant").length} responses · ${modelLabel}`}
                </div>
              </div>
            </div>

            {/* Model picker */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ position: "relative", display: "flex", alignItems: "center", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "8px 14px", gap: "10px", cursor: "pointer" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "linear-gradient(135deg,#38bdf8,#818cf8)", flexShrink: 0 }} />
                <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} style={{ background: "transparent", border: "none", color: "var(--text-primary)", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "Plus Jakarta Sans, sans-serif", appearance: "none", paddingRight: "18px" }}>
                  {models.length > 0
                    ? models.map(m => <option key={m.id} value={m.id} style={{ background: "#0f172a" }}>{m.label}</option>)
                    : <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
                  }
                </select>
                <div style={{ position: "absolute", right: "12px", color: "#64748b", fontSize: "10px", pointerEvents: "none" }}>▾</div>
              </div>
            </div>
          </header>

          {/* ── Chat area ── */}
          <div style={{ flex: 1, overflowY: "auto", padding: "36px 0" }}>
            <div style={{ maxWidth: "820px", margin: "0 auto", padding: "0 32px", display: "flex", flexDirection: "column", gap: "28px" }}>

              {/* Empty state */}
              {messages.length === 0 && !streaming && (
                <div style={{ textAlign: "center", padding: "80px 0 40px", animation: "fadeIn .5s ease" }}>
                  <div style={{ width: "72px", height: "72px", borderRadius: "20px", background: "linear-gradient(135deg,rgba(56,189,248,0.2),rgba(129,140,248,0.2))", border: "1px solid rgba(56,189,248,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", margin: "0 auto 24px" }}>✦</div>
                  <h2 style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: "10px" }} className="gradient-text">What can I help with?</h2>
                  <p style={{ color: "var(--text-secondary)", fontSize: "15px", maxWidth: "400px", margin: "0 auto", lineHeight: 1.6 }}>Ask me anything — code, concepts, analysis, writing, math, or just a conversation.</p>
                  <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "32px", flexWrap: "wrap" }}>
                    {["Explain async/await", "Debug my code", "Write a SQL query", "Explain a concept"].map((s, i) => (
                      <button key={i} onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                        style={{ padding: "8px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "20px", color: "#94a3b8", fontSize: "13px", cursor: "pointer", fontFamily: "Plus Jakarta Sans, sans-serif", transition: "all .15s" }}
                        onMouseOver={e => { e.currentTarget.style.background = "var(--surface-hover)"; e.currentTarget.style.color = "#e2e8f0"; }}
                        onMouseOut={e => { e.currentTarget.style.background = "var(--surface)"; e.currentTarget.style.color = "#94a3b8"; }}
                      >{s}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              {messages.map((m, i) => (
                <div key={i} className="msg-in" style={{ display: "flex", gap: "16px", alignItems: "flex-start", flexDirection: m.role === "user" ? "row-reverse" : "row" }}
                  onMouseEnter={() => setHoveredMsg(i)} onMouseLeave={() => setHoveredMsg(null)}
                >
                  {/* Avatar */}
                  <div style={{ flexShrink: 0, width: "36px", height: "36px", borderRadius: m.role === "user" ? "12px" : "50%", background: m.role === "user" ? "linear-gradient(135deg,#1e293b,#334155)" : "linear-gradient(135deg,#38bdf8,#818cf8)", border: m.role === "user" ? "1px solid var(--border)" : "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: m.role === "user" ? "14px" : "15px", marginTop: "2px", boxShadow: m.role === "assistant" ? "0 0 20px rgba(56,189,248,0.25)" : "none" }}>
                    {m.role === "user" ? "U" : "✦"}
                  </div>

                  {/* Bubble */}
                  <div style={{ maxWidth: "calc(100% - 60px)", minWidth: 0 }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "8px", textAlign: m.role === "user" ? "right" : "left" }}>
                      {m.role === "user" ? "You" : modelLabel}
                    </div>
                    <div style={{
                      padding: m.role === "user" ? "12px 18px" : "18px 22px",
                      background: m.role === "user"
                        ? "linear-gradient(135deg, rgba(56,189,248,0.15), rgba(129,140,248,0.15))"
                        : "rgba(255,255,255,0.04)",
                      border: `1px solid ${m.role === "user" ? "rgba(56,189,248,0.25)" : "var(--border)"}`,
                      borderRadius: m.role === "user" ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
                      fontSize: "14.5px", lineHeight: "1.75",
                      backdropFilter: "blur(8px)",
                      boxShadow: m.role === "assistant" ? "0 4px 24px rgba(0,0,0,0.2)" : "none",
                    }}>
                      {m.role === "assistant" ? renderMarkdown(m.content) : <span style={{ color: "#e2e8f0" }}>{m.content}</span>}
                    </div>
                  </div>
                </div>
              ))}

              {/* Streaming bubble */}
              {streaming && (
                <div className="msg-in" style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                  <div style={{ flexShrink: 0, width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg,#38bdf8,#818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", marginTop: "2px", boxShadow: "0 0 20px rgba(56,189,248,0.3)" }}>✦</div>
                  <div style={{ maxWidth: "calc(100% - 60px)" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "8px" }}>{modelLabel}</div>
                    <div style={{ padding: "18px 22px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "4px 18px 18px 18px", fontSize: "14.5px", lineHeight: "1.75", backdropFilter: "blur(8px)", boxShadow: "0 4px 24px rgba(0,0,0,0.2)" }}>
                      {renderMarkdown(streaming)}
                      <span style={{ display: "inline-block", color: "#38bdf8", animation: "blink .8s infinite", marginLeft: "2px", fontWeight: 700 }}>▌</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Thinking dots */}
              {loading && !streaming && (
                <div className="msg-in" style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                  <div style={{ flexShrink: 0, width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg,#38bdf8,#818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", boxShadow: "0 0 20px rgba(56,189,248,0.3)" }}>✦</div>
                  <div style={{ padding: "16px 20px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "4px 18px 18px 18px", display: "flex", gap: "6px", alignItems: "center" }}>
                    {[0, 0.18, 0.36].map((d, i) => (
                      <div key={i} style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#38bdf8", animation: `dotBounce 1.2s ${d}s ease-in-out infinite` }} />
                    ))}
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          </div>

          {/* ── Input bar ── */}
          <footer style={{ padding: "16px 32px 24px", background: "rgba(6,9,16,0.8)", backdropFilter: "blur(24px)", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
            <div style={{ maxWidth: "820px", margin: "0 auto" }}>
              <div className="input-wrap" style={{ display: "flex", gap: "12px", alignItems: "flex-end", background: "rgba(255,255,255,0.05)", borderRadius: "18px", padding: "12px 12px 12px 20px", border: "1px solid var(--border)", transition: "all .2s" }}>
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={e => {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  placeholder="Ask anything…"
                  style={{ flex: 1, border: "none", background: "transparent", resize: "none", fontSize: "15px", lineHeight: "1.55", color: "var(--text-primary)", maxHeight: "160px", overflowY: "auto", paddingTop: "3px" }}
                />

                {/* Char count + send */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                  {input.length > 0 && <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{input.length}</span>}
                  <button className="send-btn" onClick={handleGenerate} disabled={loading || !input.trim()}
                    style={{ width: "42px", height: "42px", borderRadius: "12px", border: "none", flexShrink: 0, background: (!input.trim() || loading) ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg,#38bdf8,#818cf8)", color: (!input.trim() || loading) ? "var(--text-muted)" : "white", cursor: (!input.trim() || loading) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", boxShadow: (!input.trim() || loading) ? "none" : "0 4px 16px rgba(56,189,248,0.4)" }}
                  >
                    {loading
                      ? <div style={{ width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
                      : <span style={{ marginTop: "-1px" }}>↑</span>
                    }
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", padding: "0 4px" }}>
                <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                  <kbd style={{ background: "rgba(255,255,255,0.07)", border: "1px solid var(--border)", borderRadius: "4px", padding: "1px 5px", fontSize: "10px" }}>Enter</kbd> send &nbsp;·&nbsp;
                  <kbd style={{ background: "rgba(255,255,255,0.07)", border: "1px solid var(--border)", borderRadius: "4px", padding: "1px 5px", fontSize: "10px" }}>Shift+Enter</kbd> newline
                </span>
                <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                  {messages.length > 0 && `${Math.ceil(messages.reduce((a, m) => a + m.content.length, 0) / 4)} tokens used`}
                </span>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </>
  );
}
