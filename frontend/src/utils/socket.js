import { io } from "socket.io-client";
import { SOCKET_URL as url } from "../config/apiConfig";

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
