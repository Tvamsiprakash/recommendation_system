// src/App.js

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import HomePage from './components/HomePage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import AdminPage from './components/AdminPage';
import { clearGlobalState, updateGlobalState } from './utils/global_state';

const App = () => {
  const [userId, setUserId] = useState(localStorage.getItem('user_id'));
  const [username, setUsername] = useState(localStorage.getItem('username'));
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem('is_admin') === 'true');
  const navigate = useNavigate();

  const handleLogout = () => {
    clearGlobalState();
    setUserId(null);
    setUsername(null);
    setIsAdmin(false);
    navigate('/login');
  };

  useEffect(() => {
    updateGlobalState(localStorage.getItem('user_id'), localStorage.getItem('username'), localStorage.getItem('is_admin') === 'true', localStorage.getItem('access_token'));
    setUserId(localStorage.getItem('user_id'));
    setUsername(localStorage.getItem('username'));
    setIsAdmin(localStorage.getItem('is_admin') === 'true');
  }, []);

  const loggedInHeader = (
    <header>
      <h1>My Recommender Shop</h1>
      <div className="auth-controls">
        <span>Welcome, {username}!</span>
        <button onClick={handleLogout}>Logout</button>
      </div>
    </header>
  );

  const loggedOutHeader = (
    <header>
      <h1>My Recommender Shop</h1>
      <div className="auth-controls">
        <Link to="/register"><button>Register</button></Link>
        <Link to="/login"><button>Login</button></Link>
      </div>
    </header>
  );

  return (
    <>
      {userId ? loggedInHeader : loggedOutHeader}
      <main>
        <Routes>
          <Route path="/" element={userId ? <HomePage userId={userId} username={username} /> : <LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/admin" element={isAdmin ? <AdminPage userId={userId} /> : <LoginPage />} />
        </Routes>
      </main>
    </>
  );
};

export default App;