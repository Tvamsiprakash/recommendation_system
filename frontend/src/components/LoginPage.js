// src/components/LoginPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../api';
import { updateGlobalState } from '../utils/global_state';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (response.ok) {
        setMessageType('success');
        setMessage(data.message);
        
        // Update global state and local storage with new login data
        updateGlobalState(data.user_id, data.username, data.is_admin, data.access_token);

        if (data.is_admin) {
          navigate('/admin');
        } else {
          navigate('/');
        }
      } else {
        setMessageType('error');
        setMessage(data.message);
      }
    } catch (error) {
      setMessageType('error');
      setMessage('Network error. Could not login.');
      console.error('Error:', error);
    }
  };

  return (
    <div className="auth-container">
      <h2>Login to My Recommender Shop</h2>
      <form id="loginForm" onSubmit={handleLogin}>
        <div className="admin-form-group">
          <input
            type="text"
            id="loginUsername"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            required
          />
        </div>
        <div className="admin-form-group">
          <input
            type="password"
            id="loginPassword"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
          />
        </div>
        <button type="submit" id="loginBtn">Login</button>
        {message && <p className={`message ${messageType}`}>{message}</p>}
      </form>
      <p className="auth-switch">Don't have an account? <a href="/register">Register here</a></p>
    </div>
  );
};

export default LoginPage;