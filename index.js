const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const passport = require("passport");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/auth");

dotenv.config();
require("./config/passport");

const app = express();
app.use(cookieParser());
app.use(passport.initialize());

// MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

// Routes
app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Backend is running!");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
