const http = require("http");
const { Server } = require("socket.io");
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const passport = require("passport");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const docRoutes = require("./routes/documents");
dotenv.config();
require("./config/passport");

const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

// Routes
app.use("/auth", authRoutes);
app.use("/documents", docRoutes);
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// Create server and Socket.IO instance
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
  },
});

// In-memory document content and user tracking
const documentContents = {};
const userSockets = new Map(); // socket.id => user

// Helper: Get all users in a room
function getUsersInRoom(docId) {
  const room = io.sockets.adapter.rooms.get(docId);
  const userList = [];
  if (room) {
    for (const socketId of room) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket?.user) {
        userList.push(socket.user);
      }
    }
  }
  return userList;
}

// Socket.IO connection logic
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join", (payload) => {
    let docId, user;
    if (typeof payload === "string") {
      // Defensive fallback if payload is string (old usage)
      docId = payload;
      user = null;
    } else if (payload && typeof payload === "object") {
      docId = payload.docId;
      user = payload.user;
    } else {
      console.log("Invalid join payload", payload);
      return;
    }

    socket.join(docId);
    socket.user = user;
    userSockets.set(socket.id, user);

    if (user && user.fullName) {
      console.log(`User ${user.fullName} joined doc ${docId}`);
      socket.to(docId).emit("user-joined", user);
    } else {
      console.log(`An unidentified user joined doc ${docId}`);
    }

    io.to(docId).emit("users-in-room", getUsersInRoom(docId));

    if (documentContents[docId]) {
      socket.emit("load-document", documentContents[docId]);
    }
  });

  socket.on("send-changes", ({ docId, content }) => {
    documentContents[docId] = content;
    socket.to(docId).emit("receive-changes", content);
  });

  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms].filter((r) => r !== socket.id);
    for (const docId of rooms) {
      socket.to(docId).emit("user-left", socket.user);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    userSockets.delete(socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
