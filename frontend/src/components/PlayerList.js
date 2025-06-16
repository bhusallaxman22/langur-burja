import React from 'react';

const PlayerList = ({ players, dealer, currentUserId, gameState }) => {
    const getPlayerStatusIcon = (player) => {
        if (dealer && dealer.id === player.id) return '👑';
        if (player.id === currentUserId) return '👤';
        return '🎮';
    };

    const getGameStateColor = () => {
        switch (gameState) {
            case 'waiting': return 'from-gray-400 to-gray-600';
            case 'betting': return 'from-blue-400 to-blue-600';
            case 'rolling': return 'from-orange-400 to-orange-600';
            case 'finished': return 'from-green-400 to-green-600';
            default: return 'from-gray-400 to-gray-600';
        }
    };

    const getGameStateText = () => {
        switch (gameState) {
            case 'waiting': return '⏳ Waiting';
            case 'betting': return '💰 Betting';
            case 'rolling': return '🎲 Rolling';
            case 'finished': return '🏁 Finished';
            default: return '❓ Unknown';
        }
    };

    return (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 md:p-6 shadow-2xl border border-white/20 h-fit">
            <div className="text-center mb-4 md:mb-6">
                <h2 className="text-xl md:text-2xl font-bold text-white mb-2">👥 Players</h2>
                <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4">
                    <div className="bg-white/20 rounded-lg px-3 py-1">
                        <span className="text-white font-medium text-sm md:text-base">{players.length}/6</span>
                    </div>
                    <div className={`bg-gradient-to-r ${getGameStateColor()} rounded-lg px-3 py-1`}>
                        <span className="text-white font-medium text-xs md:text-sm">{getGameStateText()}</span>
                    </div>
                </div>
            </div>

            <div className="space-y-2 md:space-y-3">
                {players.map((player, index) => {
                    const isCurrentUser = player.id === currentUserId;
                    const isDealer = dealer && dealer.id === player.id;

                    return (
                        <div
                            key={player.id}
                            className={`p-3 md:p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${isCurrentUser
                                ? 'border-yellow-400 bg-gradient-to-r from-yellow-400/20 to-orange-500/20 shadow-lg'
                                : isDealer
                                    ? 'border-purple-400 bg-gradient-to-r from-purple-400/20 to-pink-500/20'
                                    : 'border-white/30 bg-white/10 hover:bg-white/20'
                                }`}
                            style={{
                                animationDelay: `${index * 100}ms`
                            }}
                        >
                            <div className="flex justify-between items-center">
                                <div className="flex items-center space-x-2 md:space-x-3">
                                    <div className="relative">
                                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-lg md:text-xl font-bold ${isCurrentUser
                                            ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
                                            : isDealer
                                                ? 'bg-gradient-to-r from-purple-400 to-pink-500 text-white'
                                                : 'bg-gradient-to-r from-blue-400 to-blue-600 text-white'
                                            }`}>
                                            {player.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="absolute -top-1 -right-1 text-sm md:text-lg">
                                            {getPlayerStatusIcon(player)}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-white font-bold flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                                            <span className="text-sm md:text-base">{player.username}</span>
                                            <div className="flex space-x-1 mt-1 sm:mt-0">
                                                {isCurrentUser && (
                                                    <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full animate-pulse">
                                                        YOU
                                                    </span>
                                                )}
                                                {isDealer && (
                                                    <span className="text-xs bg-purple-400 text-purple-900 px-2 py-1 rounded-full">
                                                        DEALER
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-green-300 font-medium text-sm md:text-base">
                                            💰 ${player.balance}
                                        </div>
                                    </div>
                                </div>

                                <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full animate-pulse ${gameState === 'betting' ? 'bg-green-400' : 'bg-gray-400'
                                    }`}></div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Empty Slots */}
            {players.length < 6 && (
                <div className="mt-4 space-y-2">
                    {[...Array(6 - players.length)].map((_, index) => (
                        <div
                            key={`empty-${index}`}
                            className="p-3 md:p-4 border-2 border-dashed border-white/30 rounded-xl text-center bg-white/5"
                        >
                            <div className="text-white/60 font-medium text-sm md:text-base">
                                <div className="w-6 h-6 md:w-8 md:h-8 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-2">
                                    <span className="text-base md:text-lg">+</span>
                                </div>
                                <span className="text-xs md:text-sm">Waiting for player...</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Game Rules */}
            <div className="mt-4 md:mt-6 bg-white/5 rounded-lg p-3 md:p-4 border border-white/20">
                <h4 className="text-white font-bold mb-2 flex items-center text-sm md:text-base">
                    📖 How to Play
                </h4>
                <ul className="text-white/80 text-xs space-y-1">
                    <li>🎯 Choose a symbol and bet amount</li>
                    <li>🎲 Dealer rolls 6 dice with symbols</li>
                    <li>💰 Win if your symbol appears</li>
                    <li>🏆 Payout = Bet × Symbol Count + Bet</li>
                </ul>
            </div>
        </div>
    );
};

export default PlayerList;