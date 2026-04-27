const { Server } = require("socket.io");

let io = null;

const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PATCH"],
    },
  });

  io.on("connection", (socket) => {
    socket.on("register-user", (userId) => {
      if (!userId) return;
      socket.join(`user:${userId}`);
    });

    socket.on("join-conversation", (conversationKey) => {
      if (!conversationKey) return;
      socket.join(`conversation:${conversationKey}`);
    });

    socket.on("leave-conversation", (conversationKey) => {
      if (!conversationKey) return;
      socket.leave(`conversation:${conversationKey}`);
    });

    socket.on("disconnect", () => {
      // nothing required for this simple version
    });
  });

  return io;
};

const getIo = () => {
  if (!io) {
    throw new Error("Socket.io is not initialized");
  }
  return io;
};

const emitToUser = (userId, eventName, payload) => {
  if (!io || !userId) return;
  io.to(`user:${userId}`).emit(eventName, payload);
};

module.exports = {
  initializeSocket,
  getIo,
  emitToUser,
};