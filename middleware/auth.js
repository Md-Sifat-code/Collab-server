const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  // Make sure to parse cookies before this middleware (e.g. with cookie-parser)
  const token = req.cookies?.token;

  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

module.exports = authMiddleware;
