// ─────────────────────────────────────────────────────────────────────────────
// STEP 11b: AUTH TESTS
// Industry use: Every API endpoint is tested automatically.
// Run with: npm test
// ─────────────────────────────────────────────────────────────────────────────
require("dotenv").config({ path: ".env.development" });
require("./setup");

const request = require("supertest");
const app     = require("../server");

describe("🔐 AUTH API", () => {

  // ── Register ──────────────────────────────────────────────────────────────
  describe("POST /api/auth/register", () => {

    it("should register a new admin successfully", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ username: "TestAdmin", email: "test@library.edu", password: "password123" });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.admin.email).toBe("test@library.edu");
      expect(res.body.admin.passwordHash).toBeUndefined(); // Password must NOT be returned
    });

    it("should reject registration with missing fields", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "test@library.edu" }); // Missing username and password

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject registration with invalid email", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ username: "Admin", email: "not-an-email", password: "password123" });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject duplicate email registration", async () => {
      await request(app).post("/api/auth/register")
        .send({ username: "Admin1", email: "dup@library.edu", password: "password123" });

      const res = await request(app).post("/api/auth/register")
        .send({ username: "Admin2", email: "dup@library.edu", password: "password456" });

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it("should reject password shorter than 6 characters", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ username: "Admin", email: "admin@test.com", password: "123" });

      expect(res.statusCode).toBe(400);
    });
  });

  // ── Login ─────────────────────────────────────────────────────────────────
  describe("POST /api/auth/login", () => {

    beforeEach(async () => {
      await request(app).post("/api/auth/register")
        .send({ username: "Admin", email: "admin@library.edu", password: "admin123" });
    });

    it("should login successfully with correct credentials", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "admin@library.edu", password: "admin123" });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });

    it("should reject login with wrong password", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "admin@library.edu", password: "wrongpassword" });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should reject login with unregistered email", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "nobody@library.edu", password: "password123" });

      expect(res.statusCode).toBe(401);
    });
  });

  // ── Protected route ───────────────────────────────────────────────────────
  describe("GET /api/auth/me", () => {

    it("should return admin info with valid token", async () => {
      const reg = await request(app).post("/api/auth/register")
        .send({ username: "Admin", email: "me@library.edu", password: "admin123" });
      const token = reg.body.token;

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.admin.email).toBe("me@library.edu");
    });

    it("should reject access without token", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.statusCode).toBe(401);
    });

    it("should reject access with invalid token", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalid.token.here");
      expect(res.statusCode).toBe(401);
    });
  });
});
