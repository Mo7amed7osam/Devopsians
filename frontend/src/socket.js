import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:3030"; // Ensure this matches your backend's port and URL

const socket = io(SOCKET_URL, {
  transports: ["websocket"], // Explicitly use WebSocket transport
  autoConnect: true, // Automatically connect on load
});

export default socket;
