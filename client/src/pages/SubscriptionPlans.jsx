import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Check, Crown, Zap, Star, CreditCard } from 'lucide-react';

const SubscriptionPlans = () => {
    const { user } = useAuth();
    const [plans, setPlans] = useState([]);
    const [currentPlan, setCurrentPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(null);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchPlans();
        fetchCurrentSubscription();
        loadRazorpayScript();
    }, []);

    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const fetchPlans = async () => {
        try {
            const response = await axios.get('/api/subscriptions/plans');
            setPlans(response.data.plans);
        } catch (err) {
            console.error('Failed to fetch plans:', err);
            setPlans([
                { id: 1, name: 'Free', price: 0, interval: 'month', features: ['5 Clients', '10 Projects', '20 Invoices', 'Basic Support'] },
                { id: 2, name: 'Pro', price: 19, interval: 'month', features: ['50 Clients', '100 Projects', '500 Invoices', 'Expense Tracking', 'Task Board', 'Priority Support'], popular: true },
                { id: 3, name: 'Business', price: 49, interval: 'month', features: ['Unlimited Clients', 'Unlimited Projects', 'Unlimited Invoices', 'All Features', 'API Access', '24/7 Support'] }
            ]);
        }
    };

    const fetchCurrentSubscription = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/subscriptions/my-subscription', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCurrentPlan(response.data.currentPlan);
        } catch (err) {
            console.error('Failed to fetch subscription:', err);
            setCurrentPlan('free');
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = async (plan) => {
        if (plan.name.toLowerCase() === 'free') {
            await handleCancelSubscription();
            return;
        }

        setProcessing(plan.id);
        setMessage({ type: '', text: '' });

        try {
            const token = localStorage.getItem('token');
            
            // Create Razorpay order
            const { data } = await axios.post('/api/razorpay/create-order', {
                planId: plan.id,
                planName: plan.name,
                amount: plan.price
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Open Razorpay Checkout
            const options = {
                key: data.key,
                amount: data.amount,
                currency: data.currency,
                name: 'FreelanceFlow',
                description: `${plan.name} Plan Subscription`,
                order_id: data.orderId,
                prefill: {
                    name: user?.full_name || '',
                    email: user?.email || '',
                },
                theme: {
                    color: '#667eea'
                },
                handler: async (response) => {
                    // Verify payment
                    const verifyRes = await axios.post('/api/razorpay/verify-payment', {
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                        planName: plan.name,
                        amount: plan.price
                    }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    
                    if (verifyRes.data.success) {
                        setMessage({ type: 'success', text: `Successfully upgraded to ${plan.name} plan!` });
                        fetchCurrentSubscription();
                        setTimeout(() => window.location.reload(), 2000);
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
            console.error('Subscription error:', err);
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to process payment. Please try again.' });
            setProcessing(null);
        }
    };

    const handleCancelSubscription = async () => {
        if (!window.confirm('Are you sure you want to cancel your subscription?')) return;

        setProcessing('cancel');
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/subscriptions/cancel', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessage({ type: 'success', text: 'Subscription cancelled successfully' });
            fetchCurrentSubscription();
            setTimeout(() => window.location.reload(), 2000);
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to cancel subscription' });
            setProcessing(null);
        }
    };

    const getPlanIcon = (planName) => {
        const name = planName.toLowerCase();
        if (name === 'free') return <Star size={40} color="#6b7280" />;
        if (name === 'pro') return <Zap size={40} color="#f59e0b" />;
        if (name === 'business') return <Crown size={40} color="#8b5cf6" />;
        return <CreditCard size={40} />;
    };

    const getPlanColor = (planName) => {
        const name = planName.toLowerCase();
        if (name === 'free') return '#6b7280';
        if (name === 'pro') return '#f59e0b';
        if (name === 'business') return '#8b5cf6';
        return '#3b82f6';
    };

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading subscription plans...</div>;
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Subscription Plans</h1>
                <p style={{ fontSize: '1.125rem', color: '#6b7280' }}>Choose the perfect plan for your freelance business</p>
            </div>

            {currentPlan && currentPlan !== 'free' && (
                <div style={{
                    background: '#f3f4f6',
                    borderRadius: '12px',
                    padding: '1rem',
                    marginBottom: '2rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem'
                }}>
                    <div>
                        <span style={{ fontWeight: '600' }}>Current Plan: </span>
                        <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '20px',
                            background: '#d1fae5',
                            color: '#065f46',
                            fontWeight: '500'
                        }}>
                            {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
                        </span>
                    </div>
                    <button
                        onClick={handleCancelSubscription}
                        disabled={processing === 'cancel'}
                        style={{
                            padding: '0.5rem 1rem',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            opacity: processing === 'cancel' ? 0.5 : 1
                        }}
                    >
                        {processing === 'cancel' ? 'Processing...' : 'Cancel Subscription'}
                    </button>
                </div>
            )}

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

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '2rem'
            }}>
                {plans.map((plan) => {
                    const isCurrentPlan = currentPlan === plan.name.toLowerCase();
                    const planColor = getPlanColor(plan.name);
                    
                    return (
                        <div
                            key={plan.id}
                            style={{
                                background: 'white',
                                borderRadius: '20px',
                                padding: '2rem',
                                boxShadow: plan.popular ? '0 20px 35px -10px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.1)',
                                border: plan.popular ? `2px solid ${planColor}` : '1px solid #e5e7eb',
                                position: 'relative',
                                transition: 'transform 0.3s'
                            }}
                        >
                            {plan.popular && (
                                <div style={{
                                    position: 'absolute',
                                    top: '-12px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    background: planColor,
                                    color: 'white',
                                    padding: '0.25rem 1.5rem',
                                    borderRadius: '20px',
                                    fontSize: '0.75rem',
                                    fontWeight: '600'
                                }}>
                                    MOST POPULAR
                                </div>
                            )}
                            
                            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    background: `${planColor}20`,
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 1rem'
                                }}>
                                    {getPlanIcon(plan.name)}
                                </div>
                                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{plan.name}</h2>
                                <div>
                                    <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: planColor }}>₹{plan.price}</span>
                                    <span style={{ color: '#6b7280' }}>/{plan.interval}</span>
                                </div>
                            </div>
                            
                            <div style={{ marginBottom: '2rem' }}>
                                {plan.features.map((feature, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                        <Check size={18} color="#10b981" />
                                        <span style={{ fontSize: '0.875rem' }}>{feature}</span>
                                    </div>
                                ))}
                            </div>
                            
                            {isCurrentPlan ? (
                                <button
                                    disabled
                                    style={{
                                        width: '100%',
                                        padding: '0.875rem',
                                        background: '#e5e7eb',
                                        color: '#6b7280',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        cursor: 'not-allowed'
                                    }}
                                >
                                    Current Plan
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleSubscribe(plan)}
                                    disabled={processing === plan.id}
                                    style={{
                                        width: '100%',
                                        padding: '0.875rem',
                                        background: planColor,
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        opacity: processing === plan.id ? 0.5 : 1
                                    }}
                                >
                                    {processing === plan.id ? 'Processing...' : `Upgrade to ${plan.name}`}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SubscriptionPlans;