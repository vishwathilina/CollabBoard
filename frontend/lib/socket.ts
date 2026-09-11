import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let currentToken: string | null = null;

export function getSocket(token?: string | null): Socket | null {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  if (!token) {
    if (socket) {
      socket.disconnect();
      socket = null;
      currentToken = null;
    }
    return null;
  }

  // If already connected with same token, reuse existing socket
  if (socket && currentToken === token && socket.connected) {
    return socket;
  }

  // If token changed or socket disconnected, recreate
  if (socket) {
    socket.disconnect();
  }

  currentToken = token;
  socket = io(apiUrl, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentToken = null;
  }
}
