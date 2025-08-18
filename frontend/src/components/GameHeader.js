import React from 'react';

const GameHeader = ({ roomCode, user, onLeave, onAddFunds, message }) => {
    return (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 md:p-6 shadow-2xl border border-white/20">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4 lg:gap-0">
                <div className="space-y-2 text-center lg:text-left">
                    <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                        🎲 Langur Burja
                    </h1>
                    <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start space-y-2 sm:space-y-0 sm:space-x-4">
                        <div className="bg-white/20 rounded-lg px-3 md:px-4 py-2 text-sm md:text-base">
                            <span className="text-white font-medium">Room: </span>
                            <span className="text-yellow-300 font-bold text-base md:text-lg">{roomCode}</span>
                        </div>
                        <div className="bg-white/20 rounded-lg px-3 md:px-4 py-2 text-sm md:text-base">
                            <span className="text-white font-medium">Player: </span>
                            <span className="text-green-300 font-bold">{user.username}</span>
                        </div>
                        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg px-3 md:px-4 py-2 border border-green-400 text-sm md:text-base">
                            <span className="text-white font-medium">Balance: </span>
                            <span className="text-white font-bold text-base md:text-lg">${user.balance}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full lg:w-auto">
                    <button
                        onClick={onAddFunds}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 md:px-6 py-3 rounded-lg font-bold transform hover:scale-105 transition-all duration-200 shadow-lg w-full sm:w-auto mobile-button"
                    >
                        💰 Add Funds
                    </button>
                    <button
                        onClick={onLeave}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 md:px-6 py-3 rounded-lg font-bold transform hover:scale-105 transition-all duration-200 shadow-lg w-full sm:w-auto mobile-button"
                    >
                        🚪 Leave Game
                    </button>
                </div>
            </div>

            {message && (
                <div className="mt-4 bg-blue-500/20 border border-blue-400/30 text-blue-100 px-4 md:px-6 py-3 rounded-lg backdrop-blur-sm animate-pulse text-center lg:text-left">
                    <p className="font-medium text-sm md:text-base">{message}</p>
                </div>
            )}
        </div>
    );
};

export default GameHeader;