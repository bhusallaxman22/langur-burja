# 🎲 Langur Burja - Traditional Dice Game

A modern web implementation of the traditional Langur Burja dice game with real-time multiplayer functionality and Stripe payment integration.

## 🚀 Features

- **Real-time Multiplayer**: Play with up to 6 players in real-time
- **Beautiful UI**: Modern, animated interface with 3D dice effects
- **Secure Payments**: Stripe integration for adding funds
- **Responsive Design**: Works on desktop and mobile devices
- **Live Game States**: Real-time updates for all game actions

## 🛠️ Tech Stack

### Frontend
- React 18
- React Router DOM
- Socket.IO Client
- Stripe React Components
- Tailwind CSS
- Modern CSS animations

### Backend
- Node.js & Express
- Socket.IO for real-time communication
- MySQL database
- Stripe for payments
- JWT authentication
- bcrypt for password hashing

## 📦 Deployment

### Backend (Vercel)
1. Push your backend code to GitHub
2. Connect to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically

### Frontend (Vercel)
1. Push your frontend code to GitHub
2. Connect to Vercel
3. Set build command: `npm run build`
4. Set output directory: `build`
5. Deploy automatically

## 🔧 Environment Variables

### Backend (.env)
```env
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
DB_HOST=your-db-host
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=langur_burja
JWT_SECRET=your-jwt-secret
NODE_ENV=production