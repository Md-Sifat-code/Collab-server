const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const router = express.Router();

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user._id, email: req.user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Send token to frontend (via cookie or JSON)
    res
      .cookie("token", token, { httpOnly: true })
      .redirect("http://localhost:3000/dashboard");
  }
);

// Example protected route
router.get("/protected", (req, res) => {
  const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ message: "Protected data", user: decoded });
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
});

module.exports = router;
