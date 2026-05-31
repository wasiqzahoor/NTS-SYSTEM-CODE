const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

// Track online users: userId -> { socketId, name, role, managerRole, managerId }
const onlineUsers = new Map();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    path: "/api/socket",
    cors: {
      // FIX: Restrict CORS to app origin only (not wildcard)
      origin: process.env.NEXTAUTH_URL || process.env.APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Expose onlineUsers to the rest of the app
  global._onlineUsers = onlineUsers;
  global._io = io;

  function broadcastOnlineUsers() {
    const list = Array.from(onlineUsers.entries()).map(([userId, info]) => ({
      userId,
      ...info,
    }));
    io.emit("online-users-updated", list);
  }

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("join-room", (data) => {
      // data can be userId (string) or { userId, name, role, managerRole, managerId }
      let userId, name, role, managerRole, managerId;
      if (typeof data === "object") {
        userId = data.userId;
        name = data.name;
        role = data.role;
        managerRole = data.managerRole;
        managerId = data.managerId;
      } else {
        userId = data;
      }

      socket.join(`user_${userId}`);
      socket.userId = userId;

      onlineUsers.set(userId, {
        socketId: socket.id,
        name: name || userId,
        role: role || "staff",
        managerRole: managerRole || "",
        managerId: managerId || null,
        joinedAt: new Date().toISOString(),
      });

      broadcastOnlineUsers();
      console.log(`User ${userId} joined room`);
    });

    socket.on("leave-room", (userId) => {
      socket.leave(`user_${userId}`);
      onlineUsers.delete(userId);
      broadcastOnlineUsers();
      console.log(`User ${userId} left room`);
    });

    socket.on("task-update", (data) => {
      socket.to(`user_${data.userId}`).emit("task-updated", data);
    });

    socket.on("chat-message", (data) => {
      socket.to(`user_${data.userId}`).emit("new-message", data);
    });

    socket.on("disconnect", () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        broadcastOnlineUsers();
      }
      console.log("Client disconnected:", socket.id);
    });
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
