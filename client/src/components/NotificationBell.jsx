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
    const enablePushNotifications = async () => {
        try {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                alert('Push notifications are not supported in this browser.');
                return;
            }

            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return alert('Permission denied for push notifications');

            const registration = await navigator.serviceWorker.register('/sw.js');
            const existing = await registration.pushManager.getSubscription();
            if (existing) {
                // send existing to server
                await axios.post(`${API_URL}/notifications/subscribe`, { subscription: existing }, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                return alert('Push notifications enabled');
            }

            const vapidKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: vapidKey ? urlBase64ToUint8Array(vapidKey) : undefined
            });

            await axios.post(`${API_URL}/notifications/subscribe`, { subscription: sub }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            alert('Push notifications enabled');
        } catch (err) {
            console.error('Push enable error:', err);
            alert('Failed to enable push notifications');
        }
    };

    const disablePushNotifications = async () => {
        try {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration) {
                const sub = await registration.pushManager.getSubscription();
                if (sub) await sub.unsubscribe();
            }
            await axios.delete(`${API_URL}/notifications/subscribe`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            alert('Push notifications disabled');
        } catch (err) {
            console.error('Push disable error:', err);
            alert('Failed to disable push notifications');
        }
    };

    // Helper to convert VAPID key
    const urlBase64ToUint8Array = (base64String) => {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
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

        // Close dropdown
        setIsOpen(false);

        // Navigate based on action_url or reference_type
        if (notification.action_url) {
            try {
                const url = new URL(notification.action_url, window.location.origin);
                if (url.origin !== window.location.origin) {
                    window.open(notification.action_url, '_blank');
                    return;
                }
            } catch (e) {
                // invalid URL -> fallback to navigate
            }
            navigate(notification.action_url);
            return;
        }

        // Handle different notification types
        const type = notification.type;
        const refId = notification.reference_id;
        const refType = notification.reference_type;

        console.log('🔍 Navigating notification:', { type, refId, refType });

        // Navigate based on type
        switch (type) {
            case 'invoice_created':
            case 'invoice_paid':
            case 'payment_received':
                if (refId) {
                    navigate(`/invoices/${refId}`);
                } else {
                    navigate('/invoices');
                }
                break;

            case 'project_completed':
            case 'project_status_updated':
            case 'bid_accepted':
            case 'bid_received':
            case 'bid_rejected':
                if (refId) {
                    navigate(`/projects/${refId}`);
                } else {
                    navigate('/projects');
                }
                break;

            case 'subscription_expiring':
            case 'subscription_expired':
                navigate('/subscriptions');
                break;

            default:
                // If no specific navigation, try to use reference_type
                if (refType === 'project' && refId) {
                    navigate(`/projects/${refId}`);
                } else if (refType === 'invoice' && refId) {
                    navigate(`/invoices/${refId}`);
                } else if (refType === 'contract' && refId) {
                    navigate(`/contracts/${refId}`);
                } else {
                    // Default: close the notification and stay on current page
                    console.log('ℹ️ No navigation target for notification:', notification);
                }
                break;
        }
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
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: '-60px',
                    width: '380px',
                    maxHeight: '480px',
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
                                fontSize: '1rem',
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
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '0.5rem' }}>
                                <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: '6px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <option value="all">All</option>
                                    <option value="unread">Unread</option>
                                </select>

                                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ padding: '6px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <option value="all">All Types</option>
                                    <option value="invoice_created">Invoice</option>
                                    <option value="project_status_updated">Project</option>
                                    <option value="payment_received">Payment</option>
                                    <option value="bid_received">Bid</option>
                                </select>
                            </div>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    title="Mark all as read"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        padding: '0.3rem 0.6rem',
                                        background: 'transparent',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        color: '#3b82f6',
                                        fontSize: '0.75rem',
                                        fontWeight: '500',
                                        transition: 'background 0.15s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#eff6ff'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <CheckCheck size={14} />
                                    Read all
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button
                                    onClick={clearAll}
                                    title="Clear all"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        padding: '0.3rem 0.6rem',
                                        background: 'transparent',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        color: '#94a3b8',
                                        fontSize: '0.75rem',
                                        fontWeight: '500',
                                        transition: 'background 0.15s'
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
                                    Clear
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    navigate('/settings/notifications');
                                }}
                                title="Notification preferences"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    padding: '0.3rem 0.6rem',
                                    background: 'transparent',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    color: '#0f172a',
                                    fontSize: '0.75rem',
                                    fontWeight: '500'
                                }}
                            >
                                Preferences
                            </button>
                            <button
                                onClick={() => enablePushNotifications()}
                                title="Enable push notifications"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    padding: '0.3rem 0.6rem',
                                    background: 'transparent',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    color: '#0f172a',
                                    fontSize: '0.75rem',
                                    fontWeight: '500'
                                }}
                            >
                                Enable Push
                            </button>
                        </div>
                    </div>

                    {/* Notification List */}
                    <div style={{
                        overflowY: 'auto',
                        flex: 1,
                        maxHeight: '400px'
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
                                            marginTop: '2px'
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
                </div>
            )}

            {/* Pulse animation for the badge */}
            <style>{`
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                    70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }
            `}</style>
        </div>
    );
};

export default NotificationBell;