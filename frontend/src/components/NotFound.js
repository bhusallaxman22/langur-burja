import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotFound = ({ isAuthenticated }) => {
    const navigate = useNavigate();

    const handleGoHome = () => {
        if (isAuthenticated) {
            navigate('/lobby');
        } else {
            navigate('/login');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
            <div className="text-center">
                <div className="text-9xl mb-8 animate-bounce">🎲</div>
                <h1 className="text-6xl font-bold text-white mb-4">404</h1>
                <h2 className="text-2xl font-bold text-white/80 mb-4">Page Not Found</h2>
                <p className="text-white/60 mb-8 max-w-md mx-auto">
                    The page you're looking for seems to have rolled away like a dice!
                    Let's get you back to the game.
                </p>
                <button
                    onClick={handleGoHome}
                    className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white font-bold py-3 px-8 rounded-lg transition-all duration-200 transform hover:scale-105"
                >
                    🏠 Go Home
                </button>
            </div>
        </div>
    );
};

export default NotFound;