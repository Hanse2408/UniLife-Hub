import { io } from "socket.io-client";

let socketInstance = null;

export function getSocket() {
  if (!socketInstance) {
    socketInstance = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:8070", {
      transports: ["websocket"],
    });
  }
  return socketInstance;
}