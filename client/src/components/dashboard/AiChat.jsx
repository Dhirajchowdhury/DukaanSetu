import { useState, useRef, useEffect } from 'react';
import api from '../../services/api';
import { FiMessageCircle, FiX, FiSend, FiCpu } from 'react-icons/fi';

const AiChat = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Hi! I\'m your AI business assistant. Ask me anything about your inventory, sales, or business.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      const { data } = await api.post('/ai/chat', { message: msg });
      setMessages(prev => [...prev, { role: 'ai', text: data.reply || 'AI suggestions unavailable — try again.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'AI suggestions unavailable — try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
            width: 56, height: 56, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff', border: 'none', cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24,
          }}
          className="hover:scale-110 transition-transform"
        >
          <FiMessageCircle />
        </button>
      )}

      {open && (
        <div
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
            width: 380, maxWidth: 'calc(100vw - 32px)',
            height: 520, maxHeight: 'calc(100vh - 120px)',
            background: '#fff', borderRadius: 20,
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            display: 'flex', flexDirection: 'column',
            border: '1px solid #e2e8f0', overflow: 'hidden',
          }}
        >
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FiCpu size={20} />
              <span style={{ fontWeight: 700, fontSize: 15 }}>AI Assistant</span>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 20, display: 'flex' }}>
              <FiX />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                maxWidth: '85%',
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                padding: '10px 14px',
                borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: m.role === 'user' ? '#6366f1' : '#f1f5f9',
                color: m.role === 'user' ? '#fff' : '#1e293b',
                fontSize: 13,
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
              }}>
                {m.text}
              </div>
            ))}
            {loading && (
              <div style={{
                alignSelf: 'flex-start', padding: '10px 14px',
                borderRadius: '16px 16px 16px 4px',
                background: '#f1f5f9', color: '#94a3b8', fontSize: 13,
              }}>
                <span className="animate-pulse">Thinking...</span>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
              placeholder="Ask about your business..."
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 12, border: '1px solid #e2e8f0',
                fontSize: 13, outline: 'none',
              }}
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              style={{
                width: 40, height: 40, borderRadius: 12, border: 'none',
                background: loading || !input.trim() ? '#e2e8f0' : '#6366f1',
                color: loading || !input.trim() ? '#94a3b8' : '#fff',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16,
              }}
            >
              <FiSend />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AiChat;
