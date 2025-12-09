import { io } from "socket.io-client";
import { API_BASE as SOCKET_URL } from "../utils/api";

// If VITE_API_URL is relative (/ or empty), use undefined so Socket.IO auto-detects
const envURL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL);
// If the URL is relative ("/" or "/api"), let Socket.IO auto-detect same-origin
const url = (envURL && !envURL.startsWith('/')) ? envURL : undefined;

const socket = io(url, {
  transports: ["websocket", "polling"],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  timeout: 10000,
});

let warned = false;
socket.on("connect_error", (error) => {
  if (!warned) {
    console.warn("Socket connect error. Will retry...", error.message);
    warned = true;
  }
});
socket.on("connect", () => {
  console.log("✅ Socket.IO connected successfully:", socket.id);
  warned = false;
});
socket.on("disconnect", (reason) => {
  console.log("❌ Socket.IO disconnected:", reason);
});

export default socket;
