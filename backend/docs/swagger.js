const swaggerJsdoc = require("swagger-jsdoc");
module.exports = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: { title: "LibraryOS v4 — ACET API", version: "4.0.0", description: "Akshaya College of Engineering and Technology — Central Library Management System" },
    servers: [{ url: "http://localhost:5000", description: "Dev" }],
    components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } } },
  },
  apis: ["./routes.js"],
});
