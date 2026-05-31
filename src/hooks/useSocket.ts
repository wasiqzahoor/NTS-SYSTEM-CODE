"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // FIX BUG #11: Add reconnection options for reliability
    const socketInstance = io(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000", {
      path: "/api/socket",
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socketInstance.on("connect", () => {
      setIsConnected(true);
      console.log("Socket connected");
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
      console.log("Socket disconnected");
    });

    socketInstance.on("connect_error", (err) => {
      console.warn("Socket connection error:", err.message);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return { socket, isConnected };
}

export interface OnlineUser {
  userId: string;
  name: string;
  role: string;
  managerRole?: string;
  managerId?: string | null;
  joinedAt: string;
}

export function useOnlineUsers() {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on("online-users-updated", (users: OnlineUser[]) => {
      setOnlineUsers(users);
    });

    return () => {
      socket.off("online-users-updated");
    };
  }, [socket]);

  return onlineUsers;
}
