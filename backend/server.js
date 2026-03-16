require("dotenv").config({ path: `.env.${process.env.NODE_ENV || "development"}` });

const express       = require("express");
const cors          = require("cors");
const helmet        = require("helmet");
const compression   = require("compression");
const morgan        = require("morgan");
const mongoSanitize = require("express-mongo-sanitize");
const path          = require("path");
const swaggerUi     = require("swagger-ui-express");

const { connectDB }                             = require("./config/database");
const logger                                    = require("./config/logger");
const { errorHandler, notFound, globalLimiter } = require("./middleware");
const routes                                    = require("./routes");
const { startEmailScheduler }                   = require("./email/scheduler");

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// ✅ FIXED CORS
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:5173"
  ],
  methods: ["GET","POST","PUT","PATCH","DELETE"],
  allowedHeaders: ["Content-Type","Authorization"],
  credentials: true
}));

app.use("/api", globalLimiter);
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(mongoSanitize());
app.use(compression());

app.use(
  morgan(
    process.env.NODE_ENV === "production" ? "combined" : "dev",
    { stream: { write: m => logger.http(m.trim()) } }
  )
);

// Serve uploaded photos
app.use("/uploads", express.static(path.join(__dirname, process.env.UPLOAD_DIR || "uploads")));

// Swagger
const swaggerSpec = require("./docs/swagger");
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: "LibraryOS v4 API Docs",
    customCss: ".swagger-ui .topbar { background: #1a3a6b; }",
  })
);

app.use("/api", routes);

app.get("/health", (req, res) =>
  res.json({
    success: true,
    status: "healthy",
    uptime: `${Math.floor(process.uptime())}s`,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  })
);

app.get("/", (req, res) =>
  res.json({
    success: true,
    message: "📚 LibraryOS v4 — ACET Library Management System",
    docs: `http://localhost:${process.env.PORT || 5000}/api-docs`,
  })
);

app.use(notFound);
app.use(errorHandler);

process.on("SIGTERM", () => {
  logger.info("SIGTERM received. Shutting down...");
  process.exit(0);
});

const startServer = async () => {
  await connectDB();

  if (process.env.NODE_ENV !== "test") startEmailScheduler();

  const PORT = process.env.PORT || 5000;

  const server = app.listen(PORT, () => {
    logger.info(`🚀 Server → http://localhost:${PORT}`);
    logger.info(`📖 API Docs → http://localhost:${PORT}/api-docs`);
    logger.info(`🏫 College: ${process.env.COLLEGE_NAME}`);
    logger.info(`📧 Email: ${process.env.SMTP_USER}`);
  });

  return server;
};

if (process.env.NODE_ENV !== "test") startServer();

module.exports = app;