import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Crown, User, Bell, Shield, ArrowRight, CheckCircle, AlertCircle, Key, X } from 'lucide-react';
import ProfileProgress from '../components/ProfileProgress';

// Inject mobile-responsive styles for Settings page
if (!document.querySelector('style[data-settings-responsive]')) {
  const s = document.createElement('style');
  s.setAttribute('data-settings-responsive', 'true');
  s.textContent = `
    @media (max-width: 640px) {
      .settings-root {
        padding: 1rem 0.75rem !important;
      }
      .settings-profile-header {
        flex-wrap: wrap !important;
        gap: 0.5rem !important;
      }
      .settings-profile-header h2 {
        font-size: 1.05rem !important;
      }
      .settings-profile-header button {
        align-self: flex-end;
        margin-left: auto;
      }
      .settings-info-grid {
        grid-template-columns: 1fr !important;
      }
      .settings-info-grid .span-2 {
        grid-column: span 1 !important;
      }
      .settings-2fa-inner {
        flex-direction: column !important;
        align-items: flex-start !important;
      }
      .settings-form-grid {
        grid-template-columns: 1fr !important;
      }
      .settings-section {
        padding: 1rem !important;
      }
      .settings-email {
        word-break: break-all;
        font-size: 0.875rem !important;
      }
    }
  `;
  document.head.appendChild(s);
}

