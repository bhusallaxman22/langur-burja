import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

// Compact, vertical betting controls for side placement
const BettingSidebar = ({
    onPlaceBet,
    playerBalance,
    disabled,
    currentBet,
    gameState,
    bettingDeadline
}) => {
    const [selectedSymbol, setSelectedSymbol] = useState('');
    const [betAmount, setBetAmount] = useState(10);
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        if (gameState === 'betting' && bettingDeadline) {
            const id = setInterval(() => setNow(Date.now()), 500);
            return () => clearInterval(id);
        }
    }, [gameState, bettingDeadline]);

    useEffect(() => {
        // Reset selections when a new betting phase starts
        if (gameState === 'betting' && !currentBet) {
            setSelectedSymbol('');
            setBetAmount(10);
        }
    }, [gameState, currentBet]);

    const symbols = [
        { name: 'DIAMONDS', emoji: '♦️', color: 'text-red-500' },
        { name: 'CLUBS', emoji: '♣️', color: 'text-gray-800' },
        { name: 'HEARTS', emoji: '♥️', color: 'text-red-500' },
        { name: 'SPADES', emoji: '♠️', color: 'text-gray-800' },
        { name: 'CROWN', emoji: '👑', color: 'text-yellow-500' },
        { name: 'FLAG', emoji: '🏴', color: 'text-gray-600' }
    ];

    const quickBetAmounts = [10, 25, 50, 100];

    const remainingMs = bettingDeadline ? Math.max(0, bettingDeadline - now) : 0;
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    const bettingClosingSoon = remainingSeconds > 0 && remainingSeconds <= 5;

    const canPlace = !disabled && !currentBet && selectedSymbol && betAmount > 0 && betAmount <= playerBalance && gameState === 'betting';

    const place = () => {
        if (canPlace) {
            onPlaceBet(selectedSymbol, betAmount);
        }
    };

    // Determine primary button label without nested ternaries
    let primaryLabel = 'Waiting';
    if (currentBet) primaryLabel = 'Bet Placed';
    else if (canPlace) primaryLabel = '💰 Place Bet';
    else if (gameState === 'betting') primaryLabel = 'Select & Amount';

    return (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 md:p-5 shadow-2xl border border-white/20 flex flex-col h-full">
            <h2 className="text-lg md:text-xl font-bold text-white mb-2 flex items-center gap-2">
                <span>🎯 Bet</span>
                {gameState === 'betting' && (
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${bettingClosingSoon ? 'bg-red-500 animate-pulse' : 'bg-green-600'}`}>{remainingSeconds}s</span>
                )}
                {gameState === 'finished' && <span className="text-xs bg-blue-600 px-2 py-1 rounded-full">Finished</span>}
            </h2>

            <div className="mb-4">
                <div className="text-white/80 text-sm font-medium">Balance</div>
                <div className="text-green-300 font-bold text-lg">${playerBalance}</div>
            </div>

            {/* Step 1: Symbol */}
            <div className="mb-4">
                <h3 className="text-white font-semibold text-xs tracking-wide mb-2 uppercase">1. Choose Symbol</h3>
                <div className="grid grid-cols-3 gap-2">
                    {symbols.map(s => {
                        const isSelected = selectedSymbol === s.name;
                        const isLocked = !!currentBet && currentBet.symbol === s.name;
                        let stateClasses = 'border-white/20 hover:border-white/40 bg-white/5';
                        if (isSelected) stateClasses = 'border-yellow-400 bg-yellow-400/20 shadow-lg';
                        else if (isLocked) stateClasses = 'border-green-500 bg-green-500/20';
                        const disabledClasses = currentBet ? 'cursor-not-allowed opacity-60' : '';
                        return (
                            <button
                                key={s.name}
                                disabled={!!currentBet || gameState !== 'betting'}
                                onClick={() => setSelectedSymbol(s.name)}
                                className={`relative group rounded-lg p-2 border text-center transition-all text-xs font-semibold tracking-wide ${stateClasses} ${disabledClasses}`}
                            >
                                <div className={`text-2xl mb-1 ${s.color}`}>{s.emoji}</div>
                                {s.name.slice(0, 4)}
                                {isSelected && !currentBet && (
                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 text-yellow-900 rounded-full flex items-center justify-center text-[10px] font-bold animate-bounce">✓</div>
                                )}
                                {isLocked && (
                                    <div className="absolute -top-1 -left-1 w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">💰</div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Step 2: Amount */}
            <div className="mb-4">
                <h3 className="text-white font-semibold text-xs tracking-wide mb-2 uppercase flex items-center justify-between">2. Amount {betAmount > playerBalance && <span className="text-red-400 text-[10px]">Exceeds balance</span>}</h3>
                <div className="grid grid-cols-4 gap-2 mb-2">
                    {quickBetAmounts.map(a => (
                        <button
                            key={a}
                            disabled={!!currentBet || gameState !== 'betting' || a > playerBalance}
                            onClick={() => setBetAmount(a)}
                            className={`py-2 rounded-md text-xs font-bold transition-all ${betAmount === a ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-lg' : 'bg-white/5 text-white/80 hover:bg-white/10'} ${(!!currentBet || a > playerBalance) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            ${a}
                        </button>
                    ))}
                </div>
                <div className="relative">
                    <input
                        type="number"
                        value={betAmount}
                        min={1}
                        max={playerBalance}
                        disabled={!!currentBet || gameState !== 'betting'}
                        onChange={e => setBetAmount(parseInt(e.target.value) || 0)}
                        className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-60"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 text-xs">USD</span>
                </div>
            </div>

            {/* Step 3: Place */}
            <div className="mt-auto">
                <button
                    onClick={place}
                    disabled={!canPlace}
                    className={`w-full py-3 rounded-lg font-bold text-sm transition-all ${canPlace ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl' : 'bg-white/10 text-white/40 cursor-not-allowed'} ${bettingClosingSoon && canPlace ? 'animate-pulse' : ''}`}
                >
                    {primaryLabel}
                </button>

                {currentBet && (
                    <div className="mt-4 bg-gradient-to-r from-blue-500/20 to-purple-600/20 border border-blue-400/30 rounded-lg p-3 space-y-1 text-sm">
                        <div className="flex items-center justify-between text-white/80">
                            <span className="font-semibold flex items-center gap-1">Active Bet</span>
                            <span className="text-green-300 font-bold">${currentBet.amount}</span>
                        </div>
                        <div className="text-white text-sm font-bold">{currentBet.symbol}</div>
                        <p className="text-[10px] text-white/50">Waiting for dealer to roll...</p>
                    </div>
                )}
            </div>

            {/* Mini rule helper */}
            <div className="mt-4 pt-4 border-t border-white/10 text-[11px] text-white/60 space-y-1">
                <div className="font-semibold text-white/70 flex items-center gap-1">📌 Tips</div>
                <ul className="list-disc list-inside space-y-0.5">
                    <li>Place one bet per round.</li>
                    <li>Payout = bet × symbol count + bet.</li>
                    <li>Timer shows remaining betting time.</li>
                </ul>
            </div>
        </div>
    );
};

BettingSidebar.propTypes = {
    onPlaceBet: PropTypes.func.isRequired,
    playerBalance: PropTypes.number.isRequired,
    disabled: PropTypes.bool,
    currentBet: PropTypes.shape({
        symbol: PropTypes.string,
        amount: PropTypes.number
    }),
    gameState: PropTypes.string.isRequired,
    bettingDeadline: PropTypes.number
};

BettingSidebar.defaultProps = {
    disabled: false,
    currentBet: null,
    bettingDeadline: null
};

export default BettingSidebar;
