import { io } from "socket.io-client";
import { API_BASE as SOCKET_URL } from "../utils/api";

// Prefer env override, fallback to API base
const url = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE) || SOCKET_URL;

const socket = io(url, {
  // Allow polling fallback if pure websockets fail
  transports: ["websocket", "polling"],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  timeout: 10000,
});

// Reduce console spam on connection errors during backend restarts
let warned = false;
socket.on("connect_error", () => {
  if (!warned) {
    console.warn("Socket connect error. Will retry...");
    warned = true;
  }
});
socket.on("connect", () => {
  warned = false;
});

export default socket;
