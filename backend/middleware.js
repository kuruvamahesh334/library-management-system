const jwt      = require("jsonwebtoken");
const rateLimit= require("express-rate-limit");
const multer   = require("multer");
const path     = require("path");
const fs       = require("fs");
const { Admin }= require("./models");
const logger   = require("./config/logger");

// ── Rate limiters ─────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 200,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: "Too many requests. Try again after 15 minutes." },
  handler: (req, res, _, opts) => { logger.warn(`Rate limit: ${req.ip}`); res.status(429).json(opts.message); },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { success: false, message: "Too many login attempts. Try again after 15 minutes." },
});

// ── JWT Protect ───────────────────────────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith("Bearer "))
      token = req.headers.authorization.split(" ")[1];
    if (!token) return res.status(401).json({ success: false, message: "Access denied. No token." });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = await Admin.findById(decoded.id);
    if (!req.admin) return res.status(401).json({ success: false, message: "Admin not found." });
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") return res.status(401).json({ success: false, message: "Session expired. Please login again." });
    return res.status(401).json({ success: false, message: "Invalid token." });
  }
};

// ── Multer — photo upload ─────────────────────────────────────────────────────
const uploadDir = process.env.UPLOAD_DIR || "uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg","image/jpg","image/png","image/webp"];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only JPEG/PNG images are allowed."), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880 },
});

// ── Error Handler ─────────────────────────────────────────────────────────────
const errorHandler = (err, req, res, next) => {
  logger.error(`${req.method} ${req.originalUrl} — ${err.message}`, { stack: err.stack });
  let status  = err.statusCode || 500;
  let message = err.message    || "Internal server error";
  if (err.code === 11000) { const f = Object.keys(err.keyValue)[0]; message = `${f} already exists.`; status = 409; }
  if (err.name === "ValidationError") { message = Object.values(err.errors).map(e => e.message).join(", "); status = 400; }
  if (err.name === "CastError")       { message = `Invalid ID: ${err.value}`; status = 400; }
  if (err.name === "JsonWebTokenError") { message = "Invalid token"; status = 401; }
  if (err.name === "TokenExpiredError") { message = "Token expired"; status = 401; }
  if (err instanceof multer.MulterError) { message = err.message; status = 400; }
  const resp = { success: false, message };
  if (process.env.NODE_ENV === "development") resp.stack = err.stack;
  res.status(status).json(resp);
};

const notFound = (req, res) => {
  logger.warn(`404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
};

module.exports = { protect, errorHandler, notFound, globalLimiter, authLimiter, upload };
