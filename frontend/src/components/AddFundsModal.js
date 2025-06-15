import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const CheckoutForm = ({ amount, onSuccess, onError, onCancel, loading, setLoading, userId }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [clientSecret, setClientSecret] = useState('');
    const [paymentError, setPaymentError] = useState('');

    const createPaymentIntent = React.useCallback(async () => {
        try {
            console.log(`Creating payment intent for user ${userId}, amount: $${amount}`);

            const response = await fetch(`/api/create-payment-intent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: amount,
                    userId: userId
                }),
            });

            const data = await response.json();
            console.log('Payment intent response:', data);

            if (data.success) {
                setClientSecret(data.clientSecret);
                setPaymentError('');
            } else {
                setPaymentError(data.message);
            }
        } catch (error) {
            console.error('Error creating payment intent:', error);
            setPaymentError('Failed to initialize payment');
        }
    }, [amount, userId]);

    useEffect(() => {
        if (amount > 0 && userId) {
            createPaymentIntent();
        }
    }, [amount, createPaymentIntent, userId]);

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!stripe || !elements || !clientSecret) {
            console.log('Stripe not ready or no client secret');
            return;
        }

        setLoading(true);
        setPaymentError('');

        console.log('Processing payment...');

        const card = elements.getElement(CardElement);

        const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
                card: card,
            }
        });

        if (error) {
            console.error('Payment error:', error);
            setPaymentError(error.message);
            setLoading(false);
        } else if (paymentIntent.status === 'succeeded') {
            console.log('Payment succeeded:', paymentIntent.id);

            // Confirm payment on the backend
            try {
                const response = await fetch(`/api/confirm-payment`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        paymentIntentId: paymentIntent.id,
                        userId: userId
                    }),
                });

                const data = await response.json();
                console.log('Payment confirmation response:', data);

                if (data.success) {
                    console.log(`Payment confirmed! Amount added: $${data.amount}, New balance: $${data.newBalance}`);
                    // Pass the data exactly as received from server
                    onSuccess({
                        addedAmount: data.amount,
                        newBalance: data.newBalance,
                        paymentIntentId: paymentIntent.id
                    });
                } else {
                    console.error('Payment confirmation failed:', data.message);
                    onError(data.message);
                }
            } catch (error) {
                console.error('Payment confirmation error:', error);
                onError('Payment confirmation failed');
            } finally {
                setLoading(false);
            }
        }
    };

    const cardElementOptions = {
        style: {
            base: {
                fontSize: '16px',
                color: '#ffffff',
                backgroundColor: 'transparent',
                fontFamily: 'system-ui, sans-serif',
                '::placeholder': {
                    color: '#94a3b8',
                },
            },
            invalid: {
                color: '#ef4444',
            },
        },
        hidePostalCode: true,
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="block text-white font-medium mb-3">
                    💳 Payment Information
                </label>
                <div className="bg-white/10 border border-white/30 rounded-lg p-4">
                    <CardElement options={cardElementOptions} />
                </div>
                <p className="text-white/60 text-xs mt-2">
                    Test card: 4242 4242 4242 4242 | Any future date | Any CVC
                </p>
            </div>

            {paymentError && (
                <div className="bg-red-500/20 border border-red-400/30 text-red-200 px-4 py-3 rounded-lg">
                    {paymentError}
                </div>
            )}

            <div className="flex space-x-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200"
                    disabled={loading}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={!stripe || loading || !clientSecret}
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <div className="flex items-center justify-center space-x-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                            <span>Processing...</span>
                        </div>
                    ) : (
                        `Pay $${amount}`
                    )}
                </button>
            </div>
        </form>
    );
};

const AddFundsModal = ({ onClose, onAddFunds, currentBalance, user }) => {
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [stripePromise, setStripePromise] = useState(null);
    const [showPayment, setShowPayment] = useState(false);
    const [processingComplete, setProcessingComplete] = useState(false);
    const [successData, setSuccessData] = useState(null);

    useEffect(() => {
        // Get Stripe publishable key from backend
        fetch(`/api/stripe-config`)
            .then(response => response.json())
            .then(data => {
                console.log('Stripe config loaded');
                setStripePromise(loadStripe(data.publishableKey));
            })
            .catch(error => {
                console.error('Error loading Stripe:', error);
            });
    }, []);

    const quickAmounts = [10, 25, 50, 100, 250, 500];

    const handleAmountSelect = (selectedAmount) => {
        setAmount(selectedAmount.toString());
        setShowPayment(true);
    };

    const handleCustomAmount = () => {
        const customAmount = parseFloat(amount);
        if (customAmount > 0 && customAmount <= 10000) {
            setShowPayment(true);
        }
    };

    const handlePaymentSuccess = async (paymentData) => {
        console.log('Payment success data received:', paymentData);

        setSuccessData(paymentData);
        setProcessingComplete(true);

        // Wait a moment to show success state, then proceed
        setTimeout(() => {
            console.log('Calling onAddFunds with:', paymentData);
            onAddFunds(paymentData);
        }, 2000);
    };

    const handlePaymentError = (error) => {
        console.error('Payment error:', error);
        setShowPayment(false);
        setLoading(false);
        alert(`Payment failed: ${error}`);
    };

    const handleBack = () => {
        setShowPayment(false);
        setAmount('');
    };

    if (!stripePromise) {
        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md border border-white/20 shadow-2xl text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-2 border-white border-t-transparent mx-auto mb-4"></div>
                    <p className="text-white">Loading payment system...</p>
                </div>
            </div>
        );
    }

    if (processingComplete) {
        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md border border-white/20 shadow-2xl text-center">
                    <div className="text-6xl mb-4 animate-bounce">✅</div>
                    <h2 className="text-2xl font-bold text-white mb-2">Payment Successful!</h2>
                    <p className="text-green-300 text-lg mb-2">
                        ${successData?.addedAmount} has been added to your account
                    </p>
                    <p className="text-white/80">
                        New Balance: ${successData?.newBalance}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md border border-white/20 shadow-2xl">
                <div className="text-center mb-6">
                    <h2 className="text-3xl font-bold text-white mb-2">💰 Add Funds</h2>
                    <p className="text-white/80">Current Balance: ${currentBalance}</p>
                    <p className="text-white/60 text-sm">User: {user.username}</p>
                </div>

                {!showPayment ? (
                    <div className="space-y-6">
                        {/* Quick Amount Buttons */}
                        <div>
                            <label className="block text-white font-medium mb-3">Quick Add:</label>
                            <div className="grid grid-cols-3 gap-3">
                                {quickAmounts.map((quickAmount) => (
                                    <button
                                        key={quickAmount}
                                        type="button"
                                        onClick={() => handleAmountSelect(quickAmount)}
                                        className="py-2 px-3 rounded-lg font-bold transition-all duration-200 transform hover:scale-105 bg-white/20 text-white hover:bg-white/30"
                                    >
                                        ${quickAmount}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom Amount Input */}
                        <div>
                            <label className="block text-white font-medium mb-3">Custom Amount:</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white font-bold">$</span>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full pl-8 pr-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-center text-xl font-bold"
                                    placeholder="Enter amount"
                                    min="1"
                                    max="10000"
                                    step="0.01"
                                />
                            </div>
                            <p className="text-white/60 text-xs mt-2">Minimum: $1, Maximum: $10,000</p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex space-x-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleCustomAmount}
                                disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > 10000}
                                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                ) : (
                    <Elements stripe={stripePromise}>
                        <div className="space-y-4">
                            <div className="bg-blue-500/20 rounded-lg p-4 border border-blue-400/30">
                                <p className="text-blue-200 text-center">
                                    Adding <span className="font-bold text-white">${amount}</span> to your account
                                </p>
                            </div>

                            <CheckoutForm
                                amount={parseFloat(amount)}
                                userId={user.id}
                                onSuccess={handlePaymentSuccess}
                                onError={handlePaymentError}
                                onCancel={handleBack}
                                loading={loading}
                                setLoading={setLoading}
                            />
                        </div>
                    </Elements>
                )}

                {/* Security Note */}
                <div className="mt-6 bg-green-500/20 rounded-lg p-3 border border-green-400/30">
                    <p className="text-green-200 text-xs text-center">
                        🔒 Secure payment powered by Stripe. Your card details are never stored.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AddFundsModal;