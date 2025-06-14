import React, { useState } from 'react';

const BettingPanel = ({ onPlaceBet, playerBalance, disabled }) => {
    const [selectedSymbol, setSelectedSymbol] = useState('');
    const [betAmount, setBetAmount] = useState(10);

    const symbols = [
        { name: 'DIAMONDS', emoji: '♦️', color: 'text-red-500' },
        { name: 'CLUBS', emoji: '♣️', color: 'text-black' },
        { name: 'HEARTS', emoji: '♥️', color: 'text-red-500' },
        { name: 'SPADES', emoji: '♠️', color: 'text-black' },
        { name: 'CROWN', emoji: '👑', color: 'text-yellow-500' },
        { name: 'FLAG', emoji: '🏴', color: 'text-gray-700' }
    ];

    const handlePlaceBet = () => {
        if (selectedSymbol && betAmount > 0 && betAmount <= playerBalance) {
            onPlaceBet(selectedSymbol, betAmount);
        }
    };

    const quickBetAmounts = [10, 25, 50, 100];

    return (
        <div className="bg-gray-100 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Place Your Bet</h2>

            <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Balance: ${playerBalance}</p>
            </div>

            <div className="mb-6">
                <h3 className="font-medium mb-3">Select Symbol:</h3>
                <div className="grid grid-cols-3 gap-2">
                    {symbols.map((symbol) => (
                        <button
                            key={symbol.name}
                            onClick={() => setSelectedSymbol(symbol.name)}
                            disabled={disabled}
                            className={`p-3 rounded-lg border-2 transition-all ${selectedSymbol === symbol.name
                                ? 'border-blue-500 bg-blue-100'
                                : 'border-gray-300 bg-white hover:border-gray-400'
                                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <div className={`text-2xl ${symbol.color}`}>{symbol.emoji}</div>
                            <div className="text-xs mt-1">{symbol.name}</div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="mb-4">
                <h3 className="font-medium mb-3">Bet Amount:</h3>
                <div className="grid grid-cols-4 gap-2 mb-3">
                    {quickBetAmounts.map((amount) => (
                        <button
                            key={amount}
                            onClick={() => setBetAmount(amount)}
                            disabled={disabled || amount > playerBalance}
                            className={`py-2 px-3 rounded border ${betAmount === amount
                                ? 'bg-blue-500 text-white border-blue-500'
                                : 'bg-white border-gray-300 hover:border-gray-400'
                                } ${disabled || amount > playerBalance ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            ${amount}
                        </button>
                    ))}
                </div>
                <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(parseInt(e.target.value) || 0)}
                    disabled={disabled}
                    min="1"
                    max={playerBalance}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    placeholder="Custom amount"
                />
            </div>

            <button
                onClick={handlePlaceBet}
                disabled={disabled || !selectedSymbol || betAmount <= 0 || betAmount > playerBalance}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-md transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {disabled ? 'Bet Placed' : 'Place Bet'}
            </button>
        </div>
    );
};

export default BettingPanel;