// ─────────────────────────────────────────────────────────────────────────────
// STEP 11c: BOOKS & MEMBERS TESTS
// ─────────────────────────────────────────────────────────────────────────────
require("dotenv").config({ path: ".env.development" });
require("./setup");

const request = require("supertest");
const app     = require("../server");

// ── Helper: Register + Login → get token ─────────────────────────────────────
const getToken = async () => {
  await request(app).post("/api/auth/register")
    .send({ username: "Admin", email: "admin@test.edu", password: "admin123" });
  const res = await request(app).post("/api/auth/login")
    .send({ email: "admin@test.edu", password: "admin123" });
  return res.body.token;
};

// ── Helper: Create a book ────────────────────────────────────────────────────
const createBook = (token, overrides = {}) =>
  request(app).post("/api/books").set("Authorization", `Bearer ${token}`)
    .send({ title: "Clean Code", author: "Robert Martin", isbn: "9780132350884",
      category: "Programming", totalCopies: 5, ...overrides });

// ── Helper: Create a member ──────────────────────────────────────────────────
const createMember = (token, overrides = {}) =>
  request(app).post("/api/members").set("Authorization", `Bearer ${token}`)
    .send({ name: "Arjun Sharma", email: "arjun@college.edu",
      phone: "9876543210", membershipType: "Student", ...overrides });

// ─────────────────────────────────────────────────────────────────────────────

describe("📚 BOOKS API", () => {

  let token;
  beforeEach(async () => { token = await getToken(); });

  describe("POST /api/books", () => {

    it("should create a book successfully", async () => {
      const res = await createBook(token);
      expect(res.statusCode).toBe(201);
      expect(res.body.data.title).toBe("Clean Code");
      expect(res.body.data.availableCopies).toBe(5);
    });

    it("should reject book without required fields", async () => {
      const res = await request(app).post("/api/books")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Only Title" }); // Missing author and isbn
      expect(res.statusCode).toBe(400);
    });

    it("should reject book with invalid ISBN (too short)", async () => {
      const res = await createBook(token, { isbn: "123" });
      expect(res.statusCode).toBe(400);
    });

    it("should reject duplicate ISBN", async () => {
      await createBook(token);
      const res = await createBook(token); // Same ISBN
      expect(res.statusCode).toBe(409);
    });
  });

  describe("GET /api/books", () => {

    it("should return all books", async () => {
      await createBook(token);
      await createBook(token, { title: "Pragmatic Programmer", isbn: "9780135957059" });
      const res = await request(app).get("/api/books").set("Authorization", `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.count).toBe(2);
    });

    it("should filter books by search term", async () => {
      await createBook(token);
      await createBook(token, { title: "Pragmatic Programmer", isbn: "9780135957059" });
      const res = await request(app).get("/api/books?search=Clean")
        .set("Authorization", `Bearer ${token}`);
      expect(res.body.count).toBe(1);
      expect(res.body.data[0].title).toBe("Clean Code");
    });

    it("should require authentication", async () => {
      const res = await request(app).get("/api/books");
      expect(res.statusCode).toBe(401);
    });
  });

  describe("PUT /api/books/:id", () => {

    it("should update a book", async () => {
      const create = await createBook(token);
      const bookId = create.body.data.id;
      const res = await request(app).put(`/api/books/${bookId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Updated Title" });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.title).toBe("Updated Title");
    });

    it("should return 404 for non-existent book", async () => {
      const res = await request(app).put("/api/books/64000000000000000000abcd")
        .set("Authorization", `Bearer ${token}`).send({ title: "Test" });
      expect(res.statusCode).toBe(404);
    });
  });

  describe("DELETE /api/books/:id", () => {

    it("should delete a book with all copies available", async () => {
      const create = await createBook(token);
      const bookId = create.body.data.id;
      const res = await request(app).delete(`/api/books/${bookId}`)
        .set("Authorization", `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("👥 MEMBERS API", () => {

  let token;
  beforeEach(async () => { token = await getToken(); });

  describe("POST /api/members", () => {

    it("should create a member successfully", async () => {
      const res = await createMember(token);
      expect(res.statusCode).toBe(201);
      expect(res.body.data.name).toBe("Arjun Sharma");
      expect(res.body.data.status).toBe("Active");
    });

    it("should reject member without required fields", async () => {
      const res = await request(app).post("/api/members")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "No Email" });
      expect(res.statusCode).toBe(400);
    });

    it("should reject member with invalid phone number", async () => {
      const res = await createMember(token, { phone: "12345" }); // Not 10 digits
      expect(res.statusCode).toBe(400);
    });

    it("should reject duplicate email", async () => {
      await createMember(token);
      const res = await createMember(token); // Same email
      expect(res.statusCode).toBe(409);
    });
  });

  describe("PATCH /api/members/:id/toggle-status", () => {

    it("should block an active member", async () => {
      const create = await createMember(token);
      const memberId = create.body.data.id;
      const res = await request(app).patch(`/api/members/${memberId}/toggle-status`)
        .set("Authorization", `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe("Blocked");
    });
  });
});
