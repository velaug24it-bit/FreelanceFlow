import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Bell, Check, CheckCheck, Trash2, X } from 'lucide-react';
import io from 'socket.io-client';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('all'); // all | unread
    const [typeFilter, setTypeFilter] = useState('all');
    const [socket, setSocket] = useState(null);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [pushEnabled, setPushEnabled] = useState(false);
    const [pushLoading, setPushLoading] = useState(false);
    const [pushMessage, setPushMessage] = useState(null); // { text, type: 'success'|'error' }

    useEffect(() => {
        fetchNotifications();
        // Poll for new notifications every 30 seconds
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // Initialize socket connection
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');

        if (token && user.id) {
            try {
                const newSocket = io(SOCKET_URL, {
                    query: { userId: user.id },
                    transports: ['websocket', 'polling'],
                    withCredentials: true
                });

                newSocket.on('connect', () => {
                    console.log('🔌 Connected to notification server');
                });

                newSocket.on('connect_error', (error) => {
                    console.log('⚠️ Socket connection error:', error.message);
                });

                newSocket.on('new_notification', (notification) => {
                    console.log('🔔 New notification received:', notification);
                    setNotifications(prev => [notification, ...prev]);
                    setUnreadCount(prev => prev + 1);
                });

                setSocket(newSocket);

                return () => {
                    if (newSocket.connected) {
                        newSocket.disconnect();
                    }
                };
            } catch (err) {
                console.log('⚠️ Socket initialization failed:', err.message);
            }
        }
    }, []);

    // Web Push subscription helpers
    // Helper to convert VAPID base64 key to Uint8Array
    const urlBase64ToUint8Array = (base64String) => {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
        return outputArray;
    };

    const showPushMessage = (text, type = 'success') => {
        setPushMessage({ text, type });
        setTimeout(() => setPushMessage(null), 3500);
    };

    const fetchVapidPublicKey = async () => {
        const response = await axios.get(`${API_URL}/notifications/push-public-key`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });

        return response.data.publicKey;
    };

    // Check if push is already enabled on component mount
    useEffect(() => {
        const checkPushStatus = async () => {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
            try {
                const reg = await navigator.serviceWorker.getRegistration('/sw.js');
                if (reg) {
                    const sub = await reg.pushManager.getSubscription();
                    setPushEnabled(!!sub);
                }
            } catch (e) { /* ignore */ }
        };
        checkPushStatus();
    }, []);

    const togglePushNotifications = async () => {
        if (pushLoading) return;
        setPushLoading(true);
        try {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                showPushMessage('Push notifications are not supported in this browser.', 'error');
                return;
            }

            if (pushEnabled) {
                // --- DISABLE ---
                const reg = await navigator.serviceWorker.getRegistration('/sw.js');
                if (reg) {
                    const sub = await reg.pushManager.getSubscription();
                    if (sub) await sub.unsubscribe();
                }
                try {
                    await axios.delete(`${API_URL}/notifications/subscribe`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                    });
                } catch (e) { /* server might not have entry, that's fine */ }
                setPushEnabled(false);
                showPushMessage('Push notifications disabled.', 'success');
            } else {
                // --- ENABLE ---
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    showPushMessage('Permission denied. Please allow notifications in your browser settings.', 'error');
                    return;
                }

                const reg = await navigator.serviceWorker.register('/sw.js');
                await navigator.serviceWorker.ready;

                const vapidKey = await fetchVapidPublicKey();
                if (!vapidKey) {
                    showPushMessage('Push configuration is missing. Contact support.', 'error');
                    return;
                }

                // Unsubscribe any stale subscription first
                const existing = await reg.pushManager.getSubscription();
                if (existing) await existing.unsubscribe();

                const sub = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidKey)
                });

                await axios.post(`${API_URL}/notifications/subscribe`, { subscription: sub }, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                setPushEnabled(true);
                showPushMessage('🔔 Push notifications enabled!', 'success');
            }
        } catch (err) {
            console.error('Push toggle error:', err);
            if (err.response?.status === 503) {
                showPushMessage('Push configuration is missing. Contact support.', 'error');
            } else {
                showPushMessage('Something went wrong. Please try again.', 'error');
            }
        } finally {
            setPushLoading(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [filter, typeFilter, isOpen]);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            if (!token) {
                setLoading(false);
                return;
            }

            const response = await axios.get(`${API_URL}/notifications`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const all = response.data.notifications || [];
            setUnreadCount(response.data.unreadCount || 0);

            // Client-side filtering
            let filtered = all;
            if (filter === 'unread') filtered = filtered.filter(n => !n.is_read);
            if (typeFilter !== 'all') filtered = filtered.filter(n => n.type === typeFilter);
            setNotifications(filtered);
        } catch (err) {
            console.error('Error fetching notifications:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchUnreadCount = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await axios.get(`${API_URL}/notifications/unread-count`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUnreadCount(response.data.unreadCount || 0);
        } catch (err) {
            // Silently fail for polling
        }
    };

    const markAsRead = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/notifications/${id}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Error marking as read:', err);
        }
    };

    const markAllAsRead = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/notifications/mark-all-read`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Error marking all as read:', err);
        }
    };

    const deleteNotification = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/notifications/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const deleted = notifications.find(n => n._id === id);
            setNotifications(prev => prev.filter(n => n._id !== id));
            if (deleted && !deleted.is_read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (err) {
            console.error('Error deleting notification:', err);
        }
    };

    const clearAll = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/notifications`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications([]);
            setUnreadCount(0);
        } catch (err) {
            console.error('Error clearing notifications:', err);
        }
    };

    const handleNotificationClick = async (notification) => {
        // Mark as read if unread
        if (!notification.is_read) {
            try {
                const token = localStorage.getItem('token');
                await axios.put(`${API_URL}/notifications/${notification._id}/read`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setNotifications(prev => prev.map(n =>
                    n._id === notification._id ? { ...n, is_read: true } : n
                ));
                setUnreadCount(prev => Math.max(0, prev - 1));
            } catch (err) {
                console.error('Error marking as read:', err);
            }
        }

        // Close dropdown and show detail modal
        setIsOpen(false);
        setSelectedNotification(notification);
    };

    const getTypeIcon = (type) => {
        const iconMap = {
            'bid_received': '📩',
            'bid_accepted': '🎉',
            'bid_rejected': '😔',
            'project_assigned': '📋',
            'project_status_updated': '🔄',
            'project_completed': '✅',
            'invoice_paid': '💰',
            'invoice_created': '📄',
            'contract_created': '📝',
            'new_project': '🆕',
            'subscription_expiring': '⚠️',
            'subscription_expired': '❌',
            'payment_received': '💳',
            'payment_released': '💸'
        };
        return iconMap[type] || '🔔';
    };

    const getTimeAgo = (dateStr) => {
        if (!dateStr) return 'Just now';
        const now = new Date();
        const date = new Date(dateStr);
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const handleBellClick = () => {
        if (!isOpen) {
            fetchNotifications();
        }
        setIsOpen(!isOpen);
    };

    return (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
            {/* Bell Button */}
            <button
                onClick={handleBellClick}
                style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '40px',
                    height: '40px',
                    background: isOpen ? '#f0f4ff' : 'transparent',
                    border: '1px solid transparent',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    color: isOpen ? '#3b82f6' : '#6b7280'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f0f4ff';
                    e.currentTarget.style.color = '#3b82f6';
                }}
                onMouseLeave={(e) => {
                    if (!isOpen) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#6b7280';
                    }
                }}
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        minWidth: '18px',
                        height: '18px',
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        color: 'white',
                        borderRadius: '9999px',
                        fontSize: '0.65rem',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 4px',
                        boxShadow: '0 2px 4px rgba(239, 68, 68, 0.4)',
                        animation: 'pulse 2s infinite'
                    }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="notification-dropdown" style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: '0',
                    width: '360px',
                    maxWidth: 'calc(100vw - 24px)',
                    maxHeight: '540px',
                    background: '#ffffff',
                    borderRadius: '16px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
                    overflow: 'hidden',
                    zIndex: 1001,
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {/* Header */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1rem 1.25rem',
                        borderBottom: '1px solid #f1f5f9',
                        background: '#fafbfc'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <h3 style={{
                                fontSize: '1.05rem',
                                fontWeight: '700',
                                color: '#0f172a',
                                margin: 0
                            }}>
                                Notifications
                            </h3>
                            {unreadCount > 0 && (
                                <span style={{
                                    background: '#eff6ff',
                                    color: '#3b82f6',
                                    padding: '2px 8px',
                                    borderRadius: '9999px',
                                    fontSize: '0.7rem',
                                    fontWeight: '600'
                                }}>
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        {notifications.length > 0 && (
                            <button
                                onClick={markAllAsRead}
                                title="Mark all as read"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    padding: '0.35rem 0.75rem',
                                    background: '#eff6ff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    color: '#3b82f6',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    transition: 'all 0.15s',
                                    opacity: unreadCount === 0 ? 0.5 : 1
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#dbeafe'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#eff6ff'}
                            >
                                <CheckCheck size={14} />
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Toolbar / Filters Row */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.625rem 1.25rem',
                        borderBottom: '1px solid #f1f5f9',
                        background: '#f8fafc',
                        gap: '0.5rem'
                    }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>Filters:</span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                style={{
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '0.75rem',
                                    background: 'white',
                                    color: '#334155',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="all">All</option>
                                <option value="unread">Unread</option>
                            </select>

                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                style={{
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '0.75rem',
                                    background: 'white',
                                    color: '#334155',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="all">All Types</option>
                                <option value="invoice_created">Invoice</option>
                                <option value="project_status_updated">Project</option>
                                <option value="payment_received">Payment</option>
                                <option value="bid_received">Bid</option>
                            </select>
                        </div>
                    </div>

                    {/* Notification List */}
                    <div style={{
                        overflowY: 'auto',
                        flex: 1,
                        maxHeight: '340px'
                    }}>
                        {loading && notifications.length === 0 ? (
                            <div style={{
                                padding: '3rem 1rem',
                                textAlign: 'center',
                                color: '#94a3b8',
                                fontSize: '0.875rem'
                            }}>
                                Loading...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div style={{
                                padding: '3rem 1rem',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔔</div>
                                <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: '500' }}>
                                    No notifications yet
                                </div>
                                <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                                    We'll notify you when something happens
                                </div>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification._id}
                                    onClick={() => handleNotificationClick(notification)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '0.75rem',
                                        padding: '0.9rem 1.25rem',
                                        borderBottom: '1px solid #f8fafc',
                                        background: notification.is_read ? 'transparent' : '#f0f7ff',
                                        cursor: 'pointer',
                                        transition: 'background 0.15s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = notification.is_read ? '#f8fafc' : '#e8f2ff';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = notification.is_read ? 'transparent' : '#f0f7ff';
                                    }}
                                >
                                    {/* Type Icon */}
                                    <div style={{
                                        fontSize: '1.25rem',
                                        flexShrink: 0,
                                        marginTop: '2px'
                                    }}>
                                        {getTypeIcon(notification.type)}
                                    </div>

                                    {/* Content */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            justifyContent: 'space-between',
                                            gap: '0.5rem'
                                        }}>
                                            <div style={{
                                                fontSize: '0.85rem',
                                                fontWeight: notification.is_read ? '500' : '600',
                                                color: '#0f172a',
                                                lineHeight: '1.3'
                                            }}>
                                                {notification.title}
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteNotification(notification._id);
                                                }}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: '#cbd5e1',
                                                    padding: '2px',
                                                    borderRadius: '4px',
                                                    flexShrink: 0,
                                                    transition: 'all 0.15s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.color = '#ef4444';
                                                    e.currentTarget.style.background = '#fef2f2';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.color = '#cbd5e1';
                                                    e.currentTarget.style.background = 'transparent';
                                                }}
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                        <div style={{
                                            fontSize: '0.8rem',
                                            color: '#64748b',
                                            lineHeight: '1.4',
                                            marginTop: '2px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical'
                                        }}>
                                            {notification.message}
                                        </div>
                                        <div style={{
                                            fontSize: '0.7rem',
                                            color: '#94a3b8',
                                            marginTop: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}>
                                            {getTimeAgo(notification.created_at)}
                                            {!notification.is_read && (
                                                <span style={{
                                                    width: '6px',
                                                    height: '6px',
                                                    borderRadius: '50%',
                                                    background: '#3b82f6',
                                                    display: 'inline-block'
                                                }} />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1.25rem',
                        borderTop: '1px solid #f1f5f9',
                        background: '#fafbfc',
                        gap: '0.5rem'
                    }}>
                        {notifications.length > 0 ? (
                            <button
                                onClick={clearAll}
                                title="Clear all notifications"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    padding: '0.35rem 0.6rem',
                                    background: 'transparent',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    color: '#94a3b8',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    transition: 'all 0.15s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#fef2f2';
                                    e.currentTarget.style.color = '#ef4444';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = '#94a3b8';
                                }}
                            >
                                <Trash2 size={14} />
                                Clear all
                            </button>
                        ) : <div />}

                        {/* Push message toast */}
                        {pushMessage && (
                            <div style={{
                                position: 'absolute',
                                bottom: '56px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: pushMessage.type === 'success' ? '#22c55e' : '#ef4444',
                                color: 'white',
                                padding: '0.4rem 0.9rem',
                                borderRadius: '20px',
                                fontSize: '0.72rem',
                                fontWeight: '600',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                zIndex: 10,
                                animation: 'scaleIn 0.2s ease-out'
                            }}>
                                {pushMessage.text}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={togglePushNotifications}
                                disabled={pushLoading}
                                title={pushEnabled ? 'Disable push notifications' : 'Enable push notifications'}
                                style={{
                                    padding: '0.35rem 0.6rem',
                                    background: pushEnabled ? '#eff6ff' : 'transparent',
                                    border: pushEnabled ? '1px solid #bfdbfe' : 'none',
                                    borderRadius: '6px',
                                    cursor: pushLoading ? 'not-allowed' : 'pointer',
                                    color: pushEnabled ? '#3b82f6' : '#475569',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    transition: 'all 0.15s',
                                    opacity: pushLoading ? 0.7 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.3rem'
                                }}
                                onMouseEnter={(e) => { if (!pushLoading) e.currentTarget.style.background = pushEnabled ? '#dbeafe' : '#f1f5f9'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = pushEnabled ? '#eff6ff' : 'transparent'; }}
                            >
                                {pushLoading ? (
                                    <span style={{ display: 'inline-block', width: '10px', height: '10px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                                ) : (
                                    pushEnabled ? '🔔' : '🔕'
                                )}
                                {pushLoading ? 'Working…' : (pushEnabled ? 'Push On' : 'Enable Push')}
                            </button>
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    navigate('/settings/notifications');
                                }}
                                title="Notification preferences"
                                style={{
                                    padding: '0.35rem 0.65rem',
                                    background: '#f1f5f9',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    color: '#334155',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    transition: 'background 0.15s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
                            >
                                Preferences
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Detail Modal */}
            {selectedNotification && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.4)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000,
                    padding: '1.5rem'
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        width: '100%',
                        maxWidth: '420px',
                        padding: '2rem',
                        border: '1px solid #f1f5f9',
                        animation: 'scaleIn 0.2s ease-out',
                        position: 'relative',
                        textAlign: 'left'
                    }}>
                        <button
                            onClick={() => setSelectedNotification(null)}
                            style={{
                                position: 'absolute',
                                top: '1rem',
                                right: '1rem',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#64748b'
                            }}
                        >
                            <X size={20} />
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                            <div style={{ fontSize: '1.75rem' }}>
                                {getTypeIcon(selectedNotification.type)}
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>
                                {selectedNotification.title}
                            </h3>
                        </div>

                        <p style={{ color: '#475569', fontSize: '0.925rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                            {selectedNotification.message}
                        </p>

                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
                            Received: {new Date(selectedNotification.created_at).toLocaleString()}
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setSelectedNotification(null)}
                                style={{
                                    padding: '0.625rem 1.25rem',
                                    backgroundColor: 'transparent',
                                    color: '#64748b',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontWeight: '600',
                                    fontSize: '0.875rem',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                Close
                            </button>

                            {/* View Target Button (if route exists) */}
                            {(selectedNotification.action_url ||
                                (selectedNotification.reference_type === 'project' && selectedNotification.reference_id) ||
                                selectedNotification.reference_type === 'invoice' ||
                                (selectedNotification.type.includes('invoice') || selectedNotification.type.includes('payment')) ||
                                (selectedNotification.type.includes('project') || selectedNotification.type.includes('bid'))
                            ) && (
                                    <button
                                        onClick={() => {
                                            const notification = selectedNotification;
                                            setSelectedNotification(null);

                                            // Execute navigation logic
                                            if (notification.action_url) {
                                                try {
                                                    const url = new URL(notification.action_url, window.location.origin);
                                                    if (url.origin !== window.location.origin) {
                                                        window.open(notification.action_url, '_blank');
                                                        return;
                                                    }
                                                } catch (e) { }

                                                // Rewrite common backend paths to existing client routes
                                                if (notification.action_url.startsWith('/projects/') && !notification.action_url.includes('/manage')) {
                                                    const projectId = notification.action_url.replace('/projects/', '');
                                                    navigate(`/projects/${projectId}`);
                                                    return;
                                                }

                                                navigate(notification.action_url);
                                                return;
                                            }

                                            const type = notification.type;
                                            const refId = notification.reference_id;
                                            const refType = notification.reference_type;

                                            if (refType === 'invoice' || type.includes('invoice')) {
                                                if (refId) {
                                                    navigate(`/invoices/${refId}`);
                                                } else {
                                                    navigate('/invoices');
                                                }
                                            } else if (refType === 'payment') {
                                                if (refId) {
                                                    navigate(`/projects/${refId}`);
                                                } else {
                                                    navigate('/projects');
                                                }
                                            } else if (refType === 'project' || type.includes('project') || type.includes('bid')) {
                                                if (refId) {
                                                    navigate(`/projects/${refId}`);
                                                } else {
                                                    navigate('/projects');
                                                }
                                            } else if (refType === 'contract' || type.includes('contract')) {
                                                if (refId) {
                                                    navigate(`/contracts/${refId}`);
                                                } else {
                                                    navigate('/contracts');
                                                }
                                            } else {
                                                navigate('/projects');
                                            }
                                        }}
                                        style={{
                                            padding: '0.625rem 1.25rem',
                                            backgroundColor: '#3b82f6',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontWeight: '600',
                                            fontSize: '0.875rem',
                                            cursor: 'pointer',
                                            transition: 'background-color 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                                    >
                                        {selectedNotification.reference_type === 'project' || selectedNotification.type.includes('project') || selectedNotification.type.includes('bid')
                                            ? 'View Project'
                                            : 'View Invoices'}
                                    </button>
                                )}
                        </div>
                    </div>
                </div>
            )}

            {/* Pulse animation for the badge */}
            <style>{`
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                    70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }
                @keyframes scaleIn {
                    0% { transform: scale(0.95); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                @media (max-width: 600px) {
                    .notification-dropdown {
                        position: fixed !important;
                        top: 0 !important;
                        bottom: 0 !important;
                        left: 0 !important;
                        right: 0 !important;
                        margin: auto !important;
                        width: 90vw !important;
                        max-width: 400px !important;
                        height: fit-content !important;
                        max-height: 80vh !important;
                        z-index: 10000 !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default NotificationBell;
