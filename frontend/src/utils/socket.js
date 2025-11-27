import { io } from "socket.io-client";
import { API_BASE as SOCKET_URL } from "../utils/api";

// If VITE_API_URL is relative (/ or empty), use undefined so Socket.IO auto-detects
const envURL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL);
const url = (envURL && envURL !== '/' && envURL !== '') ? envURL : undefined;

const socket = io(url, {
  transports: ["websocket", "polling"],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  timeout: 10000,
});

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
