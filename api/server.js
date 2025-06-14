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

// Don't create HTTP server in Vercel - let Vercel handle it
let server;
let io;

if (process.env.VERCEL) {
    // In Vercel, we don't need to create a server
    console.log('Running in Vercel environment');
} else {
    // Local development
    server = http.createServer(app);
    io = socketIo(server, {
        cors: {
            origin: "http://localhost:3000",
            methods: ["GET", "POST"],
            credentials: true
        }
    });
}

// Configure CORS for production
const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? [
            'https://langur-burja.vercel.app',
            'https://langur-burja-git-main-bhusallaxman22.vercel.app',
            'https://langur-burja-bhusallaxman22.vercel.app',
        ]
        : "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Middleware to log all requests in production
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
        next();
    });
}

// Serve static files from public directory
if (process.env.NODE_ENV === 'production') {
    // Serve static files with proper cache headers
    app.use(express.static(path.join(__dirname, 'public'), {
        maxAge: '1y',
        etag: false
    }));
    console.log('Production mode: Serving static files from public directory');
}

// Health check endpoint - MUST be first API route
app.get('/api/health', (req, res) => {
    console.log('Health check endpoint hit');
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV,
        build_time: '2025-06-14 23:25:36 UTC',
        vercel: !!process.env.VERCEL,
        path: req.path,
        method: req.method
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
    connectTimeout: 60000,
    acquireTimeout: 60000,
    timeout: 60000
};

// Game symbols
const SYMBOLS = ['DIAMONDS', 'CLUBS', 'HEARTS', 'SPADES', 'CROWN', 'FLAG'];

// Active games storage (Note: This won't work well in serverless - consider using Redis)
const activeGames = new Map();
const playerSockets = new Map();

// Update user balance in database
async function updateUserBalance(userId, newBalance, transactionType, amount, description = '', stripePaymentIntentId = null) {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        await connection.beginTransaction();

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

        // Update user balance
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

// Database initialization
async function initDatabase() {
    try {
        const connection = await mysql.createConnection(dbConfig);

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

// API Routes
app.post('/api/register', async (req, res) => {
    console.log('Register endpoint hit');
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        const connection = await mysql.createConnection(dbConfig);
        const hashedPassword = await bcrypt.hash(password, 10);

        await connection.execute(
            'INSERT INTO users (username, password) VALUES (?, ?)',
            [username, hashedPassword]
        );

        await connection.end();
        res.json({ success: true, message: 'User registered successfully' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
});

app.post('/api/login', async (req, res) => {
    console.log('Login endpoint hit');
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

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

        const token = jwt.sign(
            { userId: user.id, username: user.username },
            process.env.JWT_SECRET || 'your_jwt_secret'
        );

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
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get Stripe publishable key
app.get('/api/stripe-config', (req, res) => {
    console.log('Stripe config endpoint hit');
    res.json({
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    });
});

// Create Stripe Payment Intent
app.post('/api/create-payment-intent', async (req, res) => {
    console.log('Create payment intent endpoint hit');
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
    console.log('Confirm payment endpoint hit');
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

        // Update user balance
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

        // Record transaction
        await connection.execute(
            'INSERT INTO balance_transactions (user_id, transaction_type, amount, balance_before, balance_after, description, stripe_payment_intent_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, 'deposit', amount, currentBalance, newBalance, `Stripe payment deposit - $${amount}`, paymentIntentId]
        );

        // Commit transaction
        await connection.commit();
        await connection.end();

        console.log(`Payment confirmed successfully for user ${userId}: +$${amount}, new balance: $${newBalance}`);

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

// Get user balance route
app.get('/api/balance/:userId', async (req, res) => {
    console.log('Get balance endpoint hit');
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
        console.error('Get balance error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Debug route to check transactions
app.get('/api/debug/transactions/:userId', async (req, res) => {
    console.log('Debug transactions endpoint hit');
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
        console.error('Debug transactions error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Catch-all route for React SPA (MUST be last)
if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
        // Don't serve index.html for API routes or static assets
        if (req.path.startsWith('/api/') || req.path.includes('.')) {
            console.log(`404 for: ${req.path}`);
            return res.status(404).json({ error: 'Not found' });
        }

        console.log(`SPA Fallback: Serving index.html for ${req.path}`);
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
}

// Only start server in local development
if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') {
    initDatabase();
    const PORT = process.env.PORT || 8080;
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV}`);
    });
}

// Export for Vercel
module.exports = app;