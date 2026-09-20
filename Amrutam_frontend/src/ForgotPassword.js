import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './index.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/users/forgot-password-request/', { email });
      setMessage(response.data.detail);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to request reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyReset = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/users/reset-password/', {
        email,
        new_password: password,
        otp
      });
      setMessage(response.data.detail);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '420px', width: '100%', margin: '20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <h2 style={{ margin: 0 }}>Reset Password</h2>
          <p style={{ color: '#666', fontSize: '14px', marginTop: '5px' }}>Secure account recovery</p>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        {message && <div style={{ color: 'var(--primary-dark)', backgroundColor: 'var(--light-green)', padding: '10px', borderRadius: '6px', fontSize: '13px', textAlign: 'center', marginBottom: '15px', border: '1px solid #b2f5ea' }}>{message}</div>}
        
        {step === 1 ? (
          <form onSubmit={handleRequestReset}>
            <div className="form-group">
              <label>Email Address</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                placeholder="Enter your user email"
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginTop: '10px' }}>
              {loading ? 'Requesting...' : 'Request Reset OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyReset}>
            <div className="form-group">
              <label>Enter OTP sent to {email}</label>
              <input 
                type="text" 
                value={otp} 
                onChange={(e) => setOtp(e.target.value)} 
                required 
                placeholder="6-digit OTP"
                maxLength="6"
                style={{ letterSpacing: '4px', textAlign: 'center', fontSize: '18px', fontWeight: 'bold' }}
              />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                placeholder="Create a new password"
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Resetting...' : 'Verify & Reset Password'}
            </button>
            <button 
              type="button" 
              style={{ backgroundColor: 'transparent', color: '#666', border: 'none', marginTop: '15px', width: '100%', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
              onClick={() => setStep(1)}
            >
              Back to Email Entry
            </button>
          </form>
        )}
        
        <p style={{ marginTop: '25px', fontSize: '13px', textAlign: 'center', color: '#666' }}>
          Remember your password? <a href="/login" style={{ color: 'var(--primary-color)', fontWeight: '600', textDecoration: 'none' }}>Log in here</a>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
