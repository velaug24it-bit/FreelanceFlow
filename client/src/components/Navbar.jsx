import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, FolderKanban, FileText,
  Kanban, CreditCard, BarChart3, Settings, LogOut,
  Crown, Shield, Zap, Briefcase, Menu, X,
  User, ChevronDown, DollarSign, Sparkles, TrendingUp
} from 'lucide-react';
import NotificationBell from './NotificationBell';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user?.email === 'admin@freelanceflow.com' || user?.role === 'admin';

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Clients', path: '/clients', icon: Users },
    { name: 'Projects', path: '/projects', icon: FolderKanban },
    { name: 'Task Board', path: '/kanban', icon: Kanban },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'Marketplace', path: '/marketplace', icon: Briefcase },
    { name: 'Connects', path: '/connects', icon: Zap },
    { name: 'AI Toolkit', path: '/ai-toolkit', icon: Sparkles },
    { name: 'AI Insights', path: '/ai-analytics', icon: TrendingUp },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const adminNavItems = [
    { name: 'Admin', path: '/admin-dashboard', icon: Shield },
    { name: 'Freelancers', path: '/admin-freelancers', icon: Users },
  ];

  const allNavItems = isAdmin ? [...navItems, ...adminNavItems] : navItems;

  const getPlanDisplay = () => {
    if (!user) return 'Free';
    const plan = user.subscription_tier || user.subscription_plan;
    if (!plan || plan === 'free') return 'Free';
    if (plan === 'pro') return 'Pro';
    if (plan === 'business') return 'Business';
    return 'Free';
  };

  const getPlanColor = () => {
    const plan = getPlanDisplay();
    if (plan === 'Free') return '#f59e0b';
    if (plan === 'Pro') return '#10b981';
    if (plan === 'Business') return '#8b5cf6';
    return '#6b7280';
  };

  const getInitials = () => {
    if (!user?.full_name) return 'U';
    return user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <nav style={{
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e5e7eb',
      padding: '0',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '0 0.75rem',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Logo - Left */}
        <Link to="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          textDecoration: 'none',
          flexShrink: 0
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '18px'
          }}>
            F
          </div>
          <span style={{
            fontSize: '1.25rem',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.5px'
          }}>
            FreelanceFlow
          </span>
        </Link>

        {/* Navigation - Center - Desktop Only */}
        <div className="mobile-hidden" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem',
          flexWrap: 'nowrap',
          overflow: 'visible',
          flex: 1,
          justifyContent: 'center',
          padding: '0 1rem'
        }}>
          {allNavItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.45rem 0.75rem',
                textDecoration: 'none',
                color: '#6b7280',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: '500',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f3f4f6';
                e.currentTarget.style.color = '#3b82f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#6b7280';
              }}
            >
              <item.icon size={15} />
              <span>{item.name}</span>
            </Link>
          ))}
        </div>

        {/* Right Side - User Dropdown - FIXED */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          flexShrink: 0
        }}>
          {/* Notification Bell - always visible */}
          <NotificationBell />

          {/* User Profile Dropdown - FIXED ALIGNMENT - Hidden on Mobile */}
          <div ref={dropdownRef} className="mobile-hidden" style={{ position: 'relative' }}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.3rem 0.6rem 0.3rem 0.3rem',
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '50px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: isDropdownOpen ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            >
              {/* Avatar */}
              <div style={{
                width: '32px',
                height: '32px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: '600',
                fontSize: '13px'
              }}>
                {getInitials()}
              </div>

              <div style={{ textAlign: 'left' }}>
                <div style={{
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  color: '#1f2937',
                  lineHeight: '1.2'
                }}>
                  {user?.full_name?.split(' ')[0] || 'User'}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  <span style={{
                    fontSize: '0.65rem',
                    color: getPlanColor(),
                    fontWeight: '600'
                  }}>
                    {getPlanDisplay()}
                  </span>
                  <span style={{
                    fontSize: '0.55rem',
                    color: '#9ca3af'
                  }}>
                    Plan
                  </span>
                </div>
              </div>

              <ChevronDown size={16} style={{
                color: '#6b7280',
                transition: 'transform 0.2s',
                transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0)'
              }} />
            </button>

            {/* Dropdown Menu - FIXED POSITION */}
            {isDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                minWidth: '220px',
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                border: '1px solid #e5e7eb',
                overflow: 'hidden',
                zIndex: 1000
              }}>
                {/* User Info */}
                <div style={{
                  padding: '1rem 1.25rem',
                  borderBottom: '1px solid #f3f4f6'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: '600',
                      fontSize: '16px'
                    }}>
                      {getInitials()}
                    </div>
                    <div>
                      <div style={{
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        color: '#1f2937'
                      }}>
                        {user?.full_name || 'User'}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#6b7280'
                      }}>
                        {user?.email || 'user@email.com'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dropdown Items */}
                <div style={{ padding: '0.25rem 0' }}>
                  <Link
                    to="/settings"
                    onClick={() => setIsDropdownOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.6rem 1.25rem',
                      textDecoration: 'none',
                      color: '#4b5563',
                      fontSize: '0.85rem',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <User size={16} />
                    Profile Settings
                  </Link>

                  <Link
                    to="/subscription"
                    onClick={() => setIsDropdownOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.6rem 1.25rem',
                      textDecoration: 'none',
                      color: '#4b5563',
                      fontSize: '0.85rem',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <DollarSign size={16} />
                    Subscription
                  </Link>
                </div>

                {/* Logout */}
                <div style={{
                  borderTop: '1px solid #f3f4f6',
                  padding: '0.25rem 0'
                }}>
                  <button
                    onClick={handleLogout}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.6rem 1.25rem',
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#ef4444',
                      fontSize: '0.85rem',
                      fontWeight: '500',
                      transition: 'all 0.15s',
                      textAlign: 'left'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="mobile-only"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem 0 0.5rem 0.5rem',
              marginRight: '-0.5rem',
              color: '#1f2937'
            }}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="mobile-only" style={{
          display: 'block',
          background: 'white',
          borderTop: '1px solid #e5e7eb',
          padding: '0.5rem 0',
          maxHeight: '80vh',
          overflowY: 'auto'
        }}>
          {allNavItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1.5rem',
                textDecoration: 'none',
                color: '#4b5563',
                fontSize: '0.9rem',
                fontWeight: '500',
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <item.icon size={18} />
              <span>{item.name}</span>
            </Link>
          ))}

          {/* Mobile Logout */}
          <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                handleLogout();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1.5rem',
                width: '100%',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#ef4444',
                fontSize: '0.9rem',
                fontWeight: '500',
                textAlign: 'left'
              }}
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

// Add responsive styles
const style = document.createElement('style');
style.textContent = `
  @media (max-width: 768px) {
    .mobile-hidden {
      display: none !important;
    }
    .mobile-only {
      display: block !important;
    }
  }
  @media (min-width: 769px) {
    .mobile-hidden {
      display: flex !important;
    }
    .mobile-only {
      display: none !important;
    }
  }
`;
if (!document.querySelector('style[data-navbar-responsive]')) {
  style.setAttribute('data-navbar-responsive', 'true');
  document.head.appendChild(style);
}
