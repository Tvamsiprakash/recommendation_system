// src/components/RegisterPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../api';

const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await response.json();

      if (response.ok) {
        setMessageType('success');
        setMessage(data.message);
        setTimeout(() => navigate('/login'), 1500);
      } else {
        setMessageType('error');
        setMessage(data.message);
      }
    } catch (error) {
      setMessageType('error');
      setMessage('Network error. Could not register.');
      console.error('Error:', error);
    }
  };

  return (
    <div className="auth-container">
      <h2>Register for My Recommender Shop</h2>
      <form id="registerForm" onSubmit={handleRegister}>
        <div className="admin-form-group">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            required
          />
        </div>
        <div className="admin-form-group">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
          />
        </div>
        <div className="admin-form-group">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
          />
        </div>
        <button type="submit">Register</button>
        {message && <p className={`message ${messageType}`}>{message}</p>}
      </form>
      <p className="auth-switch">Already have an account? <a href="/login">Login here</a></p>
    </div>
  );
};

export default RegisterPage;