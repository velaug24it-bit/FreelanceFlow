import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const OAuthRedirect = () => {
  const navigate = useNavigate();
  const { search } = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('token', token);
      // Optionally you could fetch /api/auth/verify to get user, but App's AuthProvider will verify automatically
      navigate('/');
    } else {
      navigate('/login');
    }
  }, [search, navigate]);

  return (
    <div style={{ padding: 20 }}>
      Processing authentication...
    </div>
  );
};

export default OAuthRedirect;
