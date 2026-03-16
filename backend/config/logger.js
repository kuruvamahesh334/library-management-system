const winston = require("winston");
const path    = require("path");
const fs      = require("fs");

const logDir = process.env.LOG_DIR || "logs";
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) =>
    stack ? `[${timestamp}] ${level.toUpperCase()}: ${message}\n${stack}`
           : `[${timestamp}] ${level.toUpperCase()}: ${message}`)
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: logFormat,
  transports: [
    new winston.transports.File({ filename: path.join(logDir, "combined.log"), maxsize: 10485760, maxFiles: 5 }),
    new winston.transports.File({ filename: path.join(logDir, "error.log"), level: "error", maxsize: 10485760, maxFiles: 5 }),
    ...(process.env.NODE_ENV !== "production"
      ? [new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.timestamp({ format: "HH:mm:ss" }), winston.format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level}: ${message}`)) })]
      : [])
  ],
});

module.exports = logger;
