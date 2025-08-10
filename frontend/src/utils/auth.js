// src/utils/auth.js

import { accessToken } from './global_state';
import { clearGlobalState } from './global_state';

// Function to handle JWT-related error responses
export const handleAuthError = (response, errorData) => {
    if (response.status === 401 || response.status === 403) {
        alert(errorData.message || 'Session expired or unauthorized. Please log in again.');
        clearGlobalState(); // Clear invalid credentials
        window.location.href = '/login'; // Redirect to login
        return true;
    }
    return false;
};

// Helper to get headers with JWT for authenticated API calls
export const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token');
    if (token) {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }
    return { 'Content-Type': 'application/json' };
};