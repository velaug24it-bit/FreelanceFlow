import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const NotificationSettings = () => {
    const [prefs, setPrefs] = useState({
        email: {},
        in_app: {},
        push: {}
    });
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPrefs = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return navigate('/login');
                const res = await axios.get(`${API_URL}/notifications/preferences`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setPrefs(res.data.notification_preferences || {});
            } catch (err) {
                console.error('Error loading preferences:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchPrefs();
    }, [navigate]);

    const toggle = (category, key) => {
        setPrefs(prev => ({
            ...prev,
            [category]: {
                ...(prev[category] || {}),
                [key]: !((prev[category] || {})[key])
            }
        }));
    };

    const save = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/notifications/preferences`, { notification_preferences: prefs }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Preferences saved');
        } catch (err) {
            console.error('Error saving preferences:', err);
            alert('Failed to save preferences');
        }
    };

    if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

    return (
        <div style={{ padding: 20 }}>
            <h2>Notification Preferences</h2>
            <p>Choose how you want to receive notifications for different events.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginTop: 20 }}>
                {['email', 'in_app', 'push'].map(cat => (
                    <div key={cat} style={{ padding: 16, border: '1px solid #e6eef8', borderRadius: 8 }}>
                        <h4 style={{ marginTop: 0, textTransform: 'capitalize' }}>{cat.replace('_',' ')}</h4>
                        {['invoice', 'project', 'message', 'subscription', 'payment'].map(key => (
                            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                                <input type="checkbox" checked={!!((prefs[cat] || {})[key])} onChange={() => toggle(cat, key)} />
                                <span style={{ textTransform: 'capitalize' }}>{key.replace('_', ' ')}</span>
                            </label>
                        ))}
                    </div>
                ))}
            </div>

            <div style={{ marginTop: 20 }}>
                <button onClick={save} style={{ padding: '8px 14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8 }}>Save</button>
            </div>
        </div>
    );
};

export default NotificationSettings;
