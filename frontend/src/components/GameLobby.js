import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_CONFIG } from '../config/api';

const GameLobby = ({ user, onLogout }) => {
    const [roomCode, setRoomCode] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const navigate = useNavigate();

    const generateRoomCode = () => {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    };

    const createGame = async () => {
        setIsCreating(true);
        // Add a slight delay for better UX
        setTimeout(() => {
            const newRoomCode = generateRoomCode();
            navigate(`/game/${newRoomCode}`);
        }, 1000);
    };

    const joinGame = async () => {
        if (roomCode.trim()) {
            setIsJoining(true);
            // Add a slight delay for better UX
            setTimeout(() => {
                navigate(`/game/${roomCode.toUpperCase()}`);
            }, 1000);
        }
    };

    // Check API connection on mount
    useEffect(() => {
        const checkConnection = async () => {
            try {
                const response = await fetch(`/api/health`);
                const data = await response.json();
                console.log('API Health Check:', data);
            } catch (error) {
                console.error('API connection failed:', error);
            }
        };

        checkConnection();
    }, []);

    // Animated background elements
    const FloatingSymbol = ({ symbol, delay, duration, size = 'text-4xl' }) => (
        <div
            className={`absolute opacity-20 ${size} animate-float`}
            style={{
                animationDelay: `${delay}s`,
                animationDuration: `${duration}s`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
            }}
        >
            {symbol}
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 pointer-events-none">
                <FloatingSymbol symbol="♦️" delay={0} duration={6} />
                <FloatingSymbol symbol="♣️" delay={1} duration={8} />
                <FloatingSymbol symbol="♥️" delay={2} duration={7} />
                <FloatingSymbol symbol="♠️" delay={3} duration={9} />
                <FloatingSymbol symbol="👑" delay={4} duration={5} />
                <FloatingSymbol symbol="🏴" delay={5} duration={10} />
                <FloatingSymbol symbol="🎲" delay={2.5} duration={6} size="text-6xl" />
                <FloatingSymbol symbol="💰" delay={4.5} duration={8} size="text-5xl" />
            </div>

            <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 w-full max-w-lg border border-white/20">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="mb-4">
                            <h1 className="text-5xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent mb-2 animate-pulse">
                                🎲 Langur Burja
                            </h1>
                            <p className="text-white/80 text-lg">Traditional Dice Game</p>
                        </div>

                        <div className="bg-gradient-to-r from-green-400/20 to-blue-500/20 rounded-xl p-4 border border-green-400/30">
                            <h2 className="text-2xl font-bold text-white mb-2">
                                Welcome, {user.username}! 👋
                            </h2>
                            <div className="flex items-center justify-center space-x-2">
                                <span className="text-green-300 font-bold text-xl">💰 ${user.balance}</span>
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                            </div>
                        </div>
                    </div>

                    {/* Game Actions */}
                    <div className="space-y-6">
                        {/* Create Game Button */}
                        <button
                            onClick={createGame}
                            disabled={isCreating}
                            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {isCreating ? (
                                <div className="flex items-center justify-center space-x-2">
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                    <span>Creating Room...</span>
                                </div>
                            ) : (
                                <span className="flex items-center justify-center space-x-2">
                                    <span>🚀 Create New Game</span>
                                </span>
                            )}
                        </button>

                        {/* Divider */}
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/30"></div>
                            </div>
                            <div className="relative flex justify-center">
                                <span className="bg-gradient-to-r from-purple-900 to-blue-900 px-4 text-white/80 text-sm font-medium">
                                    OR
                                </span>
                            </div>
                        </div>

                        {/* Join Game Section */}
                        <div className="space-y-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Enter Room Code"
                                    value={roomCode}
                                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                    className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent uppercase text-center text-xl font-bold tracking-wider backdrop-blur-sm"
                                    maxLength={6}
                                    disabled={isJoining}
                                />
                                {roomCode && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-400 animate-bounce">
                                        ✓
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={joinGame}
                                disabled={!roomCode.trim() || isJoining}
                                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            >
                                {isJoining ? (
                                    <div className="flex items-center justify-center space-x-2">
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                        <span>Joining Room...</span>
                                    </div>
                                ) : (
                                    <span className="flex items-center justify-center space-x-2">
                                        <span>🎯 Join Game</span>
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Game Rules Card */}
                    <div className="mt-8 bg-white/5 rounded-xl p-6 border border-white/20">
                        <h3 className="font-bold text-white mb-4 flex items-center text-lg">
                            <span className="mr-2">📋</span> Game Rules
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="space-y-2">
                                <div className="flex items-center space-x-2 text-white/80">
                                    <span className="text-xl">🎲</span>
                                    <span>Six dice with symbols</span>
                                </div>
                                <div className="flex items-center space-x-2 text-white/80">
                                    <span className="text-xl">💰</span>
                                    <span>Place bet on symbol</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center space-x-2 text-white/80">
                                    <span className="text-xl">🎯</span>
                                    <span>Match to win</span>
                                </div>
                                <div className="flex items-center space-x-2 text-white/80">
                                    <span className="text-xl">🏆</span>
                                    <span>Win = Bet × Count + Bet</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 flex justify-center space-x-2">
                            <span className="text-2xl">♦️</span>
                            <span className="text-2xl">♣️</span>
                            <span className="text-2xl">♥️</span>
                            <span className="text-2xl">♠️</span>
                            <span className="text-2xl">👑</span>
                            <span className="text-2xl">🏴</span>
                        </div>
                    </div>

                    {/* Logout Button */}
                    <div className="mt-6 text-center">
                        <button
                            onClick={onLogout}
                            className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors duration-200"
                        >
                            🚪 Logout
                        </button>
                    </div>

                    {/* Environment indicator */}
                    {process.env.NODE_ENV === 'development' && (
                        <div className="mt-4 text-center">
                            <span className="text-white/60 text-xs">
                                API: {API_CONFIG.API_BASE_URL}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GameLobby;