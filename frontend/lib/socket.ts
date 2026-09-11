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

  // If already created with same token, reuse existing socket instance
  // without dropping existing listeners during transient disconnects
  if (socket && currentToken === token) {
    if (!socket.connected && !socket.active) {
      socket.connect();
    }
    return socket;
  }

  // Token changed: disconnect old socket and instantiate new one
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
