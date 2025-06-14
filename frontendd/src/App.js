import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import GameLobby from './components/GameLobby';
import GameRoom from './components/GameRoom';
import './App.css';

function App() {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

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

    return (
        <Router>
            <div className="App min-h-screen bg-gradient-to-br from-green-400 to-blue-500">
                <Routes>
                    <Route
                        path="/login"
                        element={
                            !isAuthenticated ?
                                <Login onLogin={handleLogin} /> :
                                <Navigate to="/lobby" />
                        }
                    />
                    <Route
                        path="/lobby"
                        element={
                            isAuthenticated ?
                                <GameLobby user={user} onLogout={handleLogout} /> :
                                <Navigate to="/login" />
                        }
                    />
                    <Route
                        path="/game/:roomCode"
                        element={
                            isAuthenticated ?
                                <GameRoom user={user} setUser={updateUser} /> :
                                <Navigate to="/login" />
                        }
                    />
                    <Route path="/" element={<Navigate to="/login" />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;