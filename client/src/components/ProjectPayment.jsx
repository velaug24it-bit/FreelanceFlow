import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { CreditCard, CheckCircle, Clock, AlertCircle, Loader, UploadCloud, XCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const getBaseUrl = () => {
  let baseUrl = API_URL.replace(/\/api$/, '');
  const isLocal = (host) => {
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.startsWith('172.') ||
      host.endsWith('.local')
    );
  };
  if (baseUrl.includes('localhost') && window.location.hostname !== 'localhost' && isLocal(window.location.hostname)) {
    baseUrl = baseUrl.replace('localhost', window.location.hostname);
  }
  return baseUrl;
};
const BASE_URL = getBaseUrl();

const ProjectPayment = ({ project, isClient, isFreelancer }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [freelancerInfo, setFreelancerInfo] = useState(null);
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [paymentStatus, setPaymentStatus] = useState(project?.payment_status || 'pending');
  const [hasViewedDemo, setHasViewedDemo] = useState(false);

  const fetchFreelancerInfo = useCallback(async () => {
    if (!project?.selected_freelancer_id) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      // If project has selected_freelancer_id as string/object, fetch it
      const freelancerId = typeof project.selected_freelancer_id === 'object' ? project.selected_freelancer_id._id : project.selected_freelancer_id;
      if (freelancerId) {
         const res = await axios.get(`${API_URL}/auth/user/${freelancerId}`);
         setFreelancerInfo(res.data.user);
      }
    } catch (err) {
      console.error('Failed to load freelancer payment info', err);
    } finally {
      setLoading(false);
    }
  }, [project]);

  useEffect(() => {
    fetchFreelancerInfo();
  }, [fetchFreelancerInfo]);

  useEffect(() => {
    if (project?.payment_status) {
      setPaymentStatus(project.payment_status);
    }
  }, [project]);

  const handleUploadScreenshot = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setProcessing(true);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      setScreenshotUrl(res.data.url);
    } catch (err) {
      setError('Failed to upload screenshot.');
    } finally {
      setProcessing(false);
    }
  };

  const handleUploadDocument = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setProcessing(true);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      setDocumentUrl(res.data.url);
    } catch (err) {
      setError('Failed to upload document.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmitPayment = async () => {
    if (!screenshotUrl) {
      setError('Please upload a payment screenshot first.');
      return;
    }
    
    setProcessing(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/marketplace/${project._id}/submit-payment`, {
        screenshotUrl
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        setSuccess('Payment submitted successfully! Waiting for freelancer approval.');
        setPaymentStatus('payment_pending_verification');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit payment.');
    } finally {
      setProcessing(false);
    }
  };

  const handleVerifyPayment = async (approved) => {
    if (!approved && !rejectionReason.trim()) {
      setError('Please provide a reason for rejecting the payment.');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/marketplace/${project._id}/verify-payment`, {
        approved,
        reason: approved ? '' : rejectionReason,
        documentUrl: approved ? documentUrl : ''
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setSuccess(`Payment ${approved ? 'approved' : 'rejected'} successfully.`);
        setPaymentStatus(approved ? 'paid' : 'failed');
        if (approved) {
           setTimeout(() => { window.location.reload(); }, 2000);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to verify payment.');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = () => {
    const status = paymentStatus || 'unpaid';
    const badges = {
      unpaid: { color: '#f59e0b', text: 'Payment Pending', icon: Clock },
      pending: { color: '#f59e0b', text: 'Payment Pending', icon: Clock },
      payment_pending_verification: { color: '#3b82f6', text: 'Verification Pending', icon: Loader },
      paid: { color: '#10b981', text: 'Payment Completed ✓', icon: CheckCircle },
      failed: { color: '#ef4444', text: 'Payment Failed', icon: AlertCircle },
    };
    return badges[status] || badges.unpaid;
  };

  // Don't render if project is not completed (waiting for release)
  // Or render if payment is in progress
  if (!project || (project.status !== 'completed' && paymentStatus === 'pending' && !project.release_requested)) {
    return null;
  }

  const isClientUser = isClient || project?.client_id?._id === user?.id || project?.client_id === user?.id;
  const isFreelancerUser = isFreelancer || project?.selected_freelancer_id?._id === user?.id || project?.selected_freelancer_id === user?.id;

  if (!isClientUser && !isFreelancerUser) {
    return null;
  }

  const statusBadge = getStatusBadge();
  const bidAmt = project?.bid_amount || project?.budget_max || 0;
  
  // Extract payment info from project object (it should be populated or embedded in some way)
  const freelancerPaymentInfo = typeof project.selected_freelancer_id === 'object' 
    ? project.selected_freelancer_id.payment_info 
    : (freelancerInfo?.payment_info || null);

  return (
    <div style={{
      marginTop: '1.5rem',
      background: 'white',
      borderRadius: '12px',
      padding: '1.5rem',
      border: '1px solid #e5e7eb',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CreditCard size={20} color="#3b82f6" />
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Direct Payment</h3>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.25rem 0.75rem',
          borderRadius: '20px',
          background: statusBadge.color + '20',
          color: statusBadge.color
        }}>
          <statusBadge.icon size={14} />
          <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>{statusBadge.text}</span>
        </div>
      </div>

      <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center' }}>
        <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Amount to Pay</p>
        <p style={{ fontSize: '2rem', fontWeight: '700', color: '#0f172a' }}>₹{bidAmt.toLocaleString()}</p>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}
      
      {success && (
        <div style={{ background: '#d1fae5', color: '#065f46', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={18} /> {success}
        </div>
      )}

      {/* CLIENT VIEW */}
      {isClientUser && (
        <>
          {paymentStatus === 'pending' || paymentStatus === 'unpaid' || paymentStatus === 'failed' ? (
            <div>
              {project?.demo_video_url && (
                <div style={{
                  marginBottom: '1.5rem',
                  padding: '1.25rem',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  textAlign: 'left'
                }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b' }}>
                    📽️ Project Demo Video
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1rem 0' }}>
                    The freelancer has uploaded a screen recording of their local implementation. Please watch it and check the box to unlock the payment button.
                  </p>
                  
                  <video 
                    src={project.demo_video_url.startsWith('http') ? project.demo_video_url : `${BASE_URL}${project.demo_video_url}`} 
                    controls 
                    style={{ width: '100%', maxHeight: '300px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#000', marginBottom: '1rem' }}
                    onPlay={() => setHasViewedDemo(true)}
                  />

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <input 
                      type="checkbox" 
                      id="confirm-demo-checkbox"
                      checked={hasViewedDemo} 
                      onChange={(e) => setHasViewedDemo(e.target.checked)} 
                    />
                    <label htmlFor="confirm-demo-checkbox" style={{ fontSize: '0.85rem', fontWeight: '500', color: '#334155', cursor: 'pointer' }}>
                      I have reviewed and approved the demo video of the project.
                    </label>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowPaymentModal(true)}
                disabled={project?.demo_video_url && !hasViewedDemo}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: (project?.demo_video_url && !hasViewedDemo) ? '#9ca3af' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: (project?.demo_video_url && !hasViewedDemo) ? 'not-allowed' : 'pointer',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => { if (!(project?.demo_video_url && !hasViewedDemo)) e.currentTarget.style.background = '#059669'; }}
                onMouseLeave={(e) => { if (!(project?.demo_video_url && !hasViewedDemo)) e.currentTarget.style.background = '#10b981'; }}
              >
                <CreditCard size={20} />
                Pay ₹{bidAmt.toLocaleString()}
              </button>

              {showPaymentModal && (
                <div style={{
                  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 1000, padding: '1rem'
                }}>
                  <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    width: '100%',
                    maxWidth: '600px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    padding: '2rem',
                    position: 'relative'
                  }}>
                    <button
                      onClick={() => setShowPaymentModal(false)}
                      style={{
                        position: 'absolute', top: '1rem', right: '1rem',
                        background: 'transparent', border: 'none',
                        cursor: 'pointer', color: '#64748b'
                      }}
                    >
                      <XCircle size={24} />
                    </button>
                    
                    <h2 style={{ margin: '0 0 1.5rem 0', color: '#1e293b' }}>Complete Payment</h2>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem' }}>
                        <h4 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>Freelancer Payment Details</h4>
                        {freelancerPaymentInfo ? (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                            <div>
                              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 0.25rem 0' }}>UPI ID</p>
                              <p style={{ fontWeight: '600', margin: 0 }}>{freelancerPaymentInfo.upi_id}</p>
                            </div>
                            <div>
                              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 0.25rem 0' }}>Payment App</p>
                              <p style={{ fontWeight: '600', margin: 0 }}>{freelancerPaymentInfo.payment_app || 'N/A'}</p>
                            </div>
                            {freelancerPaymentInfo.bank_account_holder_name && (
                              <div style={{ gridColumn: 'span 2' }}>
                                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 0.25rem 0' }}>Account Holder</p>
                                <p style={{ fontWeight: '600', margin: 0 }}>{freelancerPaymentInfo.bank_account_holder_name}</p>
                              </div>
                            )}
                            {freelancerPaymentInfo.qr_code_image && (
                              <div style={{ gridColumn: 'span 2', textAlign: 'center', marginTop: '1rem' }}>
                                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 0.5rem 0' }}>Scan to Pay</p>
                                <img src={`${BASE_URL}${freelancerPaymentInfo.qr_code_image}`} alt="QR Code" style={{ width: '150px', height: '150px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                              </div>
                            )}
                          </div>
                        ) : (
                          <p style={{ color: '#ef4444', fontSize: '0.9rem' }}>Freelancer has not provided payment details yet. Please contact them.</p>
                        )}
                      </div>

                      {freelancerPaymentInfo && (
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem' }}>
                          <h4 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>Submit Payment Proof</h4>
                          <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1rem' }}>
                            After paying ₹{bidAmt} using the details above, upload a screenshot of the successful transaction.
                          </p>
                          
                          <input type="file" accept="image/*" onChange={handleUploadScreenshot} disabled={processing} style={{ marginBottom: '1rem', display: 'block' }} />
                          
                          {screenshotUrl && (
                            <div style={{ marginBottom: '1rem' }}>
                              <p style={{ fontSize: '0.85rem', color: '#10b981', marginBottom: '0.5rem' }}>Screenshot uploaded successfully</p>
                              <img src={`${BASE_URL}${screenshotUrl}`} alt="Payment Proof" style={{ height: '100px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                            </div>
                          )}

                          <button
                            onClick={handleSubmitPayment}
                            disabled={processing || !screenshotUrl}
                            style={{
                              width: '100%', padding: '0.75rem', background: (processing || !screenshotUrl) ? '#9ca3af' : '#3b82f6',
                              color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: (processing || !screenshotUrl) ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {processing ? 'Submitting...' : 'Submit Payment'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : paymentStatus === 'payment_pending_verification' ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', background: '#eff6ff', borderRadius: '8px', color: '#1e40af' }}>
              <Clock size={24} style={{ margin: '0 auto 0.5rem auto' }} />
              <p style={{ fontWeight: '600', margin: '0 0 0.5rem 0' }}>Verification Pending</p>
              <p style={{ fontSize: '0.9rem', margin: 0 }}>Your payment screenshot has been sent to the freelancer. Waiting for their approval.</p>
            </div>
          ) : paymentStatus === 'paid' ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', background: '#d1fae5', borderRadius: '8px', color: '#065f46' }}>
              <CheckCircle size={24} style={{ margin: '0 auto 0.5rem auto' }} />
              <p style={{ fontWeight: '600', margin: '0 0 0.5rem 0' }}>Payment Completed</p>
              <p style={{ fontSize: '0.9rem', margin: 0 }}>The freelancer has verified and accepted the payment.</p>
            </div>
          ) : null}
          
          {project?.final_delivery_document && paymentStatus === 'paid' && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#0369a1' }}>Final Project Document</h4>
              <p style={{ fontSize: '0.9rem', color: '#0c4a6e', marginBottom: '0.75rem' }}>The freelancer has attached the final project delivery.</p>
              <a 
                href={project.final_delivery_document.startsWith('http') ? project.final_delivery_document : `${BASE_URL}${project.final_delivery_document}`} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ display: 'inline-block', padding: '0.5rem 1rem', background: '#0284c7', color: 'white', textDecoration: 'none', borderRadius: '6px', fontSize: '0.9rem', fontWeight: '500' }}
              >
                Download Document
              </a>
            </div>
          )}
        </>
      )}

      {/* FREELANCER VIEW */}
      {isFreelancerUser && (
        <>
          {paymentStatus === 'pending' || paymentStatus === 'unpaid' ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', background: '#fef3c7', borderRadius: '8px', color: '#92400e' }}>
              <Clock size={24} style={{ margin: '0 auto 0.5rem auto' }} />
              <p style={{ fontWeight: '600', margin: '0 0 0.5rem 0' }}>Waiting for Client Payment</p>
              <p style={{ fontSize: '0.9rem', margin: 0 }}>The client has been notified to make the direct payment to your UPI account.</p>
            </div>
          ) : paymentStatus === 'payment_pending_verification' ? (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>Verify Client Payment</h4>
              <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '1rem' }}>
                The client has submitted a payment screenshot for ₹{bidAmt}. Please check your bank account to verify the transaction.
              </p>
              
              {project.payment_screenshot && (
                <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                  <img src={project.payment_screenshot.startsWith('http') ? project.payment_screenshot : `${BASE_URL}${project.payment_screenshot}`} 
                       alt="Payment Proof" 
                       style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
              )}

              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                <h5 style={{ margin: '0 0 0.5rem 0', color: '#334155' }}>Final Project Delivery</h5>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.75rem' }}>Upload the final project files or a document containing links to the delivery before approving.</p>
                <input type="file" onChange={handleUploadDocument} disabled={processing} style={{ width: '100%' }} />
                {documentUrl && <p style={{ color: '#10b981', fontSize: '0.85rem', marginTop: '0.5rem' }}>✓ Document uploaded</p>}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                <button
                  onClick={() => handleVerifyPayment(true)}
                  disabled={processing || !documentUrl}
                  style={{
                    flex: 1, padding: '0.75rem', background: (processing || !documentUrl) ? '#9ca3af' : '#10b981', color: 'white', border: 'none', 
                    borderRadius: '8px', fontWeight: '600', cursor: (processing || !documentUrl) ? 'not-allowed' : 'pointer'
                  }}
                >
                  Approve Payment & Submit Project
                </button>
              </div>
              
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem', marginTop: '1rem' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b', marginBottom: '0.5rem' }}>Reject Payment?</p>
                <input 
                  type="text" 
                  value={rejectionReason} 
                  onChange={(e) => setRejectionReason(e.target.value)} 
                  placeholder="Reason for rejection (e.g. Amount not received)"
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '8px', marginBottom: '0.5rem' }}
                />
                <button
                  onClick={() => handleVerifyPayment(false)}
                  disabled={processing || !rejectionReason.trim()}
                  style={{
                    width: '100%', padding: '0.5rem', background: 'white', color: '#ef4444', border: '1px solid #ef4444', 
                    borderRadius: '8px', fontWeight: '600', cursor: (processing || !rejectionReason.trim()) ? 'not-allowed' : 'pointer'
                  }}
                >
                  Reject Payment
                </button>
              </div>
            </div>
          ) : paymentStatus === 'paid' ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', background: '#d1fae5', borderRadius: '8px', color: '#065f46' }}>
              <CheckCircle size={24} style={{ margin: '0 auto 0.5rem auto' }} />
              <p style={{ fontWeight: '600', margin: '0 0 0.5rem 0' }}>Payment Received</p>
              <p style={{ fontSize: '0.9rem', margin: 0 }}>You have successfully verified the payment.</p>
            </div>
          ) : paymentStatus === 'failed' ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', background: '#fee2e2', borderRadius: '8px', color: '#991b1b' }}>
              <XCircle size={24} style={{ margin: '0 auto 0.5rem auto' }} />
              <p style={{ fontWeight: '600', margin: '0 0 0.5rem 0' }}>Payment Rejected</p>
              <p style={{ fontSize: '0.9rem', margin: 0 }}>Reason: {project.rejection_reason}</p>
              <p style={{ fontSize: '0.85rem', margin: '0.5rem 0 0 0', color: '#b91c1c' }}>Waiting for client to submit a new proof.</p>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};

export default ProjectPayment;
