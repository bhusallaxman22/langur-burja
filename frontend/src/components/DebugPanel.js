import React, { useState, useEffect } from 'react';

const DebugPanel = ({ user }) => {
    const [localStorageUser, setLocalStorageUser] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        const updateLocalStorageUser = () => {
            const storedUser = localStorage.getItem('user');
            setLocalStorageUser(storedUser ? JSON.parse(storedUser) : null);
        };

        updateLocalStorageUser();

        // Set up interval to check localStorage every second
        const interval = setInterval(updateLocalStorageUser, 1000);

        return () => clearInterval(interval);
    }, [refreshTrigger]);

    const refreshData = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    const clearLocalStorage = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        refreshData();
    };

    return (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs max-w-xs">
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold">Debug Panel</h3>
                <button
                    onClick={refreshData}
                    className="bg-blue-500 px-2 py-1 rounded text-xs"
                >
                    Refresh
                </button>
            </div>

            <div className="space-y-2">
                <div>
                    <strong>User State Balance:</strong> ${user?.balance || 'N/A'}
                </div>
                <div>
                    <strong>LocalStorage Balance:</strong> ${localStorageUser?.balance || 'N/A'}
                </div>
                <div>
                    <strong>Match:</strong> {user?.balance === localStorageUser?.balance ? '✅' : '❌'}
                </div>

                <button
                    onClick={clearLocalStorage}
                    className="bg-red-500 px-2 py-1 rounded text-xs w-full mt-2"
                >
                    Clear LocalStorage
                </button>
            </div>
        </div>
    );
};

export default DebugPanel;