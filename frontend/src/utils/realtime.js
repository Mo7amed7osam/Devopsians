// src/utils/realtime.js
import socket from '../socket';

// Custom hook to subscribe to a real-time event
export const useSocketEvent = (eventName, callback) => {
    React.useEffect(() => {
        if (!socket.connected) {
            socket.connect();
        }
        
        // Listen for the specific event
        socket.on(eventName, callback);

        // Cleanup function
        return () => {
            socket.off(eventName, callback);
            // Optionally disconnect here if the component is the only one using the socket
            // socket.disconnect(); 
        };
    }, [eventName, callback]);
};

// Function to send a message to the server (e.g., join a room, request data)
export const sendSocketMessage = (eventName, data) => {
    if (socket.connected) {
        socket.emit(eventName, data);
    } else {
        console.warn(`Socket not connected. Cannot emit event: ${eventName}`);
    }
};

// Export the raw socket instance for connection management in App.jsx/main.jsx
export default socket;