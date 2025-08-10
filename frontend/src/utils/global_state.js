// frontend/src/utils/global_state.js

export const API_BASE_URL = 'http://127.0.0.1:5000';

// Global state variables, will be updated upon login/logout
// These are exported so other modules can import and use/update them
export let currentUserId = localStorage.getItem('user_id') ? parseInt(localStorage.getItem('user_id'), 10) : null;
export let currentUsername = localStorage.getItem('username');
export let isAdmin = localStorage.getItem('is_admin') === 'true';
export let accessToken = localStorage.getItem('access_token');

// Function to update global state after login/logout
export function updateGlobalState(userId, username, adminStatus, token) {
    currentUserId = userId;
    currentUsername = username;
    isAdmin = adminStatus;
    accessToken = token;

    localStorage.setItem('user_id', userId);
    localStorage.setItem('username', username);
    localStorage.setItem('is_admin', adminStatus ? 'true' : 'false');
    if (token) {
        localStorage.setItem('access_token', token);
    } else {
        localStorage.removeItem('access_token');
    }
}

// Function to clear all global state and local storage on logout
export function clearGlobalState() {
    localStorage.clear();
    currentUserId = null;
    currentUsername = null;
    isAdmin = false;
    accessToken = null;
}