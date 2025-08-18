import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

/*
    Improved InteractiveBoard
    - Compact responsive layout (symbols grid + amount + action)
    - Keyboard navigation (Arrow keys cycle symbols, Enter places bet, digits select quick amount)
    - Accessible ARIA roles & live regions
    - Subtle, performant animations (reduced heavy shadows)
*/

const InteractiveBoard = ({ onPlaceBet, playerBalance, disabled, currentBet, gameState }) => {
    const [selectedSymbol, setSelectedSymbol] = useState('');
    const [betAmount, setBetAmount] = useState(10);
    const [hoverSymbol, setHoverSymbol] = useState('');
    const [announcement, setAnnouncement] = useState('');
    const symbolButtonRefs = useRef([]);

    const symbols = useMemo(() => ([
        { name: 'DIAMONDS', emoji: '♦️', color: 'text-red-600' },
        { name: 'CLUBS', emoji: '♣️', color: 'text-gray-800' },
        { name: 'HEARTS', emoji: '♥️', color: 'text-red-600' },
        { name: 'SPADES', emoji: '♠️', color: 'text-gray-800' },
        { name: 'CROWN', emoji: '👑', color: 'text-yellow-600' },
        { name: 'FLAG', emoji: '🏴', color: 'text-gray-700' }
    ]), []);

    const quickBetAmounts = useMemo(() => [10, 25, 50, 100], []);

    const handlePlaceBet = useCallback(() => {
        if (disabled) return;
        if (selectedSymbol && betAmount > 0 && betAmount <= playerBalance) {
            onPlaceBet(selectedSymbol, betAmount);
            setAnnouncement(`Bet placed on ${selectedSymbol} for $${betAmount}`);
        } else if (!selectedSymbol) {
            setAnnouncement('Select a symbol before placing bet');
        }
    }, [selectedSymbol, betAmount, playerBalance, onPlaceBet, disabled]);

    const focusSymbolIndex = useCallback((idx) => {
        const clamped = (idx + symbols.length) % symbols.length;
        const sym = symbols[clamped];
        setSelectedSymbol(sym.name);
        const btn = symbolButtonRefs.current[clamped];
        if (btn) btn.focus();
    }, [symbols]);

    const handleKeyDown = useCallback((e) => {
        if (disabled || gameState !== 'betting') return;
        switch (e.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                e.preventDefault();
                focusSymbolIndex(symbols.findIndex(s => s.name === selectedSymbol) + 1);
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                e.preventDefault();
                focusSymbolIndex(symbols.findIndex(s => s.name === selectedSymbol) - 1);
                break;
            case 'Enter':
            case ' ': // space
                if (selectedSymbol) {
                    e.preventDefault();
                    handlePlaceBet();
                }
                break;
            default:
                // Digit quick amount shortcuts (1..4 corresponding to quick bet array)
                if (/^[1-4]$/.test(e.key)) {
                    const idx = parseInt(e.key, 10) - 1;
                    if (quickBetAmounts[idx] && quickBetAmounts[idx] <= playerBalance) {
                        setBetAmount(quickBetAmounts[idx]);
                        setAnnouncement(`Bet amount set to $${quickBetAmounts[idx]}`);
                    }
                }
        }
    }, [disabled, gameState, selectedSymbol, handlePlaceBet, quickBetAmounts, playerBalance, symbols, focusSymbolIndex]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Reset after round finishes
    useEffect(() => {
        if (gameState === 'finished') {
            setSelectedSymbol('');
            setBetAmount(10);
        }
    }, [gameState]);

    return (
        <div className="relative max-w-3xl mx-auto">
            <div className="relative bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">🎯 Betting Board
                        <span className="text-xs font-medium bg-blue-500/20 text-blue-200 px-2 py-1 rounded-full">Interactive</span>
                    </h2>
                    <div className="flex items-center gap-3">
                        <div className="bg-green-600/20 text-green-300 text-sm font-semibold px-3 py-1 rounded-lg border border-green-500/30">Balance: ${playerBalance}</div>
                        <div className="hidden sm:block text-xs text-white/50">Shortcuts: Arrows Move • Enter Place • 1-4 Amount</div>
                    </div>
                </header>

                {gameState === 'finished' && (
                    <div className="text-center mb-4 p-3 bg-red-500/10 border border-red-500/40 rounded-lg">
                        <p className="text-red-200 font-semibold">⏳ Round finished - waiting for dealer</p>
                    </div>
                )}

                {/* Grid / Amount responsive layout */}
                <div className="grid md:grid-cols-7 gap-8" aria-label="Betting controls">
                    {/* Symbols */}
                    <div className="md:col-span-4" role="group" aria-label="Select symbol">
                        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wide mb-3">1. Symbol</h3>
                        <div className="grid grid-cols-6 gap-3" data-testid="symbol-grid">
                            {symbols.map((symbol, index) => {
                                const isSelected = selectedSymbol === symbol.name;
                                const isHovered = hoverSymbol === symbol.name;
                                const isCurrent = currentBet && currentBet.symbol === symbol.name;

                                const baseClasses = 'relative p-3 rounded-xl border transition-all duration-200 flex flex-col items-center justify-center focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-400/60';
                                let stateClasses = 'border-white/15 bg-white/5 hover:border-white/40 hover:translate-y-[-2px]';
                                if (isSelected) stateClasses = 'border-yellow-400 bg-yellow-500/20 shadow-lg scale-105';
                                else if (isCurrent) stateClasses = 'border-green-400 bg-green-500/20';
                                else if (isHovered) stateClasses = 'border-yellow-300/60 bg-white/10';

                                return (
                                    <button
                                        key={symbol.name}
                                        ref={el => { symbolButtonRefs.current[index] = el; }}
                                        aria-pressed={isSelected}
                                        aria-label={`Symbol ${symbol.name}${isCurrent ? ' (current bet)' : ''}`}
                                        onClick={() => !disabled && setSelectedSymbol(symbol.name)}
                                        onMouseEnter={() => setHoverSymbol(symbol.name)}
                                        onMouseLeave={() => setHoverSymbol('')}
                                        disabled={disabled}
                                        className={`${baseClasses} ${stateClasses} ${disabled && !isCurrent ? 'opacity-40 cursor-not-allowed' : ''}`}
                                    >
                                        <span className={`text-2xl mb-1 select-none ${symbol.color} ${(isSelected || isCurrent) ? 'animate-bounce' : ''}`}>{symbol.emoji}</span>
                                        <span className="text-[10px] font-semibold tracking-wide text-white/80">{symbol.name.slice(0, 4)}</span>
                                        {isSelected && !isCurrent && (
                                            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-400 text-yellow-900 text-[10px] font-bold flex items-center justify-center animate-pulse">✓</span>
                                        )}
                                        {isCurrent && (
                                            <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-green-500 text-white text-[10px] font-bold flex items-center justify-center">💰</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    {/* Amount + Action */}
                    <div className="md:col-span-3 flex flex-col gap-4" aria-label="Bet amount and action" role="group">
                        <div>
                            <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wide mb-3">2. Amount</h3>
                            <div className="grid grid-cols-4 gap-2 mb-3">
                                {quickBetAmounts.map((amount) => {
                                    const active = betAmount === amount;
                                    const disabledAmt = disabled || amount > playerBalance;
                                    return (
                                        <button
                                            key={amount}
                                            type="button"
                                            aria-pressed={active}
                                            aria-label={`Set bet amount ${amount}`}
                                            onClick={() => !disabledAmt && setBetAmount(amount)}
                                            disabled={disabledAmt}
                                            className={`py-2 rounded-md text-xs font-bold transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/50 ${active ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-lg' : 'bg-white/10 text-white/70 hover:bg-white/20'} ${disabledAmt ? 'opacity-40 cursor-not-allowed' : ''}`}
                                        >
                                            ${amount}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
                                <input
                                    type="number"
                                    value={betAmount}
                                    aria-label="Custom bet amount"
                                    onChange={(e) => !disabled && setBetAmount(parseInt(e.target.value) || 0)}
                                    disabled={disabled}
                                    min="1"
                                    max={playerBalance}
                                    className="w-full pl-7 pr-3 py-2 rounded-lg bg-white/5 border border-white/20 text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-40"
                                />
                            </div>
                        </div>
                        <div className="mt-auto">
                            <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wide mb-3">3. Place</h3>
                            <button
                                type="button"
                                onClick={handlePlaceBet}
                                disabled={disabled || !selectedSymbol || betAmount <= 0 || betAmount > playerBalance}
                                className={`w-full py-3 rounded-lg font-bold text-sm transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-green-400/60 ${disabled || !selectedSymbol || betAmount <= 0 || betAmount > playerBalance
                                    ? 'bg-white/10 text-white/40 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg hover:shadow-xl hover:translate-y-[-2px]'
                                    }`}
                            >
                                {disabled && gameState === 'finished' ? '⏳ Finished' : disabled && currentBet ? '✅ Bet Placed' : '💰 Place Bet'}
                            </button>
                            <div className="mt-4 bg-white/5 border border-white/10 rounded-lg p-3">
                                <h4 className="text-white/80 font-semibold text-xs mb-2 flex items-center gap-1">📋 Quick Rules</h4>
                                <ul className="text-white/60 text-[11px] space-y-1">
                                    <li>Choose one symbol each round.</li>
                                    <li>Payout = bet × symbol count + bet.</li>
                                    <li>No matches → lose bet.</li>
                                    <li>Shortcuts: 1-4 set amount.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ARIA live region for announcements */}
                <div aria-live="polite" className="sr-only">{announcement}</div>
            </div>
        </div>
    );
};

export default InteractiveBoard;