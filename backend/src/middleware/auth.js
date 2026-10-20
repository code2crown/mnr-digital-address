const jwt = require("jsonwebtoken");

module.exports = function auth(req, res, next) {
  const header = req.headers["authorization"];
  if (!header) return res.status(401).json({ message: "No token provided" });

  const token = header.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Malformed token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = decoded; // { id, role, clientId }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};