import { Server as NetServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { NextApiResponse } from "next";

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io: SocketIOServer;
    };
  };
};

let io: SocketIOServer | null = null;

export function getIO(): SocketIOServer | null {
  return io;
}

export function setIO(socketIO: SocketIOServer) {
  io = socketIO;
}

export function emitToUser(userId: string, event: string, data: any) {
  if (io) {
    io.to(`user_${userId}`).emit(event, data);
  }
}

export function emitToRoom(roomId: string, event: string, data: any) {
  if (io) {
    io.to(roomId).emit(event, data);
  }
}

export function broadcast(event: string, data: any) {
  if (io) {
    io.emit(event, data);
  }
}
