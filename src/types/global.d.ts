import { Server as SocketIOServer } from "socket.io";

declare global {
  var _io: SocketIOServer | undefined;
}

export {};