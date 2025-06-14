import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import DiceDisplay from './DiceDisplay';
import InteractiveBoard from './InteractiveBoard';
import PlayerList from './PlayerList';
import GameHeader from './GameHeader';
import AddFundsModal from './AddFundsModal';
import DebugPanel from './DebugPanel';

const GameRoom = ({ user, setUser }) => {
    const { roomCode } = useParams();
    const navigate = useNavigate();
    const [socket, setSocket] = useState(null);
    const [gameState, setGameState] = useState({
        players: [],
        dealer: null,
        gameState: 'waiting',
        roundNumber: 0,
        diceResults: [],
        currentBet: null,
        roundResults: [],
        isRolling: false
    });
    const [message, setMessage] = useState('');
    const [showResults, setShowResults] = useState(false);
    const [showAddFunds, setShowAddFunds] = useState(false);

    // Function to update user data and sync with localStorage
    const updateUserData = (newUserData) => {
        console.log('Updating user data:', newUserData);
        setUser(newUserData);
        localStorage.setItem('user', JSON.stringify(newUserData));
        console.log('Updated localStorage with:', newUserData);
    };

    useEffect(() => {
        const newSocket = io('');
        setSocket(newSocket);

        newSocket.on('connect', () => {
            newSocket.emit('join_game', {
                roomCode,
                player: user
            });
        });

        newSocket.on('game_updated', (data) => {
            setGameState(prev => ({
                ...prev,
                players: data.players,
                dealer: data.dealer,
                gameState: data.gameState
            }));

            const currentPlayer = data.players.find(p => p.id === user.id);
            if (currentPlayer && currentPlayer.balance !== user.balance) {
                console.log(`Updating user balance from game state: ${user.balance} -> ${currentPlayer.balance}`);
                updateUserData({ ...user, balance: currentPlayer.balance });
            }
        });

        newSocket.on('round_started', (data) => {
            setGameState(prev => ({
                ...prev,
                roundNumber: data.roundNumber,
                gameState: data.gameState,
                diceResults: [],
                roundResults: [],
                isRolling: false,
                currentBet: null
            }));
            setShowResults(false);
            setMessage('🎲 New round started! Place your bets.');
        });

        newSocket.on('bet_placed', (data) => {
            setGameState(prev => ({
                ...prev,
                players: data.players
            }));
            if (data.playerId === user.id) {
                setGameState(prev => ({
                    ...prev,
                    currentBet: { symbol: data.symbol, amount: data.amount }
                }));
                setMessage('✅ Bet placed successfully!');
                updateUserData({ ...user, balance: user.balance - data.amount });
            }
        });

        newSocket.on('dice_rolled', (data) => {
            setGameState(prev => ({
                ...prev,
                isRolling: true
            }));

            setTimeout(() => {
                setGameState(prev => ({
                    ...prev,
                    diceResults: data.diceResults,
                    roundResults: data.roundResults,
                    players: data.players,
                    gameState: 'finished',
                    isRolling: false
                }));
                setShowResults(true);

                const currentPlayer = data.players.find(p => p.id === user.id);
                if (currentPlayer) {
                    updateUserData({ ...user, balance: currentPlayer.balance });
                }

                const userResult = data.roundResults.find(r => r.playerId === user.id);
                if (userResult && userResult.won) {
                    setMessage(`🎉 You won $${userResult.winnings}! Amazing!`);
                } else if (userResult) {
                    setMessage(`💔 You lost this round. Better luck next time!`);
                } else {
                    setMessage('🎉 Round finished! Check your results.');
                }
            }, 4000);
        });

        newSocket.on('new_game_started', (data) => {
            setMessage(data.message);
            setShowResults(false);
            setGameState(prev => ({
                ...prev,
                currentBet: null,
                diceResults: [],
                roundResults: []
            }));
        });

        newSocket.on('balance_updated', (data) => {
            console.log('Balance updated via socket:', data);
            updateUserData({ ...user, balance: parseFloat(data.balance) });

            setGameState(prev => ({
                ...prev,
                players: prev.players.map(p =>
                    p.id === user.id ? { ...p, balance: parseFloat(data.balance) } : p
                )
            }));

            if (data.message) {
                setMessage(data.message);
            }
        });

        newSocket.on('join_failed', (data) => {
            setMessage(data.message);
            setTimeout(() => navigate('/lobby'), 2000);
        });

        return () => newSocket.close();
    }, [roomCode, user, navigate]);

    const placeBet = (symbol, amount) => {
        if (socket) {
            socket.emit('place_bet', {
                roomCode,
                playerId: user.id,
                symbol,
                amount
            });
        }
    };

    const startRound = () => {
        if (socket) {
            socket.emit('start_round', { roomCode });
        }
    };

    const rollDice = () => {
        if (socket) {
            socket.emit('roll_dice', { roomCode });
            setMessage('🎲 Rolling dice...');
        }
    };

    const startNewGame = () => {
        if (socket) {
            socket.emit('start_new_game', { roomCode });
            setMessage('🆕 Starting new game...');
        }
    };

    const handleAddFunds = async (paymentData) => {
        try {
            console.log('handleAddFunds called with payment data:', paymentData);
            const { addedAmount, newBalance } = paymentData;

            // Create updated user object
            const updatedUser = {
                ...user,
                balance: parseFloat(newBalance)
            };

            console.log('Updating user from:', user, 'to:', updatedUser);

            // Update user state and localStorage
            updateUserData(updatedUser);

            // Update game state
            setGameState(prev => ({
                ...prev,
                players: prev.players.map(p =>
                    p.id === user.id ? { ...p, balance: parseFloat(newBalance) } : p
                )
            }));

            setMessage(`💰 Successfully added $${addedAmount}! New balance: $${newBalance}`);

            // Close modal
            setShowAddFunds(false);

            // Force refresh balance from server to ensure sync
            if (socket) {
                console.log('Requesting balance refresh from server');
                socket.emit('refresh_balance', { userId: user.id });
            }

            // Also fetch fresh balance from API as backup
            setTimeout(async () => {
                try {
                    console.log('Fetching balance from API for verification');
                    const response = await fetch(`/api/balance/${user.id}`);
                    const data = await response.json();
                    if (data.success) {
                        console.log(`Server balance verification: $${data.balance} vs local: $${newBalance}`);
                        if (Math.abs(data.balance - newBalance) > 0.01) {
                            console.log(`Balance mismatch detected, correcting to server value: $${data.balance}`);
                            updateUserData({ ...user, balance: data.balance });
                        }
                    }
                } catch (error) {
                    console.error('Error fetching updated balance:', error);
                }
            }, 2000);

        } catch (error) {
            setMessage('❌ Error processing payment. Please try again.');
            console.error('Payment processing error:', error);
        }
    };

    const isDealer = gameState.dealer && gameState.dealer.id === user.id;
    const currentPlayer = gameState.players.find(p => p.id === user.id);

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
            <div className="max-w-7xl mx-auto">
                <GameHeader
                    roomCode={roomCode}
                    user={user}
                    onLeave={() => navigate('/lobby')}
                    onAddFunds={() => setShowAddFunds(true)}
                    message={message}
                />

                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mt-6">
                    <div className="xl:col-span-3 space-y-6">
                        <DiceDisplay
                            diceResults={gameState.diceResults}
                            roundResults={gameState.roundResults}
                            currentBet={gameState.currentBet}
                            isRolling={gameState.isRolling}
                            showResults={showResults}
                            roundNumber={gameState.roundNumber}
                        />

                        {(gameState.gameState === 'betting' || gameState.gameState === 'finished') && (
                            <InteractiveBoard
                                onPlaceBet={placeBet}
                                playerBalance={currentPlayer?.balance || user.balance}
                                disabled={!!gameState.currentBet || gameState.gameState === 'finished'}
                                currentBet={gameState.currentBet}
                                gameState={gameState.gameState}
                            />
                        )}

                        {isDealer && (
                            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl p-6 shadow-2xl">
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                                    👑 Dealer Controls
                                </h3>
                                <div className="flex flex-wrap gap-4">
                                    {gameState.gameState === 'waiting' && gameState.players.length >= 2 && (
                                        <button
                                            onClick={startRound}
                                            className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg font-bold transform hover:scale-105 transition-all duration-200 shadow-lg"
                                        >
                                            🚀 Start Round {gameState.roundNumber + 1}
                                        </button>
                                    )}
                                    {gameState.gameState === 'betting' && (
                                        <button
                                            onClick={rollDice}
                                            className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-lg font-bold transform hover:scale-105 transition-all duration-200 shadow-lg animate-pulse"
                                        >
                                            🎲 Roll Dice
                                        </button>
                                    )}
                                    {gameState.gameState === 'finished' && (
                                        <button
                                            onClick={startNewGame}
                                            className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-bold transform hover:scale-105 transition-all duration-200 shadow-lg"
                                        >
                                            🆕 Start New Round
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="xl:col-span-1">
                        <PlayerList
                            players={gameState.players}
                            dealer={gameState.dealer}
                            currentUserId={user.id}
                            gameState={gameState.gameState}
                        />
                    </div>
                </div>
            </div>

            {showAddFunds && (
                <AddFundsModal
                    onClose={() => setShowAddFunds(false)}
                    onAddFunds={handleAddFunds}
                    currentBalance={user.balance}
                    user={user}
                />
            )}
            {process.env.NODE_ENV === 'development' && <DebugPanel user={user} />}
        </div>
    );
};

export default GameRoom;