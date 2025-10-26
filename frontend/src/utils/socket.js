import { io } from "socket.io-client";
import { API_BASE as SOCKET_URL } from "../utils/api";

const socket = io(SOCKET_URL, {
  transports: ["websocket"], // Explicitly use WebSocket transport
  autoConnect: true, // Automatically connect on load
});

export default socket;