const Settings = () => {
  const { user, updateProfile, refreshUser } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  // Profile Edit States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');
  const [portfolioLinks, setPortfolioLinks] = useState('');
  const [hourlyRate, setHourlyRate] = useState(0);
  const [availabilityStatus, setAvailabilityStatus] = useState('available');
  const [responseTimeHours, setResponseTimeHours] = useState(24);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // Payment Info States
  const [upiId, setUpiId] = useState('');
  const [paymentApp, setPaymentApp] = useState('');
  const [bankAccountHolderName, setBankAccountHolderName] = useState('');
  const [qrCodeImage, setQrCodeImage] = useState('');
  const [uploadingQr, setUploadingQr] = useState(false);

  // 2FA States
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [twoFactorQrCode, setTwoFactorQrCode] = useState('');
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState('');
  const [twoFactorSuccess, setTwoFactorSuccess] = useState('');

  useEffect(() => {
    fetchSubscription();
  }, []);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setCompanyName(user.company_name || '');
      setBio(user.bio || '');
      setSkills(user.skills?.join(', ') || '');
      setPortfolioLinks(user.portfolio_links?.join('\n') || '');
      setHourlyRate(user.hourly_rate || 0);
      setAvailabilityStatus(user.availability_status || 'available');
      setResponseTimeHours(user.response_time_hours || 24);
      setIs2FAEnabled(user.is_2fa_enabled || false);
      
      if (user.payment_info) {
        setUpiId(user.payment_info.upi_id || '');
        setPaymentApp(user.payment_info.payment_app || '');
        setBankAccountHolderName(user.payment_info.bank_account_holder_name || '');
        setQrCodeImage(user.payment_info.qr_code_image || '');
      }
    }
  }, [user]);

  const fetchSubscription = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/subscriptions/my-subscription', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubscription(response.data);
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');
    setProfileSaving(true);

    const skillsArray = skills.split(',').map(s => s.trim()).filter(s => s !== '');
    const portfolioArray = portfolioLinks.split('\n').map(link => link.trim()).filter(link => link !== '');

    const result = await updateProfile({
      full_name: fullName,
      company_name: companyName,
      bio,
      skills: skillsArray,
      portfolio_links: portfolioArray,
      availability_status: availabilityStatus,
      response_time_hours: Number(responseTimeHours) || 24,
      hourly_rate: Number(hourlyRate),
      payment_info: {
        upi_id: upiId,
        payment_app: paymentApp,
        bank_account_holder_name: bankAccountHolderName,
        qr_code_image: qrCodeImage
      }
    });

    if (result.success) {
      setProfileSuccess('Profile updated successfully!');
      setIsEditingProfile(false);
      setTimeout(() => setProfileSuccess(''), 3000);
    } else {
      setProfileError(result.error);
    }
    setProfileSaving(false);
  };

  const handleQrUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingQr(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      if (response.data.success) {
        setQrCodeImage(response.data.url);
      }
    } catch (err) {
      setProfileError('Failed to upload QR code');
    } finally {
      setUploadingQr(false);
    }
  };

  const handleEnable2FAClick = async () => {
    setTwoFactorError('');
    setTwoFactorSuccess('');
    setTwoFactorLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/auth/generate-2fa', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setTwoFactorQrCode(response.data.qrCode);
        setTwoFactorSecret(response.data.secret);
        setShow2FASetup(true);
      }
    } catch (err) {
      setTwoFactorError(err.response?.data?.error || 'Failed to generate 2FA secret.');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleVerify2FASetup = async (e) => {
    e.preventDefault();
    setTwoFactorError('');
    setTwoFactorSuccess('');
    setTwoFactorLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/auth/verify-2fa-setup', { code: twoFactorCode }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setTwoFactorSuccess('Two-Factor Authentication is now enabled!');
        setShow2FASetup(false);
        setTwoFactorCode('');
        await refreshUser();
      }
    } catch (err) {
      setTwoFactorError(err.response?.data?.error || 'Invalid code. Verification failed.');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!window.confirm('Are you sure you want to disable Two-Factor Authentication? Your account will be less secure.')) {
      return;
    }
    setTwoFactorError('');
    setTwoFactorSuccess('');
    setTwoFactorLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/auth/disable-2fa', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setTwoFactorSuccess('Two-Factor Authentication disabled successfully.');
        await refreshUser();
      }
    } catch (err) {
      setTwoFactorError(err.response?.data?.error || 'Failed to disable 2FA.');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const getPlanDisplay = () => {
    if (!user) return 'Free';
    const plan = user.subscription_tier;
    if (!plan || plan === 'free') return 'Free';
    if (plan === 'pro') return 'Pro';
    if (plan === 'business') return 'Business';
    return 'Free';
  };

  const getPlanColor = () => {
    const plan = getPlanDisplay();
    if (plan === 'Free') return '#fef3c7';
    if (plan === 'Pro') return '#d1fae5';
    if (plan === 'Business') return '#e0e7ff';
    return '#f3f4f6';
  };

  const getPlanTextColor = () => {
    const plan = getPlanDisplay();
    if (plan === 'Free') return '#92400e';
    if (plan === 'Pro') return '#065f46';
    if (plan === 'Business') return '#3730a3';
    return '#6b7280';
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div>Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="settings-root" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem', fontWeight: '800', color: '#1e293b' }}>Settings</h1>
      
      <div style={{ display: 'grid', gap: '1.5rem' }}>

        <ProfileProgress user={user} />
        
        {/* ==================== PROFILE SECTION ==================== */}
        <div className="settings-section" style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div className="settings-profile-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <User size={24} color="#3b82f6" />
              <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: '700', color: '#1e293b' }}>Profile Information</h2>
            </div>
            {!isEditingProfile && (
              <button
                onClick={() => setIsEditingProfile(true)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#eff6ff',
                  color: '#3b82f6',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                Edit Profile
              </button>
            )}
          </div>

          {profileSuccess && (
            <div style={{
              backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0',
              padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem',
              display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}>
              <CheckCircle size={16} />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div style={{
              backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca',
              padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem',
              display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}>
              <AlertCircle size={16} />
              <span>{profileError}</span>
            </div>
          )}

          {isEditingProfile ? (
            <form onSubmit={handleSaveProfile}>
              <div className="settings-form-grid" style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
                <div className="form-group">
                  <label style={{ fontWeight: '600', fontSize: '0.875rem', color: '#475569' }}>Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    style={{ padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '8px', width: '100%', fontSize: '0.95rem' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontWeight: '600', fontSize: '0.875rem', color: '#475569' }}>Company Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    style={{ padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '8px', width: '100%', fontSize: '0.95rem' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontWeight: '600', fontSize: '0.875rem', color: '#475569' }}>Hourly Rate (USD)</label>
                  <input
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    style={{ padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '8px', width: '100%', fontSize: '0.95rem' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontWeight: '600', fontSize: '0.875rem', color: '#475569' }}>Availability</label>
                  <select
                    value={availabilityStatus}
                    onChange={(e) => setAvailabilityStatus(e.target.value)}
                    style={{ padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '8px', width: '100%', fontSize: '0.95rem' }}
                  >
                    <option value="available">Available now</option>
                    <option value="busy">Busy</option>
                    <option value="away">Away</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontWeight: '600', fontSize: '0.875rem', color: '#475569' }}>Response Time (hours)</label>
                  <input
                    type="number"
                    min="1"
                    value={responseTimeHours}
                    onChange={(e) => setResponseTimeHours(e.target.value)}
                    style={{ padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '8px', width: '100%', fontSize: '0.95rem' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontWeight: '600', fontSize: '0.875rem', color: '#475569' }}>Skills (comma separated)</label>
                  <input
                    type="text"
                    placeholder="React, Node.js, Design"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    style={{ padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '8px', width: '100%', fontSize: '0.95rem' }}
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#1e293b' }}>Payment Information</h3>
                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
                  <div>
                    <label style={{ fontWeight: '600', fontSize: '0.875rem', color: '#475569' }}>UPI ID *</label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="e.g. yourname@okaxis"
                      style={{ padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '8px', width: '100%', fontSize: '0.95rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontWeight: '600', fontSize: '0.875rem', color: '#475569' }}>Payment App</label>
                    <select
                      value={paymentApp}
                      onChange={(e) => setPaymentApp(e.target.value)}
                      style={{ padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '8px', width: '100%', fontSize: '0.95rem' }}
                    >
                      <option value="">Select App</option>
                      <option value="Google Pay">Google Pay</option>
                      <option value="PhonePe">PhonePe</option>
                      <option value="Paytm">Paytm</option>
                      <option value="BHIM">BHIM</option>
                      <option value="Amazon Pay">Amazon Pay</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontWeight: '600', fontSize: '0.875rem', color: '#475569' }}>Bank Holder Name (Optional)</label>
                    <input
                      type="text"
                      value={bankAccountHolderName}
                      onChange={(e) => setBankAccountHolderName(e.target.value)}
                      style={{ padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '8px', width: '100%', fontSize: '0.95rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontWeight: '600', fontSize: '0.875rem', color: '#475569' }}>Upload QR Code</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleQrUpload}
                      disabled={uploadingQr}
                      style={{ display: 'block', marginTop: '0.5rem' }}
                    />
                    {uploadingQr && <span style={{ fontSize: '0.85rem', color: '#3b82f6' }}>Uploading...</span>}
                    {qrCodeImage && !uploadingQr && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <img src={`http://localhost:5000${qrCodeImage}`} alt="QR Code" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label style={{ fontWeight: '600', fontSize: '0.875rem', color: '#475569' }}>Bio / Description</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows="3"
                  placeholder="Tell clients about yourself..."
                  style={{ padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '8px', width: '100%', fontSize: '0.95rem', fontFamily: 'inherit' }}
                />
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label style={{ fontWeight: '600', fontSize: '0.875rem', color: '#475569' }}>Portfolio Links</label>
                <textarea
                  value={portfolioLinks}
                  onChange={(e) => setPortfolioLinks(e.target.value)}
                  rows="3"
                  placeholder="https://yourportfolio.com&#10;https://github.com/yourname"
                  style={{ padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '8px', width: '100%', fontSize: '0.95rem', fontFamily: 'inherit' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="submit"
                  disabled={profileSaving}
                  style={{
                    padding: '0.5rem 1.25rem', backgroundColor: '#3b82f6', color: 'white',
                    border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer',
                    opacity: profileSaving ? 0.6 : 1
                  }}
                >
                  {profileSaving ? 'Saving...' : 'Save Profile'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  style={{
                    padding: '0.5rem 1.25rem', backgroundColor: '#f1f5f9', color: '#475569',
                    border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="settings-info-grid" style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Full Name</label>
                <p style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b' }}>{user?.full_name || 'Not set'}</p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Email</label>
                <p className="settings-email" style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', wordBreak: 'break-all' }}>{user?.email || 'Not set'}</p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Company</label>
                <p style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b' }}>{user?.company_name || 'Not specified'}</p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Hourly Rate</label>
                <p style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b' }}>{user?.hourly_rate ? `$${user.hourly_rate}/hr` : 'Not set'}</p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Availability</label>
                <p style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b' }}>
                  {user?.availability_status === 'busy' ? 'Busy' : user?.availability_status === 'away' ? 'Away' : 'Available now'}
                </p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Response Status</label>
                <p style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b' }}>Responds within {user?.response_time_hours || 24}h</p>
              </div>
              <div className="span-2" style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Skills</label>
                <p style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b' }}>
                  {user?.skills && user.skills.length > 0 ? user.skills.join(', ') : 'No skills added'}
                </p>
              </div>
              <div className="span-2" style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Bio</label>
                <p style={{ fontSize: '0.95rem', color: '#334155', lineHeight: '1.5' }}>{user?.bio || 'No bio added yet.'}</p>
              </div>
              <div className="span-2" style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Portfolio</label>
                {user?.portfolio_links && user.portfolio_links.length > 0 ? (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {user.portfolio_links.map((link, index) => (
                      <a key={index} href={link} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontWeight: 600, fontSize: '0.9rem' }}>
                        {link}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.95rem', color: '#334155' }}>No portfolio links added yet.</p>
                )}
              </div>
              <div className="span-2" style={{ gridColumn: 'span 2', marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#1e293b' }}>Payment Information</h3>
                {user?.payment_info?.upi_id ? (
                  <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>UPI ID</label>
                      <p style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b' }}>{user.payment_info.upi_id}</p>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Payment App</label>
                      <p style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b' }}>{user.payment_info.payment_app || 'Not specified'}</p>
                    </div>
                    {user.payment_info.bank_account_holder_name && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Bank Holder</label>
                        <p style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b' }}>{user.payment_info.bank_account_holder_name}</p>
                      </div>
                    )}
                    {user.payment_info.qr_code_image && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>QR Code</label>
                        <img src={`http://localhost:5000${user.payment_info.qr_code_image}`} alt="QR Code" style={{ width: '80px', height: '80px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                      </div>
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.95rem', color: '#334155' }}>No payment information configured.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ==================== SUBSCRIPTION SECTION ==================== */}
        <div className="settings-section" style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Crown size={24} color="#f59e0b" />
            <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: '700', color: '#1e293b' }}>Subscription Plan</h2>
          </div>
          
          <div>
            <div style={{
              display: 'inline-block',
              padding: '0.5rem 1.5rem',
              borderRadius: '20px',
              background: getPlanColor(),
              color: getPlanTextColor(),
              marginBottom: '1rem',
              fontWeight: '600'
            }}>
              {getPlanDisplay()} Plan
            </div>
            
            {getPlanDisplay() === 'Free' ? (
              <div>
                <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
                  You are on the Free plan. Upgrade to Pro or Business for unlimited features.
                </p>
                <a
                  href="/subscription"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    background: '#3b82f6',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    fontWeight: '500'
                  }}
                >
                  View Plans
                  <ArrowRight size={16} />
                </a>
              </div>
            ) : (
              <div>
                <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
                  Your {getPlanDisplay()} subscription is active. You have access to all premium features.
                </p>
                <a
                  href="/subscription"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    background: '#6b7280',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    fontWeight: '500'
                  }}
                >
                  Manage Subscription
                  <ArrowRight size={16} />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* ==================== 2FA SECURITY SECTION ==================== */}
        <div className="settings-section" style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Key size={24} color="#10b981" />
            <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: '700', color: '#1e293b' }}>Two-Factor Authentication (2FA)</h2>
          </div>

          {twoFactorSuccess && (
            <div style={{
              backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0',
              padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem',
              display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}>
              <CheckCircle size={16} />
              <span>{twoFactorSuccess}</span>
            </div>
          )}

          {twoFactorError && (
            <div style={{
              backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca',
              padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem',
              display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}>
              <AlertCircle size={16} />
              <span>{twoFactorError}</span>
            </div>
          )}

          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
            Secure your account by adding an extra layer of security. Once set up, you'll need to provide a 6-digit verification code from Google Authenticator, Duo, or similar apps when logging in.
          </p>

          {is2FAEnabled ? (
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 1rem', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '20px', fontSize: '0.875rem', fontWeight: '700', marginBottom: '1.5rem' }}>
                <CheckCircle size={16} />
                2FA Enabled (Active)
              </div>
              <div>
                <button
                  onClick={handleDisable2FA}
                  disabled={twoFactorLoading}
                  style={{
                    padding: '0.6rem 1.25rem', backgroundColor: '#fee2e2', color: '#991b1b',
                    border: '1px solid #fca5a5', borderRadius: '8px', fontWeight: '600', cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#fecaca'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#fee2e2'}
                >
                  {twoFactorLoading ? 'Disabling...' : 'Disable Two-Factor Authentication'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 1rem', backgroundColor: '#f1f5f9', color: '#64748b', borderRadius: '20px', fontSize: '0.875rem', fontWeight: '700', marginBottom: '1.5rem' }}>
                2FA Disabled
              </div>
              {!show2FASetup ? (
                <div>
                  <button
                    onClick={handleEnable2FAClick}
                    disabled={twoFactorLoading}
                    style={{
                      padding: '0.6rem 1.25rem', backgroundColor: '#3b82f6', color: 'white',
                      border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
                  >
                    {twoFactorLoading ? 'Generating QR Code...' : 'Enable Two-Factor Authentication'}
                  </button>
                </div>
              ) : (
                <div style={{
                  border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem',
                  backgroundColor: '#f8fafc', marginTop: '1rem', maxWidth: '520px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1e293b' }}>Scan QR Code</h3>
                    <button
                      onClick={() => setShow2FASetup(false)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="settings-2fa-inner" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{
                      backgroundColor: 'white', padding: '0.5rem', borderRadius: '8px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #cbd5e1'
                    }}>
                      <img src={twoFactorQrCode} alt="2FA QR Code" style={{ width: '150px', height: '150px', display: 'block' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: '1.5' }}>
                        1. Open Google Authenticator or your preference TOTP app.
                      </p>
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#475569', lineHeight: '1.5' }}>
                        2. Scan the QR code, or enter this secret key manually:
                      </p>
                      <code style={{
                        display: 'block', backgroundColor: '#e2e8f0', padding: '0.35rem 0.5rem',
                        borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', marginTop: '0.25rem',
                        wordBreak: 'break-all', color: '#0f172a'
                      }}>
                        {twoFactorSecret}
                      </code>
                    </div>
                  </div>

                  <form onSubmit={handleVerify2FASetup} style={{ marginTop: '1.5rem' }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.85rem', color: '#475569' }}>
                        Enter 6-digit Authenticator Code
                      </label>
                      <input
                        type="text"
                        maxLength="6"
                        placeholder="000000"
                        value={twoFactorCode}
                        onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                        required
                        style={{
                          width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1',
                          borderRadius: '8px', fontSize: '1rem', fontWeight: '600', letterSpacing: '0.15em',
                          textAlign: 'center', outline: 'none'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button
                        type="submit"
                        disabled={twoFactorLoading}
                        style={{
                          padding: '0.5rem 1.25rem', backgroundColor: '#10b981', color: 'white',
                          border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer',
                          opacity: twoFactorLoading ? 0.6 : 1
                        }}
                      >
                        {twoFactorLoading ? 'Verifying...' : 'Verify & Enable'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShow2FASetup(false)}
                        style={{
                          padding: '0.5rem 1.25rem', backgroundColor: '#e2e8f0', color: '#475569',
                          border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ==================== NOTIFICATIONS SECTION ==================== */}
        <div className="settings-section" style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Bell size={24} color="#8b5cf6" />
            <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: '700', color: '#1e293b' }}>Notifications</h2>
          </div>
          <p style={{ color: '#6b7280' }}>Email notifications for invoices, payments, and reminders coming soon.</p>
        </div>

        {/* ==================== SECURITY / DELETE ACCOUNT SECTION ==================== */}
        <div className="settings-section" style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Shield size={24} color="#ef4444" />
            <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: '700', color: '#1e293b' }}>Danger Zone</h2>
          </div>
          <button
            style={{
              padding: '0.75rem 1.5rem',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
            onClick={() => {
              if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                alert('Please contact support to delete your account.');
              }
            }}
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
