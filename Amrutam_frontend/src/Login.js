import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loginType, setLoginType] = useState('patient'); // 'patient' or 'doctor'
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      // 1. Get Token
      const tokenResponse = await axios.post('http://127.0.0.1:8000/api/token/', {
        email,
        password
      });
      
      const accessToken = tokenResponse.data.access;
      const refreshToken = tokenResponse.data.refresh;

      // 2. Fetch Profile to verify role
      const profileResponse = await axios.get('http://127.0.0.1:8000/api/users/profile/', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      const isDoctor = profileResponse.data.is_doctor;
      const isAdmin = profileResponse.data.is_admin;

      // 3. Validate Role matches intended Login Type
      if (loginType === 'admin' && !isAdmin) {
        setError('Access Denied: These credentials do not belong to an Admin account.');
        return;
      }
      
      if (loginType === 'doctor' && (!isDoctor || isAdmin)) {
        setError('Access Denied: These credentials do not belong to a Doctor account.');
        return;
      }
      
      if (loginType === 'patient' && (isDoctor || isAdmin)) {
        setError('Access Denied: Please use the correct Login portal.');
        return;
      }

      // 4. Success - Store tokens and redirect
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      navigate('/dashboard');
      
    } catch (err) {
      if (err.response && err.response.status === 401) {
        setError('Invalid email or password. Please try again.');
      } else {
        setError('An error occurred during login. Please try again.');
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '420px', width: '100%', margin: '20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <h2 style={{ margin: 0 }}>Amrutam Portal</h2>
          <p style={{ color: '#666', fontSize: '14px', marginTop: '5px' }}>Welcome to the wellness community</p>
        </div>
        
        {/* Role Selection Tabs */}
        <div style={{ display: 'flex', marginBottom: '25px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--primary-color)' }}>
          <button 
            type="button"
            style={{ 
              flex: 1, 
              padding: '12px 10px', 
              border: 'none', 
              cursor: 'pointer',
              backgroundColor: loginType === 'patient' ? 'var(--primary-color)' : 'transparent',
              color: loginType === 'patient' ? '#fff' : 'var(--primary-color)',
              fontWeight: '600',
              fontFamily: 'inherit',
              fontSize: '13px'
            }}
            onClick={() => { setLoginType('patient'); setError(''); }}
          >
            User
          </button>
          <button 
            type="button"
            style={{ 
              flex: 1, 
              padding: '12px 10px', 
              border: 'none', 
              cursor: 'pointer',
              backgroundColor: loginType === 'doctor' ? 'var(--primary-color)' : 'transparent',
              color: loginType === 'doctor' ? '#fff' : 'var(--primary-color)',
              fontWeight: '600',
              fontFamily: 'inherit',
              fontSize: '13px'
            }}
            onClick={() => { setLoginType('doctor'); setError(''); }}
          >
            Doctor
          </button>
          <button 
            type="button"
            style={{ 
              flex: 1, 
              padding: '12px 10px', 
              border: 'none', 
              cursor: 'pointer',
              backgroundColor: loginType === 'admin' ? 'var(--primary-color)' : 'transparent',
              color: loginType === 'admin' ? '#fff' : 'var(--primary-color)',
              fontWeight: '600',
              fontFamily: 'inherit',
              fontSize: '13px'
            }}
            onClick={() => { setLoginType('admin'); setError(''); }}
          >
            Admin
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input 
              type="email" 
              id="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
              placeholder="Enter your email"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input 
              type="password" 
              id="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              placeholder="Enter your password"
            />
          </div>
          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '15px' }}>
            Sign In as {loginType === 'admin' ? 'Admin' : loginType === 'doctor' ? 'Doctor' : 'User'}
          </button>
        </form>
        
        {loginType === 'patient' && (
          <p style={{ marginTop: '25px', fontSize: '13px', textAlign: 'center', color: '#666' }}>
            <a href="/forgot-password" style={{ color: 'var(--primary-color)', fontWeight: '600', textDecoration: 'none', marginRight: '15px' }}>Forgot Password?</a>
            Don't have an account? <a href="/signup" style={{ color: 'var(--primary-color)', fontWeight: '600', textDecoration: 'none' }}>Sign up here</a>
          </p>
        )}
      </div>
    </div>
  );
};

export default Login;
