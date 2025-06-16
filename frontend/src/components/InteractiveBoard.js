import React, { useState } from 'react';

const InteractiveBoard = ({ onPlaceBet, playerBalance, disabled, currentBet, gameState }) => {
    const [selectedSymbol, setSelectedSymbol] = useState('');
    const [betAmount, setBetAmount] = useState(10);
    const [hoverSymbol, setHoverSymbol] = useState('');

    const symbols = [
        { name: 'DIAMONDS', emoji: '♦️', color: 'text-red-600' },
        { name: 'CLUBS', emoji: '♣️', color: 'text-gray-800' },
        { name: 'HEARTS', emoji: '♥️', color: 'text-red-600' },
        { name: 'SPADES', emoji: '♠️', color: 'text-gray-800' },
        { name: 'CROWN', emoji: '👑', color: 'text-yellow-600' },
        { name: 'FLAG', emoji: '🏴', color: 'text-gray-700' }
    ];

    const quickBetAmounts = [10, 25, 50, 100];

    const handlePlaceBet = () => {
        if (selectedSymbol && betAmount > 0 && betAmount <= playerBalance) {
            onPlaceBet(selectedSymbol, betAmount);
        }
    };

    return (
        <div className="relative max-w-4xl mx-auto px-2 md:px-0">
            {/* Paper Background with shadows and texture */}
            <div className="paper-board relative bg-gradient-to-br from-amber-50 to-yellow-100 rounded-lg shadow-2xl border-4 border-amber-200 p-4 md:p-8">
                {/* Paper texture overlay */}
                <div className="absolute inset-0 opacity-10 bg-paper-texture rounded-lg pointer-events-none"></div>

                {/* Vintage corner decorations */}
                <div className="absolute top-2 left-2 w-6 h-6 border-l-4 border-t-4 border-amber-400 opacity-60"></div>
                <div className="absolute top-2 right-2 w-6 h-6 border-r-4 border-t-4 border-amber-400 opacity-60"></div>
                <div className="absolute bottom-2 left-2 w-6 h-6 border-l-4 border-b-4 border-amber-400 opacity-60"></div>
                <div className="absolute bottom-2 right-2 w-6 h-6 border-r-4 border-b-4 border-amber-400 opacity-60"></div>

                {/* Title */}
                <div className="text-center mb-4 md:mb-6">
                    <h2 className="text-xl md:text-2xl font-bold text-amber-900 mb-2 font-serif">
                        🎯 Betting Board
                    </h2>
                    <div className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg px-3 md:px-4 py-2 inline-block shadow-lg">
                        <span className="font-bold text-sm md:text-base">Balance: ${playerBalance}</span>
                    </div>
                </div>

                {gameState === 'finished' && (
                    <div className="text-center mb-4 p-3 bg-red-100 border-2 border-red-300 rounded-lg">
                        <p className="text-red-700 font-bold text-sm md:text-base">⏳ Round finished - waiting for dealer to start new round</p>
                    </div>
                )}

                {/* Symbol Selection Grid - Mobile responsive */}
                <div className="mb-4 md:mb-6">
                    <h3 className="text-base md:text-lg font-bold text-amber-900 mb-3 text-center font-serif">
                        Choose Your Symbol
                    </h3>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3 max-w-2xl mx-auto symbol-grid-mobile md:grid-cols-6">{symbols.map((symbol) => {
                        const isSelected = selectedSymbol === symbol.name;
                        const isHovered = hoverSymbol === symbol.name;
                        const isCurrent = currentBet && currentBet.symbol === symbol.name;

                        return (
                            <button
                                key={symbol.name}
                                onClick={() => !disabled && setSelectedSymbol(symbol.name)}
                                onMouseEnter={() => setHoverSymbol(symbol.name)}
                                onMouseLeave={() => setHoverSymbol('')}
                                disabled={disabled}
                                className={`relative p-3 md:p-4 rounded-lg border-3 transition-all duration-300 transform bg-white shadow-lg touch-target ${isSelected
                                    ? 'border-amber-500 scale-110 shadow-xl ring-4 ring-amber-300'
                                    : isCurrent
                                        ? 'border-green-500 ring-2 ring-green-300'
                                        : isHovered
                                            ? 'border-amber-300 scale-105 shadow-xl'
                                            : 'border-amber-200 hover:scale-105'
                                    } ${disabled && !isCurrent ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl cursor-pointer'}`}
                            >
                                <div className="text-center">
                                    <div className={`text-2xl md:text-3xl mb-1 ${symbol.color} ${isSelected || isCurrent ? 'animate-bounce' : ''}`}>
                                        {symbol.emoji}
                                    </div>
                                    <div className="text-amber-900 font-bold text-xs font-serif">
                                        {symbol.name.slice(0, 4)}
                                    </div>

                                    {isSelected && (
                                        <div className="absolute -top-1 -right-1 bg-amber-500 text-amber-900 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold animate-pulse">
                                            ✓
                                        </div>
                                    )}

                                    {isCurrent && (
                                        <div className="absolute -top-1 -left-1 bg-green-500 text-green-900 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                                            💰
                                        </div>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                    </div>
                </div>

                {/* Bet Amount Selection - Mobile responsive */}
                <div className="mb-4 md:mb-6 max-w-xl mx-auto">
                    <h3 className="text-base md:text-lg font-bold text-amber-900 mb-3 text-center font-serif">
                        Select Bet Amount
                    </h3>

                    {/* Quick Bet Buttons */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 quick-bet-mobile md:grid-cols-4">
                        {quickBetAmounts.map((amount) => (
                            <button
                                key={amount}
                                onClick={() => !disabled && setBetAmount(amount)}
                                disabled={disabled || amount > playerBalance}
                                className={`py-2 px-2 md:px-3 rounded-lg font-bold transition-all duration-200 transform shadow-md touch-target ${betAmount === amount
                                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white scale-105 shadow-lg'
                                    : 'bg-white text-amber-900 hover:bg-amber-50 hover:scale-105 border-2 border-amber-200'
                                    } ${disabled || amount > playerBalance ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'}`}
                            >
                                <span className="text-sm md:text-base">${amount}</span>
                            </button>
                        ))}
                    </div>

                    {/* Custom Amount Input */}
                    <div className="relative">
                        <input
                            type="number"
                            value={betAmount}
                            onChange={(e) => !disabled && setBetAmount(parseInt(e.target.value) || 0)}
                            disabled={disabled}
                            min="1"
                            max={playerBalance}
                            className="w-full px-4 py-3 bg-white border-3 border-amber-200 rounded-lg text-amber-900 placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent disabled:opacity-50 text-center text-base md:text-lg font-bold shadow-inner touch-target"
                            placeholder="Custom amount"
                        />
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-700 font-bold">$</div>
                    </div>
                </div>

                {/* Place Bet Button */}
                <div className="text-center">
                    <button
                        onClick={handlePlaceBet}
                        disabled={disabled || !selectedSymbol || betAmount <= 0 || betAmount > playerBalance}
                        className={`px-6 md:px-8 py-3 rounded-lg font-bold text-base md:text-lg transition-all duration-300 transform shadow-lg touch-target ${disabled
                            ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                            : selectedSymbol && betAmount > 0 && betAmount <= playerBalance
                                ? 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 hover:scale-105 shadow-xl'
                                : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                            } disabled:opacity-50`}
                    >
                        {disabled && gameState === 'finished' ? '⏳ Round Finished' : disabled ? '✅ Bet Placed' : '🎯 Place Bet'}
                    </button>
                </div>

                {/* Betting Rules - Mobile friendly */}
                <div className="mt-4 md:mt-6 bg-amber-100 rounded-lg p-3 border-2 border-amber-200 shadow-inner">
                    <h4 className="text-amber-900 font-bold mb-2 text-sm font-serif">📋 Quick Rules:</h4>
                    <ul className="text-amber-800 text-xs space-y-1">
                        <li>• Choose symbol & bet amount</li>
                        <li>• Win = Bet × Symbol Count + Original Bet</li>
                        <li>• No matches = lose bet</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default InteractiveBoard;