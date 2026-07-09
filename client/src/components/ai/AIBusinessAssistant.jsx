import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { MessageSquare, X, Send, Sparkles, User, Bot, HelpCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AIBusinessAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hello! I am your FreelanceFlow AI Assistant. How can I help you manage projects, analyze budgets, or navigate the platform today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    if (!textToSend) setInput('');

    // Append user message
    const updatedMessages = [...messages, { role: 'user', text }];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      // Limit history to past 5 messages to avoid token bloat
      const history = updatedMessages.slice(-5).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        text: m.text
      }));

      const res = await axios.post(
        `${API_URL}/ai/chatbot`,
        { message: text, history },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        setMessages(prev => [...prev, { role: 'bot', text: res.data.response }]);
      } else {
        setMessages(prev => [...prev, { role: 'bot', text: 'I encountered an issue processing that. Please try again.' }]);
      }
    } catch (err) {
      console.error('Chatbot error:', err);
      setMessages(prev => [...prev, { role: 'bot', text: 'Sorry, I am having trouble connecting right now.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (topic) => {
    handleSend(topic);
  };

  const quickActions = [
    "Explain dashboard insights",
    "Suggest top freelancing skills",
    "Help me write a project description",
    "How do I create a milestone?"
  ];

  return (
    <div className="ai-assistant-container" style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 8px 30px rgba(79, 70, 229, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: 'scale(1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.08)';
            e.currentTarget.style.boxShadow = '0 12px 35px rgba(79, 70, 229, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 8px 30px rgba(79, 70, 229, 0.4)';
          }}
        >
          <Sparkles size={28} />
        </button>
      )}

      {/* Expanded Chat Box */}
      {isOpen && (
        <div
          className="ai-assistant-chat"
          style={{
            width: '380px',
            height: '520px',
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            boxShadow: '0 12px 40px rgba(15, 23, 42, 0.15)',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'slideUp 0.3s ease-out',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '1.25rem 1.5rem',
              background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.5rem', borderRadius: '12px' }}>
                <Sparkles size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>AI Business Partner</h3>
                <span style={{ fontSize: '0.75rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                  Online & Active
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                opacity: 0.8,
                padding: '0.25rem',
                borderRadius: '50%',
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Container */}
          <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  flexDirection: m.role === 'user' ? 'row-reverse' : 'row'
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: m.role === 'user' ? '#eff6ff' : '#e0e7ff',
                    color: m.role === 'user' ? '#2563eb' : '#4f46e5',
                    flexShrink: 0
                  }}
                >
                  {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>

                {/* Text Body */}
                <div
                  style={{
                    padding: '0.85rem 1.1rem',
                    borderRadius: m.role === 'user' ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
                    background: m.role === 'user' ? '#2563eb' : '#ffffff',
                    color: m.role === 'user' ? '#ffffff' : '#1e293b',
                    fontSize: '0.9rem',
                    lineHeight: 1.5,
                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
                    border: m.role === 'user' ? 'none' : '1px solid #f1f5f9',
                    whiteSpace: 'pre-line'
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', gap: '0.75rem', alignSelf: 'flex-start' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e0e7ff', color: '#4f46e5' }}>
                  <Bot size={16} />
                </div>
                <div style={{ padding: '0.85rem 1.1rem', borderRadius: '4px 18px 18px 18px', background: '#ffffff', border: '1px solid #f1f5f9', display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94a3b8', animation: 'bounce 1.4s infinite both' }}></span>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94a3b8', animation: 'bounce 1.4s infinite both 0.2s' }}></span>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94a3b8', animation: 'bounce 1.4s infinite both 0.4s' }}></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions Panel */}
          {messages.length === 1 && (
            <div style={{ padding: '0.75rem 1rem', background: '#f1f5f9', display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <HelpCircle size={12} />
                Suggested Queries
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {quickActions.map((qa, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickAction(qa)}
                    style={{
                      background: 'white',
                      border: '1px solid #cbd5e1',
                      borderRadius: '12px',
                      padding: '0.35rem 0.65rem',
                      fontSize: '0.75rem',
                      color: '#475569',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#4f46e5';
                      e.currentTarget.style.color = '#4f46e5';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#cbd5e1';
                      e.currentTarget.style.color = '#475569';
                    }}
                  >
                    {qa}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div style={{ padding: '1rem', borderTop: '1px solid #f1f5f9', background: '#ffffff', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask anything..."
              style={{
                flex: 1,
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '0.75rem 1rem',
                fontSize: '0.9rem',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              style={{
                padding: '0.75rem',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: (loading || !input.trim()) ? 0.6 : 1,
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
              }}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Bounce and slideUp CSS styles injected globally */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @media (max-width: 600px) {
          .ai-assistant-container {
            bottom: 1rem !important;
            right: 1rem !important;
          }
          .ai-assistant-chat {
            position: fixed !important;
            top: 0 !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            margin: auto !important;
            width: 90vw !important;
            height: 80vh !important;
            max-height: 600px !important;
            z-index: 10000;
          }
        }
      `}</style>
    </div>
  );
};

export default AIBusinessAssistant;
