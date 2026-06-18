import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Zap, TrendingUp, Award, Shield } from 'lucide-react';

const ConnectsShop = () => {
    const { user } = useAuth();
    const [packages, setPackages] = useState([]);
    const [balance, setBalance] = useState({
        connects_balance: 0,
        total_connects_used: 0,
        subscription_tier: 'free'
    });
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(null);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        loadRazorpayScript();
        fetchData();
    }, []);

    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
                resolve(true);
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            console.log('🔍 Fetching connects data...');
            console.log('Token exists:', !!token);
            
            if (!token) {
                setMessage({ type: 'error', text: 'Please login to view connects' });
                setLoading(false);
                return;
            }
            
            // Fetch packages
            let packagesData = [
                { id: 1, connects: 50, price: 5, label: 'Starter' },
                { id: 2, connects: 120, price: 10, label: 'Popular' },
                { id: 3, connects: 300, price: 20, label: 'Pro' },
                { id: 4, connects: 800, price: 50, label: 'Business' }
            ];
            
            try {
                const packagesRes = await axios.get('/api/razorpay/connects-packages');
                if (packagesRes.data && packagesRes.data.packages) {
                    packagesData = packagesRes.data.packages;
                }
                console.log('✅ Packages loaded:', packagesData);
            } catch (pkgErr) {
                console.warn('⚠️ Using default packages:', pkgErr.message);
            }
            setPackages(packagesData);
            
            // Fetch balance
            try {
                const balanceRes = await axios.get('/api/connects/balance', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (balanceRes.data) {
                    setBalance(balanceRes.data);
                    console.log('✅ Balance loaded:', balanceRes.data);
                }
            } catch (balErr) {
                console.warn('⚠️ Using default balance:', balErr.message);
                setBalance({
                    connects_balance: 20,
                    total_connects_used: 0,
                    subscription_tier: 'free'
                });
            }
            
            setMessage({ type: '', text: '' });
            
        } catch (err) {
            console.error('❌ Error fetching data:', err);
            setMessage({ 
                type: 'error', 
                text: 'Failed to load data. Please refresh the page.' 
            });
        } finally {
            setLoading(false);
        }
    };

    const purchaseConnects = async (pkg) => {
        setProcessing(pkg.id);
        setMessage({ type: '', text: '' });
        
        try {
            const token = localStorage.getItem('token');
            
            if (!token) {
                setMessage({ type: 'error', text: 'Please login to purchase connects' });
                setProcessing(null);
                return;
            }
            
            console.log('🛒 Purchasing:', pkg);
            
            // Create order
            const { data } = await axios.post('/api/razorpay/create-connects-order', {
                packageId: pkg.id
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            console.log('📦 Order created:', data);
            
            if (!data.orderId) {
                throw new Error('No order ID received');
            }
            
            // Open Razorpay Checkout
            const options = {
                key: data.key,
                amount: data.amount,
                currency: data.currency,
                name: 'FreelanceFlow',
                description: `${pkg.connects} Connects Package - ₹${pkg.price}`,
                order_id: data.orderId,
                prefill: {
                    name: user?.full_name || 'Customer',
                    email: user?.email || 'customer@example.com',
                    contact: '9999999999'
                },
                theme: {
                    color: '#667eea'
                },
                handler: async (response) => {
                    console.log('✅ Payment response:', response);
                    try {
                        const verifyRes = await axios.post('/api/razorpay/verify-connects', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            packageId: pkg.id
                        }, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        
                        console.log('✅ Verification:', verifyRes.data);
                        
                        if (verifyRes.data.success) {
                            setMessage({ 
                                type: 'success', 
                                text: `✅ ${verifyRes.data.message}` 
                            });
                            fetchData();
                            setTimeout(() => {
                                setMessage({ type: '', text: '' });
                            }, 5000);
                        }
                    } catch (err) {
                        console.error('❌ Verification error:', err);
                        setMessage({ 
                            type: 'error', 
                            text: 'Payment verification failed. Please contact support.' 
                        });
                    }
                },
                modal: {
                    ondismiss: () => {
                        setProcessing(null);
                    }
                }
            };
            
            const razorpayInstance = new window.Razorpay(options);
            razorpayInstance.open();
            
        } catch (err) {
            console.error('❌ Purchase error:', err);
            setMessage({ 
                type: 'error', 
                text: err.response?.data?.error || 'Failed to process payment. Please try again.' 
            });
            setProcessing(null);
        }
    };

    const getMonthlyConnects = () => {
        if (balance.subscription_tier === 'pro') return 200;
        if (balance.subscription_tier === 'business') return 500;
        return 20;
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    if (loading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', color: '#6b7280' }}>Loading connects shop...</div>
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Connects</h1>
                <p style={{ fontSize: '1.125rem', color: '#6b7280' }}>
                    Bid on projects using Connects. Each bid costs <strong>1 Connect</strong>.
                </p>
            </div>

            {/* Message Alert */}
            {message.text && (
                <div style={{
                    background: message.type === 'success' ? '#d1fae5' : '#fee2e2',
                    color: message.type === 'success' ? '#065f46' : '#991b1b',
                    padding: '1rem',
                    borderRadius: '12px',
                    marginBottom: '2rem',
                    textAlign: 'center'
                }}>
                    {message.text}
                </div>
            )}

            {/* Balance Card */}
            <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '20px',
                padding: '2rem',
                color: 'white',
                marginBottom: '2.5rem',
                textAlign: 'center'
            }}>
                <Zap size={48} style={{ marginBottom: '1rem' }} />
                <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    {balance.connects_balance || 0}
                </h2>
                <p style={{ fontSize: '1.1rem', opacity: 0.9 }}>Connects Available</p>
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    gap: '2rem', 
                    marginTop: '1rem',
                    flexWrap: 'wrap'
                }}>
                    <div>
                        <span style={{ opacity: 0.7, fontSize: '0.875rem' }}>Used</span>
                        <p style={{ fontWeight: '600' }}>{balance.total_connects_used || 0}</p>
                    </div>
                    <div>
                        <span style={{ opacity: 0.7, fontSize: '0.875rem' }}>Free Monthly</span>
                        <p style={{ fontWeight: '600' }}>{getMonthlyConnects()}</p>
                    </div>
                    <div>
                        <span style={{ opacity: 0.7, fontSize: '0.875rem' }}>Plan</span>
                        <p style={{ fontWeight: '600', textTransform: 'capitalize' }}>
                            {balance.subscription_tier || 'Free'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Connect Packages */}
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Purchase Additional Connects</h2>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem'
            }}>
                {packages.map((pkg) => (
                    <div key={pkg.id} style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '2rem',
                        textAlign: 'center',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        border: pkg.label === 'Popular' ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                        position: 'relative'
                    }}>
                        {pkg.label === 'Popular' && (
                            <div style={{
                                position: 'absolute',
                                top: '-12px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: '#f59e0b',
                                color: 'white',
                                padding: '0.25rem 1rem',
                                borderRadius: '20px',
                                fontSize: '0.75rem',
                                fontWeight: '600'
                            }}>
                                BEST VALUE
                            </div>
                        )}
                        
                        <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#3b82f6' }}>
                            {pkg.connects}
                        </div>
                        <div style={{ color: '#6b7280', marginBottom: '0.5rem' }}>Connects</div>
                        
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                            {formatCurrency(pkg.price)}
                        </div>
                        
                        <button
                            onClick={() => purchaseConnects(pkg)}
                            disabled={processing === pkg.id}
                            style={{
                                width: '100%',
                                marginTop: '1rem',
                                padding: '0.75rem',
                                background: processing === pkg.id ? '#9ca3af' : '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: processing === pkg.id ? 'not-allowed' : 'pointer',
                                fontSize: '1rem',
                                fontWeight: '500'
                            }}
                        >
                            {processing === pkg.id ? 'Processing...' : `Buy ${pkg.connects} Connects`}
                        </button>
                    </div>
                ))}
            </div>

            {/* Pro Plan Benefits */}
            <div style={{
                background: '#f9fafb',
                borderRadius: '16px',
                padding: '2rem',
                marginTop: '2rem'
            }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', textAlign: 'center' }}>
                    🚀 Upgrade to Pro & Save Money
                </h2>
                <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '1.5rem' }}>
                    Get more connects and lower fees with a Pro subscription
                </p>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '1.5rem',
                    marginTop: '1.5rem'
                }}>
                    <div style={{ textAlign: 'center', background: 'white', padding: '1.5rem', borderRadius: '12px' }}>
                        <TrendingUp size={32} color="#10b981" />
                        <h3 style={{ marginTop: '0.5rem' }}>200 Connects/month</h3>
                        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Instead of just 20</p>
                    </div>
                    <div style={{ textAlign: 'center', background: 'white', padding: '1.5rem', borderRadius: '12px' }}>
                        <Award size={32} color="#f59e0b" />
                        <h3 style={{ marginTop: '0.5rem' }}>Lower Commission</h3>
                        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Pay only 2% instead of 5%</p>
                    </div>
                    <div style={{ textAlign: 'center', background: 'white', padding: '1.5rem', borderRadius: '12px' }}>
                        <Shield size={32} color="#8b5cf6" />
                        <h3 style={{ marginTop: '0.5rem' }}>Priority Support</h3>
                        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Get help within 24 hours</p>
                    </div>
                </div>
                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                    <a
                        href="/subscription"
                        style={{
                            display: 'inline-block',
                            padding: '0.75rem 2rem',
                            background: '#8b5cf6',
                            color: 'white',
                            textDecoration: 'none',
                            borderRadius: '8px',
                            fontWeight: '500'
                        }}
                    >
                        Upgrade to Pro - ₹19/month
                    </a>
                </div>
            </div>
        </div>
    );
};

export default ConnectsShop;