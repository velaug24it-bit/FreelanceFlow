import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Bell, Check, CheckCheck, Trash2, X } from 'lucide-react';
import io from 'socket.io-client';

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
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
            const newSocket = io('http://localhost:5000', {
                query: { userId: user.id },
                transports: ['websocket']
            });
            
            newSocket.on('connect', () => {
                console.log('🔌 Connected to notification server');
            });
            
            newSocket.on('new_notification', (notification) => {
                console.log('🔔 New notification received:', notification);
                setNotifications(prev => [notification, ...prev]);
                setUnreadCount(prev => prev + 1);
            });
            
            setSocket(newSocket);
            
            return () => {
                newSocket.disconnect();
            };
        }
    }, []);

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
            const response = await axios.get('/api/notifications', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(response.data.notifications || []);
            setUnreadCount(response.data.unreadCount || 0);
        } catch (err) {
            console.error('Error fetching notifications:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchUnreadCount = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/notifications/unread-count', {
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
            await axios.put(`/api/notifications/${id}/read`, {}, {
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
            await axios.put('/api/notifications/mark-all-read', {}, {
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
            await axios.delete(`/api/notifications/${id}`, {
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
            await axios.delete('/api/notifications', {
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
                await axios.put(`/api/notifications/${notification._id}/read`, {}, {
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
        
        // Navigate based on action_url or reference_type
        if (notification.action_url) {
            navigate(notification.action_url);
        } else if (notification.reference_type) {
            switch (notification.reference_type) {
                case 'project':
                    navigate(`/projects/${notification.reference_id}`);
                    break;
                case 'invoice':
                    navigate(`/invoices/${notification.reference_id}`);
                    break;
                case 'contract':
                    navigate(`/contracts/${notification.reference_id}`);
                    break;
                case 'subscription':
                    navigate('/subscription');
                    break;
                default:
                    break;
            }
        }
        
        setIsOpen(false);
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'bid_received': return '📩';
            case 'bid_accepted': return '🎉';
            case 'bid_rejected': return '😔';
            case 'project_assigned': return '📋';
            case 'project_status_updated': return '🔄';
            case 'invoice_paid': return '💰';
            case 'invoice_created': return '📄';
            case 'contract_created': return '📝';
            case 'new_project': return '🆕';
            case 'subscription_expiring': return '⚠️';
            case 'subscription_expired': return '❌';
            case 'payment_received': return '💳';
            default: return '🔔';
        }
    };

    const getTimeAgo = (dateStr) => {
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