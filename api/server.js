require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path = require('path');

const app = express();
const server = http.createServer(app);

// Configure CORS for production
const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? [
            'https://langur-burja.vercel.app',
            'https://langur-burja-git-main-bhusallaxman22.vercel.app',
            'https://langur-burja-bhusallaxman22.vercel.app'
        ]
        : "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
};

const io = socketIo(server, {
    cors: corsOptions
});

app.use(cors(corsOptions));
app.use(express.json());

// Serve static files from dist directory BEFORE API routes
if (process.env.NODE_ENV === 'production') {
    // Serve static files with proper cache headers
    app.use(express.static(path.join(__dirname, '../public'), {
        maxAge: '1y',
        etag: false
    }));

    console.log('Production mode: Serving static files from dist directory');
} else {
    console.log('Development mode: Not serving static files');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV,
        build_time: '2025-06-14T22:33:12Z'
    });
});

// Database connection with environment variables
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 19995,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

// Game symbols
const SYMBOLS = ['DIAMONDS', 'CLUBS', 'HEARTS', 'SPADES', 'CROWN', 'FLAG'];

// Active games storage
const activeGames = new Map();
const playerSockets = new Map();

// Database initialization
async function initDatabase() {
    try {
        const connection = await mysql.createConnection(dbConfig);

        // Check if updated_at column exists, if not add it
        try {
            await connection.execute(`
        ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      `);
            console.log('Added updated_at column to users table');
        } catch (error) {
            if (error.code !== 'ER_DUP_FIELDNAME') {
                console.log('updated_at column already exists or other error:', error.message);
            }
        }

        await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        balance DECIMAL(10,2) DEFAULT 1000.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

        await connection.execute(`
      CREATE TABLE IF NOT EXISTS games (
        id INT AUTO_INCREMENT PRIMARY KEY,
        room_code VARCHAR(10) UNIQUE NOT NULL,
        status ENUM('waiting', 'active', 'finished') DEFAULT 'waiting',
        max_players INT DEFAULT 6,
        current_players INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await connection.execute(`
      CREATE TABLE IF NOT EXISTS game_players (
        id INT AUTO_INCREMENT PRIMARY KEY,
        game_id INT,
        user_id INT,
        balance DECIMAL(10,2) DEFAULT 0,
        is_dealer BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (game_id) REFERENCES games(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

        await connection.execute(`
      CREATE TABLE IF NOT EXISTS game_rounds (
        id INT AUTO_INCREMENT PRIMARY KEY,
        game_id INT,
        round_number INT,
        dice_results JSON,
        bets JSON,
        results JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (game_id) REFERENCES games(id)
      )
    `);

        await connection.execute(`
      CREATE TABLE IF NOT EXISTS balance_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        transaction_type ENUM('deposit', 'withdrawal', 'bet_win', 'bet_loss') NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        balance_before DECIMAL(10,2) NOT NULL,
        balance_after DECIMAL(10,2) NOT NULL,
        description VARCHAR(255),
        stripe_payment_intent_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

        console.log('Database initialized successfully');
        await connection.end();
    } catch (error) {
        console.error('Database initialization error:', error);
    }
}

// Update user balance in database - Fixed version
async function updateUserBalance(userId, newBalance, transactionType, amount, description = '', stripePaymentIntentId = null) {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        // Start transaction
        await connection.beginTransaction();

        // Get current balance
        const [currentUser] = await connection.execute(
            'SELECT balance FROM users WHERE id = ? FOR UPDATE',
            [userId]
        );

        if (currentUser.length === 0) {
            await connection.rollback();
            await connection.end();
            console.error(`User with ID ${userId} not found`);
            return false;
        }

        const balanceBefore = parseFloat(currentUser[0].balance);
        console.log(`Updating balance for user ${userId}: ${balanceBefore} -> ${newBalance}`);

        // Update user balance - with fallback for missing updated_at column
        try {
            const [updateResult] = await connection.execute(
                'UPDATE users SET balance = ?, updated_at = NOW() WHERE id = ?',
                [newBalance, userId]
            );

            if (updateResult.affectedRows === 0) {
                await connection.rollback();
                await connection.end();
                console.error(`Failed to update balance for user ${userId}`);
                return false;
            }
        } catch (updateError) {
            if (updateError.code === 'ER_BAD_FIELD_ERROR') {
                // Fallback: update without updated_at column
                console.log('updated_at column not found, updating without it');
                const [updateResult] = await connection.execute(
                    'UPDATE users SET balance = ? WHERE id = ?',
                    [newBalance, userId]
                );

                if (updateResult.affectedRows === 0) {
                    await connection.rollback();
                    await connection.end();
                    console.error(`Failed to update balance for user ${userId}`);
                    return false;
                }
            } else {
                throw updateError;
            }
        }

        // Record transaction
        await connection.execute(
            'INSERT INTO balance_transactions (user_id, transaction_type, amount, balance_before, balance_after, description, stripe_payment_intent_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, transactionType, amount, balanceBefore, newBalance, description, stripePaymentIntentId]
        );

        // Commit transaction
        await connection.commit();
        await connection.end();

        console.log(`Balance updated successfully for user ${userId}: ${balanceBefore} -> ${newBalance}`);
        return true;
    } catch (error) {
        console.error('Error updating user balance:', error);
        if (connection) {
            try {
                await connection.rollback();
                await connection.end();
            } catch (rollbackError) {
                console.error('Error rolling back transaction:', rollbackError);
            }
        }
        return false;
    }
}

// Game logic class
class LangurBurjaGame {
    constructor(roomCode) {
        this.roomCode = roomCode;
        this.players = [];
        this.dealer = null;
        this.currentRound = 0;
        this.bets = new Map();
        this.gameState = 'waiting';
        this.roundTimer = null;
    }

    addPlayer(player) {
        if (this.players.length < 6) {
            this.players.push(player);
            if (this.players.length === 1) {
                this.dealer = player;
            }
            return true;
        }
        return false;
    }

    removePlayer(playerId) {
        this.players = this.players.filter(p => p.id !== playerId);
        if (this.dealer && this.dealer.id === playerId && this.players.length > 0) {
            this.dealer = this.players[0];
        }
    }

    placeBet(playerId, symbol, amount) {
        const player = this.players.find(p => p.id === playerId);
        if (player && player.balance >= amount && this.gameState === 'betting') {
            this.bets.set(playerId, { symbol, amount });
            player.balance -= amount;
            return true;
        }
        return false;
    }

    rollDice() {
        const results = [];
        for (let i = 0; i < 6; i++) {
            results.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
        }
        return results;
    }

    async calculateWinnings(diceResults) {
        const symbolCounts = {};
        diceResults.forEach(symbol => {
            symbolCounts[symbol] = (symbolCounts[symbol] || 0) + 1;
        });

        const roundResults = [];

        for (const [playerId, bet] of this.bets) {
            const player = this.players.find(p => p.id === playerId);
            const count = symbolCounts[bet.symbol] || 0;

            if (count > 0) {
                const winnings = bet.amount + (bet.amount * count);
                const oldBalance = player.balance;
                player.balance += winnings;

                await updateUserBalance(
                    player.id,
                    player.balance,
                    'bet_win',
                    winnings,
                    `Won ${winnings} with ${count} ${bet.symbol} in round ${this.currentRound}`
                );

                roundResults.push({
                    playerId,
                    won: true,
                    winnings,
                    symbol: bet.symbol,
                    count,
                    oldBalance,
                    newBalance: player.balance
                });
            } else {
                await updateUserBalance(
                    player.id,
                    player.balance,
                    'bet_loss',
                    bet.amount,
                    `Lost ${bet.amount} betting on ${bet.symbol} in round ${this.currentRound}`
                );

                roundResults.push({
                    playerId,
                    won: false,
                    winnings: 0,
                    symbol: bet.symbol,
                    count: 0,
                    lostAmount: bet.amount,
                    newBalance: player.balance
                });
            }
        }

        return roundResults;
    }

    startNewRound() {
        this.currentRound++;
        this.bets.clear();
        this.gameState = 'betting';

        this.roundTimer = setTimeout(() => {
            this.rollDiceAndCalculate();
        }, 30000);
    }

    startNewGame() {
        this.bets.clear();
        this.gameState = 'waiting';

        if (this.roundTimer) {
            clearTimeout(this.roundTimer);
            this.roundTimer = null;
        }

        console.log(`Game ${this.roomCode}: Starting new game, state reset to waiting`);
    }

    async rollDiceAndCalculate() {
        if (this.roundTimer) {
            clearTimeout(this.roundTimer);
        }

        this.gameState = 'rolling';
        const diceResults = this.rollDice();
        const roundResults = await this.calculateWinnings(diceResults);

        return { diceResults, roundResults };
    }
}

// API Routes
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const connection = await mysql.createConnection(dbConfig);

        const hashedPassword = await bcrypt.hash(password, 10);

        await connection.execute(
            'INSERT INTO users (username, password) VALUES (?, ?)',
            [username, hashedPassword]
        );

        await connection.end();
        res.json({ success: true, message: 'User registered successfully' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const connection = await mysql.createConnection(dbConfig);

        const [rows] = await connection.execute(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        if (rows.length === 0) {
            await connection.end();
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const user = rows[0];
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            await connection.end();
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user.id, username: user.username }, process.env.JWT_SECRET || 'your_jwt_secret');

        await connection.end();
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                balance: parseFloat(user.balance)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create Stripe Payment Intent
app.post('/api/create-payment-intent', async (req, res) => {
    try {
        const { amount, userId } = req.body;

        console.log(`Creating payment intent for user ${userId}, amount: $${amount}`);

        if (!amount || amount <= 0 || amount > 10000) {
            return res.status(400).json({
                success: false,
                message: 'Invalid amount. Must be between $1 and $10,000.'
            });
        }

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required.'
            });
        }

        // Verify user exists
        const connection = await mysql.createConnection(dbConfig);
        const [user] = await connection.execute(
            'SELECT id, username FROM users WHERE id = ?',
            [userId]
        );
        await connection.end();

        if (user.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        // Create a PaymentIntent with Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency: 'usd',
            metadata: {
                userId: userId.toString(),
                username: user[0].username,
                type: 'game_deposit'
            },
            description: `Langur Burja Game Deposit - $${amount} for ${user[0].username}`
        });

        console.log(`Payment intent created: ${paymentIntent.id} for user ${userId}`);

        res.json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });
    } catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create payment intent: ' + error.message
        });
    }
});

// Confirm payment and add funds
app.post('/api/confirm-payment', async (req, res) => {
    let connection;
    try {
        const { paymentIntentId, userId } = req.body;

        console.log(`Confirming payment: ${paymentIntentId} for user ${userId}`);

        if (!paymentIntentId || !userId) {
            return res.status(400).json({
                success: false,
                message: 'Payment Intent ID and User ID are required'
            });
        }

        // Retrieve the payment intent from Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        console.log(`Payment intent status: ${paymentIntent.status}`);

        if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({
                success: false,
                message: `Payment not successful. Status: ${paymentIntent.status}`
            });
        }

        // Verify the userId matches
        if (paymentIntent.metadata.userId !== userId.toString()) {
            console.error(`User ID mismatch: ${paymentIntent.metadata.userId} vs ${userId}`);
            return res.status(400).json({
                success: false,
                message: 'Payment verification failed - user mismatch'
            });
        }

        const amount = paymentIntent.amount / 100; // Convert from cents
        console.log(`Processing payment of $${amount} for user ${userId}`);

        // Get current user balance with transaction
        connection = await mysql.createConnection(dbConfig);
        await connection.beginTransaction();

        const [user] = await connection.execute(
            'SELECT id, username, balance FROM users WHERE id = ? FOR UPDATE',
            [userId]
        );

        if (user.length === 0) {
            await connection.rollback();
            await connection.end();
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const currentBalance = parseFloat(user[0].balance);
        const newBalance = currentBalance + amount;

        console.log(`User ${userId} balance: ${currentBalance} -> ${newBalance}`);

        // Update user balance - with fallback for missing updated_at column
        try {
            const [updateResult] = await connection.execute(
                'UPDATE users SET balance = ?, updated_at = NOW() WHERE id = ?',
                [newBalance, userId]
            );

            if (updateResult.affectedRows === 0) {
                await connection.rollback();
                await connection.end();
                console.error(`Failed to update balance for user ${userId}`);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to update user balance'
                });
            }
        } catch (updateError) {
            if (updateError.code === 'ER_BAD_FIELD_ERROR') {
                // Fallback: update without updated_at column
                console.log('updated_at column not found, updating without it');
                const [updateResult] = await connection.execute(
                    'UPDATE users SET balance = ? WHERE id = ?',
                    [newBalance, userId]
                );

                if (updateResult.affectedRows === 0) {
                    await connection.rollback();
                    await connection.end();
                    console.error(`Failed to update balance for user ${userId}`);
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to update user balance'
                    });
                }
            } else {
                throw updateError;
            }
        }

        // Record transaction
        await connection.execute(
            'INSERT INTO balance_transactions (user_id, transaction_type, amount, balance_before, balance_after, description, stripe_payment_intent_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, 'deposit', amount, currentBalance, newBalance, `Stripe payment deposit - $${amount}`, paymentIntentId]
        );

        // Commit transaction
        await connection.commit();
        await connection.end();

        console.log(`Payment confirmed successfully for user ${userId}: +$${amount}, new balance: $${newBalance}`);

        // Notify connected clients via socket if user is online
        const socketId = playerSockets.get(parseInt(userId));
        if (socketId) {
            io.to(socketId).emit('balance_updated', {
                balance: newBalance,
                message: `Successfully added $${amount} to your account!`
            });
        }

        res.json({
            success: true,
            message: 'Funds added successfully',
            newBalance: newBalance,
            amount: amount
        });

    } catch (error) {
        console.error('Error confirming payment:', error);
        if (connection) {
            try {
                await connection.rollback();
                await connection.end();
            } catch (rollbackError) {
                console.error('Error rolling back transaction:', rollbackError);
            }
        }
        res.status(500).json({
            success: false,
            message: 'Payment confirmation failed: ' + error.message
        });
    }
});

// Get Stripe publishable key
app.get('/api/stripe-config', (req, res) => {
    res.json({
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    });
});

// Get user balance route
app.get('/api/balance/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const connection = await mysql.createConnection(dbConfig);

        const [user] = await connection.execute(
            'SELECT balance FROM users WHERE id = ?',
            [userId]
        );

        if (user.length === 0) {
            await connection.end();
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        await connection.end();
        res.json({
            success: true,
            balance: parseFloat(user[0].balance)
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Debug route to check transactions
app.get('/api/debug/transactions/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const connection = await mysql.createConnection(dbConfig);

        const [transactions] = await connection.execute(
            'SELECT * FROM balance_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
            [userId]
        );

        const [user] = await connection.execute(
            'SELECT id, username, balance FROM users WHERE id = ?',
            [userId]
        );

        await connection.end();

        res.json({
            user: user[0] || null,
            transactions: transactions
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_game', (data) => {
        const { roomCode, player } = data;

        // Store socket mapping for balance updates
        playerSockets.set(player.id, socket.id);

        if (!activeGames.has(roomCode)) {
            activeGames.set(roomCode, new LangurBurjaGame(roomCode));
        }

        const game = activeGames.get(roomCode);
        const success = game.addPlayer(player);

        if (success) {
            socket.join(roomCode);

            io.to(roomCode).emit('game_updated', {
                players: game.players,
                dealer: game.dealer,
                gameState: game.gameState
            });
        } else {
            socket.emit('join_failed', { message: 'Game is full' });
        }
    });

    socket.on('place_bet', (data) => {
        const { roomCode, playerId, symbol, amount } = data;
        const game = activeGames.get(roomCode);

        if (game && game.placeBet(playerId, symbol, amount)) {
            io.to(roomCode).emit('bet_placed', {
                playerId,
                symbol,
                amount,
                players: game.players
            });
        } else {
            socket.emit('bet_failed', { message: 'Invalid bet' });
        }
    });

    socket.on('start_round', (data) => {
        const { roomCode } = data;
        const game = activeGames.get(roomCode);

        if (game && game.gameState === 'waiting') {
            game.startNewRound();
            console.log(`Game ${roomCode}: Round ${game.currentRound} started`);

            io.to(roomCode).emit('round_started', {
                roundNumber: game.currentRound,
                gameState: game.gameState
            });
        }
    });

    socket.on('start_new_game', (data) => {
        const { roomCode } = data;
        const game = activeGames.get(roomCode);

        if (game) {
            game.startNewGame();
            console.log(`Game ${roomCode}: New game started, resetting to waiting state`);

            io.to(roomCode).emit('game_updated', {
                players: game.players,
                dealer: game.dealer,
                gameState: game.gameState
            });

            io.to(roomCode).emit('new_game_started', {
                message: 'New game started! Ready for next round.'
            });
        }
    });

    socket.on('roll_dice', async (data) => {
        const { roomCode } = data;
        const game = activeGames.get(roomCode);

        if (game) {
            const { diceResults, roundResults } = await game.rollDiceAndCalculate();

            io.to(roomCode).emit('dice_rolled', {
                diceResults,
                roundResults,
                players: game.players,
                gameState: 'rolling'
            });

            setTimeout(() => {
                game.gameState = 'finished';
                io.to(roomCode).emit('game_updated', {
                    players: game.players,
                    dealer: game.dealer,
                    gameState: 'finished'
                });
            }, 4000);
        }
    });

    socket.on('refresh_balance', async (data) => {
        const { userId } = data;
        try {
            const connection = await mysql.createConnection(dbConfig);
            const [user] = await connection.execute(
                'SELECT balance FROM users WHERE id = ?',
                [userId]
            );

            if (user.length > 0) {
                socket.emit('balance_updated', {
                    balance: parseFloat(user[0].balance)
                });
            }

            await connection.end();
        } catch (error) {
            console.error('Error refreshing balance:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Remove from playerSockets mapping
        for (const [playerId, socketId] of playerSockets.entries()) {
            if (socketId === socket.id) {
                playerSockets.delete(playerId);
                break;
            }
        }
    });
});

// SPA Fallback - This MUST be the last route
// Handle React Router routes - serve index.html for all non-API routes
if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
        // Don't serve index.html for API routes, socket.io, or static assets
        if (req.path.startsWith('/api/') ||
            req.path.startsWith('/socket.io/') ||
            req.path.includes('.')) {
            return res.status(404).json({ error: 'Not found' });
        }

        console.log(`SPA Fallback: Serving index.html for ${req.path}`);
        res.sendFile(path.join(__dirname, '../public', 'index.html'));
    });
}

// Initialize database and start server
if (process.env.NODE_ENV !== 'production') {
    initDatabase();
}

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`Built at: 2025-06-14 22:33:12 UTC`);
    if (process.env.NODE_ENV === 'production') {
        console.log(`Serving static files from: ${path.join(__dirname, '../public')}`);
        console.log(`SPA fallback enabled for client-side routing`);
    }
});

// Export for Vercel
module.exports = app;