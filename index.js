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
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());
//socket io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true, // your frontend origin
    credentials: true,
  },
});
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

// Real-time socket logic
const documentContents = {}; // Temporary in-memory store

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join", (docId) => {
    socket.join(docId);
    console.log(`User joined doc: ${docId}`);

    // Optional: send current content to newly joined user
    if (documentContents[docId]) {
      socket.emit("load-document", documentContents[docId]);
    }
  });

  socket.on("send-changes", ({ docId, content }) => {
    documentContents[docId] = content;
    socket.to(docId).emit("receive-changes", content);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
