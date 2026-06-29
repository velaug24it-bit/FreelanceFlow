import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { MessageCircle, Send } from 'lucide-react';
import { API_URL, SOCKET_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';

const getId = (value) => value?._id || value?.id || value;

const ProjectChat = ({ project }) => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);

    const userId = getId(user)?.toString();
    const projectId = project?._id;

    const isClient = getId(project?.client_id)?.toString() === userId;
    const isFreelancer = getId(project?.selected_freelancer_id)?.toString() === userId;
    const canUseChat = Boolean(
        projectId &&
        project?.selected_freelancer_id &&
        ['in_progress', 'review', 'completed'].includes(project?.status) &&
        (isClient || isFreelancer)
    );

    useEffect(() => {
        if (!isOpen || !canUseChat) return;

        fetchMessages();
        connectSocket();

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [isOpen, canUseChat, projectId]);

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, [messages, isOpen]);

    const fetchMessages = async () => {
        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/chat/projects/${projectId}/messages`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessages(res.data.messages || []);
        } catch (err) {
            console.error('Failed to load chat:', err);
            setError(err.response?.data?.error || 'Failed to load chat');
        } finally {
            setLoading(false);
        }
    };

    const connectSocket = () => {
        const token = localStorage.getItem('token');
        if (!token || socketRef.current) return;

        const socket = io(SOCKET_URL, {
            query: { userId },
            transports: ['websocket', 'polling'],
            withCredentials: true
        });

        socket.on('connect', () => {
            socket.emit('join_project_chat', { projectId, token });
        });

        socket.on('project_chat_message', (message) => {
            if (message?.project_id?.toString() !== projectId?.toString()) return;
            setMessages(prev => {
                if (prev.some(item => item._id === message._id)) return prev;
                return [...prev, message];
            });
        });

        socketRef.current = socket;
    };

    const sendMessage = async () => {
        const cleanMessage = draft.trim();
        if (!cleanMessage || sending) return;

        setSending(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(
                `${API_URL}/chat/projects/${projectId}/messages`,
                { message: cleanMessage },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setDraft('');
            const savedMessage = res.data.message;
            if (savedMessage) {
                setMessages(prev => {
                    if (prev.some(item => item._id === savedMessage._id)) return prev;
                    return [...prev, savedMessage];
                });
            }
        } catch (err) {
            console.error('Failed to send message:', err);
            setError(err.response?.data?.error || 'Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    };

    const formatTime = (value) => {
        if (!value) return '';
        return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (!canUseChat) return null;

    return (
        <div style={{
            marginTop: '0.75rem',
            background: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            overflow: 'hidden'
        }}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%',
                    border: 'none',
                    background: '#f8fafc',
                    padding: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    color: '#0f172a',
                    fontWeight: 600,
                    fontSize: 'clamp(0.85rem, 1.5vw, 0.95rem)'
                }}
            >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MessageCircle size={18} color="#2563eb" />
                    Project chat
                </span>
                <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 500 }}>
                    {isOpen ? 'Close' : `${messages.length || ''} Open`}
                </span>
            </button>

            {isOpen && (
                <div style={{ borderTop: '1px solid #e5e7eb' }}>
                    <div style={{
                        height: 'clamp(260px, 42vh, 380px)',
                        overflowY: 'auto',
                        padding: '0.75rem',
                        background: '#f8fafc'
                    }}>
                        {loading ? (
                            <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem 1rem' }}>
                                Loading chat...
                            </div>
                        ) : messages.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem 1rem' }}>
                                Start the project conversation here.
                            </div>
                        ) : (
                            messages.map(message => {
                                const mine = getId(message.sender_id)?.toString() === userId;
                                return (
                                    <div
                                        key={message._id}
                                        style={{
                                            display: 'flex',
                                            justifyContent: mine ? 'flex-end' : 'flex-start',
                                            marginBottom: '0.65rem'
                                        }}
                                    >
                                        <div style={{
                                            width: 'fit-content',
                                            maxWidth: 'min(78%, 520px)',
                                            background: mine ? '#2563eb' : 'white',
                                            color: mine ? 'white' : '#111827',
                                            border: mine ? '1px solid #2563eb' : '1px solid #e5e7eb',
                                            borderRadius: mine ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                                            padding: '0.6rem 0.75rem',
                                            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.08)',
                                            overflowWrap: 'anywhere',
                                            wordBreak: 'break-word'
                                        }}>
                                            <div style={{
                                                fontSize: '0.7rem',
                                                opacity: mine ? 0.85 : 0.65,
                                                marginBottom: '0.2rem',
                                                fontWeight: 600
                                            }}>
                                                {mine ? 'You' : message.sender_name}
                                            </div>
                                            <div style={{
                                                whiteSpace: 'pre-wrap',
                                                lineHeight: 1.45,
                                                fontSize: 'clamp(0.82rem, 1.5vw, 0.92rem)'
                                            }}>
                                                {message.message}
                                            </div>
                                            <div style={{
                                                fontSize: '0.65rem',
                                                opacity: mine ? 0.8 : 0.55,
                                                textAlign: 'right',
                                                marginTop: '0.25rem'
                                            }}>
                                                {formatTime(message.created_at)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {error && (
                        <div style={{
                            padding: '0.5rem 0.75rem',
                            color: '#991b1b',
                            background: '#fee2e2',
                            fontSize: '0.8rem'
                        }}>
                            {error}
                        </div>
                    )}

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto',
                        gap: '0.5rem',
                        padding: '0.75rem',
                        background: 'white',
                        borderTop: '1px solid #e5e7eb',
                        alignItems: 'end'
                    }}>
                        <textarea
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            onKeyDown={handleKeyDown}
                            rows={1}
                            maxLength={2000}
                            placeholder="Type a message..."
                            style={{
                                width: '100%',
                                minHeight: '42px',
                                maxHeight: '110px',
                                resize: 'vertical',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                padding: '0.65rem 0.75rem',
                                fontSize: '16px',
                                boxSizing: 'border-box',
                                lineHeight: 1.35
                            }}
                        />
                        <button
                            type="button"
                            onClick={sendMessage}
                            disabled={!draft.trim() || sending}
                            title="Send message"
                            style={{
                                width: '44px',
                                height: '42px',
                                borderRadius: '8px',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: !draft.trim() || sending ? '#94a3b8' : '#2563eb',
                                color: 'white',
                                cursor: !draft.trim() || sending ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectChat;
