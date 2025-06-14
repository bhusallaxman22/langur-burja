import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import GameLobby from './components/GameLobby';
import GameRoom from './components/GameRoom';
import './App.css';

function App() {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Function to update user and sync with localStorage
    const updateUser = (userData) => {
        console.log('App.js: Updating user data:', userData);
        setUser(userData);
        if (userData) {
            localStorage.setItem('user', JSON.stringify(userData));
            console.log('App.js: Synced user to localStorage:', userData);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        console.log('App.js: Loading from localStorage - token:', !!token, 'userData:', userData);

        if (token && userData) {
            try {
                const parsedUser = JSON.parse(userData);
                console.log('App.js: Parsed user from localStorage:', parsedUser);
                setUser(parsedUser);
                setIsAuthenticated(true);
            } catch (error) {
                console.error('App.js: Error parsing user data from localStorage:', error);
                // Clear corrupted data
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        }

        setIsLoading(false);
    }, []);

    const handleLogin = (userData, token) => {
        console.log('App.js: Handling login with userData:', userData);
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        setIsAuthenticated(true);
    };

    const handleLogout = () => {
        console.log('App.js: Handling logout');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setIsAuthenticated(false);
    };

    // Debug: Log user state changes
    useEffect(() => {
        console.log('App.js: User state changed to:', user);
        console.log('App.js: Current localStorage user:', localStorage.getItem('user'));
    }, [user]);

    // Show loading screen while checking authentication
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
                    <p className="text-white text-xl">Loading Langur Burja...</p>
                </div>
            </div>
        );
    }

    return (
        <Router>
            <div className="App min-h-screen bg-gradient-to-br from-green-400 to-blue-500">
                <Routes>
                    <Route
                        path="/login"
                        element={
                            !isAuthenticated ?
                                <Login onLogin={handleLogin} /> :
                                <Navigate to="/lobby" replace />
                        }
                    />
                    <Route
                        path="/lobby"
                        element={
                            isAuthenticated ?
                                <GameLobby user={user} onLogout={handleLogout} /> :
                                <Navigate to="/login" replace />
                        }
                    />
                    <Route
                        path="/game/:roomCode"
                        element={
                            isAuthenticated ?
                                <GameRoom user={user} setUser={updateUser} /> :
                                <Navigate to="/login" replace />
                        }
                    />
                    <Route path="/" element={<Navigate to="/login" replace />} />
                    {/* Catch-all route for 404s */}
                    <Route
                        path="*"
                        element={
                            isAuthenticated ?
                                <Navigate to="/lobby" replace /> :
                                <Navigate to="/login" replace />
                        }
                    />
                </Routes>
            </div>
        </Router>
    );
}

export default App;