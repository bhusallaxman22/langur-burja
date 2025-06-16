import React, { useState, useEffect } from 'react';

const ResultNotification = ({ result, onClose, visible }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimatingOut, setIsAnimatingOut] = useState(false);

    const handleClose = React.useCallback(() => {
        setIsAnimatingOut(true);
        setTimeout(() => {
            setIsVisible(false);
            onClose();
        }, 500);
    }, [onClose]);

    useEffect(() => {
        if (visible && result) {
            setIsVisible(true);
            setIsAnimatingOut(false);

            // Auto-dismiss after 5 seconds
            const timer = setTimeout(() => {
                handleClose();
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [visible, result, handleClose]);


    if (!isVisible || !result) return null;

    const isWin = result.won;

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-500 ${isAnimatingOut ? 'opacity-0' : 'opacity-100'
                    }`}
                onClick={handleClose}
            />

            {/* Notification Modal */}
            <div
                className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 
                    w-[90vw] max-w-md mx-auto transition-all duration-500 ${isAnimatingOut
                        ? 'scale-75 opacity-0 translate-y-8'
                        : 'scale-100 opacity-100 translate-y-0'
                    }`}
            >
                <div className={`relative overflow-hidden rounded-2xl border-4 shadow-2xl ${isWin
                    ? 'bg-gradient-to-br from-green-400 to-green-600 border-green-300'
                    : 'bg-gradient-to-br from-red-400 to-red-600 border-red-300'
                    }`}>
                    {/* Animated Background Pattern */}
                    <div className="absolute inset-0 opacity-20">
                        <div className={`absolute inset-0 ${isWin
                            ? 'bg-gradient-to-r from-green-300 via-transparent to-green-300'
                            : 'bg-gradient-to-r from-red-300 via-transparent to-red-300'
                            } animate-shimmer`} />
                    </div>

                    {/* Floating Particles */}
                    {isWin && (
                        <div className="absolute inset-0 overflow-hidden">
                            {[...Array(12)].map((_, i) => (
                                <div
                                    key={i}
                                    className="absolute animate-float text-2xl"
                                    style={{
                                        left: `${Math.random() * 100}%`,
                                        top: `${Math.random() * 100}%`,
                                        animationDelay: `${Math.random() * 2}s`,
                                        animationDuration: `${3 + Math.random() * 2}s`
                                    }}
                                >
                                    {['💰', '🎉', '⭐', '✨', '🏆'][Math.floor(Math.random() * 5)]}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Content */}
                    <div className="relative z-10 p-8 text-center">
                        {/* Icon */}
                        <div className="mb-6">
                            <div className={`w-24 h-24 mx-auto rounded-full border-4 border-white/50 
                                flex items-center justify-center text-5xl ${isWin ? 'bg-green-500/30 animate-bounce' : 'bg-red-500/30'
                                }`}>
                                {isWin ? '🎉' : '💔'}
                            </div>
                        </div>

                        {/* Title */}
                        <h2 className={`text-3xl md:text-4xl font-bold text-white mb-4 ${isWin ? 'animate-pulse' : ''
                            }`}>
                            {isWin ? 'CONGRATULATIONS!' : 'BETTER LUCK NEXT TIME!'}
                        </h2>

                        {/* Result Details */}
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 mb-6 border border-white/30">
                            {isWin ? (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-center space-x-2 text-xl">
                                        <span className="text-4xl">{result.symbol === 'DIAMONDS' ? '♦️' :
                                            result.symbol === 'CLUBS' ? '♣️' :
                                                result.symbol === 'HEARTS' ? '♥️' :
                                                    result.symbol === 'SPADES' ? '♠️' :
                                                        result.symbol === 'CROWN' ? '👑' : '🏴'}</span>
                                        <span className="text-white font-bold">{result.symbol}</span>
                                    </div>
                                    <div className="text-white text-lg">
                                        <span className="font-medium">Symbol Count: </span>
                                        <span className="font-bold text-yellow-200">{result.count}x</span>
                                    </div>
                                    <div className="text-3xl font-bold text-yellow-200 animate-pulse">
                                        +${result.winnings}
                                    </div>
                                    <div className="text-sm text-white/80">
                                        Amazing! Your bet paid off!
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-center space-x-2 text-xl">
                                        <span className="text-4xl">{result.symbol === 'DIAMONDS' ? '♦️' :
                                            result.symbol === 'CLUBS' ? '♣️' :
                                                result.symbol === 'HEARTS' ? '♥️' :
                                                    result.symbol === 'SPADES' ? '♠️' :
                                                        result.symbol === 'CROWN' ? '👑' : '🏴'}</span>
                                        <span className="text-white font-bold">{result.symbol}</span>
                                    </div>
                                    <div className="text-white text-lg">
                                        Your symbol didn't appear this round
                                    </div>
                                    <div className="text-sm text-white/80">
                                        Don't give up! Try again next round!
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={handleClose}
                            className="bg-white/20 hover:bg-white/30 text-white font-bold py-3 px-8 rounded-xl 
                                border border-white/30 transition-all duration-200 transform hover:scale-105"
                        >
                            Continue Playing
                        </button>
                    </div>

                    {/* Close X Button */}
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 
                            text-white rounded-full flex items-center justify-center transition-all duration-200"
                    >
                        ×
                    </button>
                </div>
            </div>
        </>
    );
};

export default ResultNotification;
