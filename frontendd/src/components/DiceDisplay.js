import React, { useState, useEffect } from 'react';

const DiceDisplay = ({ diceResults, roundResults, currentBet, isRolling, showResults, roundNumber }) => {
    const [animatedResults, setAnimatedResults] = useState([]);
    const [diceAnimationPhase, setDiceAnimationPhase] = useState('idle');
    const [spotlightIndex, setSpotlightIndex] = useState(-1);

    const symbolEmojis = {
        'DIAMONDS': '♦️',
        'CLUBS': '♣️',
        'HEARTS': '♥️',
        'SPADES': '♠️',
        'CROWN': '👑',
        'FLAG': '🏴'
    };

    const symbolNames = Object.keys(symbolEmojis);

    useEffect(() => {
        if (isRolling) {
            setDiceAnimationPhase('shaking');
            setSpotlightIndex(-1);

            // Shaking phase (1 second)
            setTimeout(() => {
                setDiceAnimationPhase('rolling');
            }, 1000);

            // Rolling phase (2.5 seconds)
            setTimeout(() => {
                setDiceAnimationPhase('landing');
            }, 3500);

            // Landing phase (0.5 second)
            setTimeout(() => {
                setDiceAnimationPhase('idle');
            }, 4000);
        }
    }, [isRolling]);

    useEffect(() => {
        if (showResults && diceResults.length > 0) {
            setAnimatedResults([]);
            // Animate results appearing one by one with spotlight effect
            diceResults.forEach((result, index) => {
                setTimeout(() => {
                    setSpotlightIndex(index);
                    setAnimatedResults(prev => [...prev.slice(0, index), result]);

                    // Remove spotlight after a moment
                    setTimeout(() => {
                        setSpotlightIndex(-1);
                    }, 800);
                }, index * 300);
            });
        } else {
            setAnimatedResults([]);
            setSpotlightIndex(-1);
        }
    }, [showResults, diceResults]);

    const getDiceContent = (index) => {
        if (diceAnimationPhase === 'rolling' || diceAnimationPhase === 'shaking') {
            return {
                symbol: symbolNames[Math.floor(Math.random() * symbolNames.length)],
                isAnimating: true
            };
        } else if (animatedResults[index]) {
            return {
                symbol: animatedResults[index],
                isAnimating: false
            };
        } else {
            return {
                symbol: null,
                isAnimating: false
            };
        }
    };

    const getDiceStyle = (index) => {
        const baseDelay = index * 150;

        switch (diceAnimationPhase) {
            case 'shaking':
                return {
                    animation: `diceShake 0.2s ease-in-out infinite`,
                    animationDelay: `${baseDelay}ms`
                };
            case 'rolling':
                return {
                    animation: `diceRoll3D 0.4s ease-in-out infinite`,
                    animationDelay: `${baseDelay}ms`
                };
            case 'landing':
                return {
                    animation: `diceLand 0.6s ease-out`,
                    animationDelay: `${baseDelay}ms`
                };
            default:
                return {};
        }
    };

    const getWinningCount = (symbol) => {
        if (!showResults || !diceResults.length) return 0;
        return diceResults.filter(result => result === symbol).length;
    };

    return (
        <div className="relative">
            {/* Casino-style Dice Arena */}
            <div className="dice-arena-board relative bg-gradient-to-br from-green-800 via-green-900 to-green-800 rounded-3xl p-8 shadow-2xl border-8 border-yellow-600">
                {/* Felt Texture Overlay */}
                <div className="absolute inset-0 bg-felt-texture opacity-30 rounded-3xl pointer-events-none"></div>

                {/* Golden Border Design */}
                <div className="absolute inset-2 border-4 border-yellow-500 rounded-2xl opacity-60"></div>
                <div className="absolute inset-4 border-2 border-yellow-400 rounded-xl opacity-40"></div>

                {/* Arena Lighting Effects */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-8 bg-gradient-to-b from-yellow-300 to-transparent rounded-b-full opacity-50 blur-sm animate-pulse"></div>

                {/* Header with Round Info */}
                <div className="relative z-10 flex justify-between items-center mb-8">
                    <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl px-6 py-3 shadow-lg border-2 border-yellow-300">
                        <h2 className="text-2xl font-bold text-yellow-900 flex items-center font-serif">
                            🎲 DICE ARENA
                        </h2>
                    </div>
                    {roundNumber > 0 && (
                        <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl px-6 py-3 shadow-lg border-2 border-red-400">
                            <span className="text-white font-bold text-lg font-serif">Round {roundNumber}</span>
                        </div>
                    )}
                </div>

                {/* Dice Layout Area */}
                <div className="relative z-10 bg-gradient-to-br from-green-700 to-green-900 rounded-2xl p-6 border-4 border-yellow-500 shadow-inner">
                    {/* Casino Table Pattern */}
                    <div className="absolute inset-0 bg-casino-pattern opacity-20 rounded-2xl"></div>

                    {/* Center Circle Design */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 border-4 border-yellow-400 rounded-full opacity-30"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-yellow-300 rounded-full opacity-50"></div>

                    {/* Dice Grid */}
                    <div className="relative grid grid-cols-3 gap-8 max-w-2xl mx-auto">
                        {[...Array(6)].map((_, index) => {
                            const diceContent = getDiceContent(index);
                            const isWinningDice = currentBet && diceContent.symbol === currentBet.symbol && showResults;
                            const isSpotlighted = spotlightIndex === index;

                            return (
                                <div
                                    key={index}
                                    className="relative flex flex-col items-center"
                                >
                                    {/* Dice Platform */}
                                    <div className={`dice-platform relative ${isSpotlighted ? 'spotlight-active' : ''}`}>
                                        {/* Spotlight Effect */}
                                        {isSpotlighted && (
                                            <div className="absolute -inset-8 bg-gradient-radial from-yellow-300/40 via-yellow-200/20 to-transparent rounded-full animate-ping"></div>
                                        )}

                                        {/* Platform Base */}
                                        <div className="absolute -bottom-2 w-20 h-4 bg-gradient-to-r from-gray-600 to-gray-800 rounded-full opacity-60 blur-sm"></div>

                                        {/* 3D Dice Container */}
                                        <div
                                            className={`dice-3d-casino ${isWinningDice ? 'winning-dice-glow' : ''} ${isSpotlighted ? 'spotlight-dice' : ''
                                                }`}
                                            style={getDiceStyle(index)}
                                        >
                                            {/* Main Dice Face */}
                                            <div className={`dice-face-main ${isWinningDice ? 'bg-gradient-to-br from-green-300 to-green-500' : 'bg-gradient-to-br from-white to-gray-100'} ${diceContent.isAnimating ? 'blur-sm' : ''
                                                }`}>
                                                {diceContent.symbol ? (
                                                    <div className={`text-4xl transition-all duration-300 ${isWinningDice ? 'text-white drop-shadow-lg' : ''
                                                        } ${isSpotlighted ? 'scale-125' : ''
                                                        }`}>
                                                        {symbolEmojis[diceContent.symbol]}
                                                    </div>
                                                ) : (
                                                    <div className="text-3xl text-gray-400 animate-pulse">?</div>
                                                )}
                                            </div>

                                            {/* Dice Sides for 3D effect */}
                                            <div className="dice-side-right"></div>
                                            <div className="dice-side-bottom"></div>
                                        </div>

                                        {/* Winning Indicator */}
                                        {isWinningDice && (
                                            <div className="absolute -top-4 -right-4 z-20">
                                                <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 rounded-full w-10 h-10 flex items-center justify-center text-lg font-bold animate-bounce border-2 border-yellow-300 shadow-lg">
                                                    ✓
                                                </div>
                                                <div className="absolute inset-0 bg-yellow-400 rounded-full animate-ping opacity-50"></div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Dice Position Label */}
                                    <div className="mt-4 bg-gradient-to-r from-gray-700 to-gray-800 rounded-lg px-3 py-1 border border-gray-600">
                                        <span className="text-white text-xs font-bold">Dice {index + 1}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Rolling Status with Progress Bar */}
                    {isRolling && (
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-80">
                            <div className="bg-black/50 backdrop-blur-sm rounded-xl p-4 border border-yellow-500">
                                <div className="text-center mb-3">
                                    <div className="text-yellow-300 text-xl font-bold animate-pulse flex items-center justify-center">
                                        <span className="mr-2 animate-spin">🎲</span>
                                        Rolling the dice...
                                        <span className="ml-2 animate-spin">🎲</span>
                                    </div>
                                </div>
                                <div className="bg-gray-700 rounded-full h-3 overflow-hidden border border-gray-600">
                                    <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 h-full rounded-full animate-casino-loading shadow-lg"></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Symbol Count Display */}
                {showResults && (
                    <div className="relative z-10 mt-6 grid grid-cols-6 gap-2">
                        {Object.entries(symbolEmojis).map(([symbol, emoji]) => {
                            const count = getWinningCount(symbol);
                            const isWinningSymbol = currentBet && currentBet.symbol === symbol && count > 0;

                            return (
                                <div
                                    key={symbol}
                                    className={`bg-gradient-to-br ${isWinningSymbol
                                        ? 'from-green-400 to-green-600 animate-pulse'
                                        : count > 0
                                            ? 'from-blue-400 to-blue-600'
                                            : 'from-gray-600 to-gray-800'
                                        } rounded-lg p-3 text-center border-2 ${isWinningSymbol ? 'border-green-300' : 'border-gray-400'
                                        } transition-all duration-300`}
                                >
                                    <div className="text-2xl mb-1">{emoji}</div>
                                    <div className={`text-sm font-bold ${isWinningSymbol ? 'text-white' : 'text-gray-200'}`}>
                                        {count}x
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Current Bet Display */}
            {currentBet && (
                <div className="mt-6 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl p-4 border-2 border-blue-400/40 backdrop-blur-sm">
                    <h3 className="font-bold text-white mb-3 flex items-center text-lg">
                        <span className="mr-2 animate-bounce">💰</span>
                        Your Active Bet
                    </h3>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="text-4xl animate-pulse">{symbolEmojis[currentBet.symbol]}</div>
                            <div>
                                <p className="text-white font-medium text-lg">{currentBet.symbol}</p>
                                <p className="text-green-300 font-bold text-xl">${currentBet.amount}</p>
                            </div>
                        </div>
                        {isRolling && (
                            <div className="text-white animate-bounce text-lg">
                                🤞 Good luck!
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Results Display */}
            {showResults && roundResults.length > 0 && (
                <div className="mt-6 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-xl p-6 border-2 border-purple-400/40 backdrop-blur-sm animate-fadeIn">
                    <h3 className="font-bold text-white mb-4 flex items-center text-xl">
                        <span className="mr-2">🏆</span>
                        Round Results
                    </h3>
                    <div className="space-y-3">
                        {roundResults.map((result, index) => (
                            <div
                                key={index}
                                className={`p-4 rounded-xl transform transition-all duration-500 ${result.won
                                    ? 'bg-gradient-to-r from-green-500/30 to-green-600/30 border-2 border-green-400/50 animate-pulse'
                                    : 'bg-gradient-to-r from-red-500/30 to-red-600/30 border-2 border-red-400/50'
                                    } backdrop-blur-sm`}
                                style={{ animationDelay: `${index * 200}ms` }}
                            >
                                {result.won ? (
                                    <p className="text-green-200 font-bold flex items-center text-lg">
                                        <span className="mr-2 text-2xl">🎉</span>
                                        Won ${result.winnings} with {result.count} {symbolEmojis[result.symbol]}!
                                        <span className="ml-2 animate-bounce">💰</span>
                                    </p>
                                ) : (
                                    <p className="text-red-200 flex items-center text-lg">
                                        <span className="mr-2 text-2xl">💔</span>
                                        Lost bet on {symbolEmojis[result.symbol]} {result.symbol}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DiceDisplay;