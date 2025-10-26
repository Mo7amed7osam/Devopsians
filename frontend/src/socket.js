// // src/socket.js
// import { io } from 'socket.io-client';

// // The URL for your Node.js/Express backend server
// const BACKEND_URL = 'http://localhost:3000'; 

// // Create the socket instance. We set autoConnect to false and manage it in App.jsx 
// // to ensure we only connect when necessary (e.g., when viewing the map).
// const socket = io(BACKEND_URL, {
//     autoConnect: false,
//     // Add token authorization here if your backend socket requires it
//     // auth: { token: localStorage.getItem('auth_token') } 
// });

// // Optional: Basic logging for connection lifecycle
// socket.on('connect', () => {
//     console.log('Socket: Successfully connected to server.', socket.id);
// });

// socket.on('disconnect', (reason) => {
//     console.log('Socket: Disconnected. Reason:', reason);
//     if (reason === 'io server disconnect') {
//       // The disconnection was initiated by the server, reconnect after a brief delay
//       socket.connect();
//     }
//     // else the client will try to automatically reconnect
// });

// socket.on('connect_error', (err) => {
//     console.error('Socket: Connection Error:', err.message);
// });

// export default socket;

// src/socket.js
// Temporary mock when backend isn't running

export const socket = {
  on: () => {},
  emit: () => {},
  connect: () => {},
  disconnect: () => {},
};

export default socket;
