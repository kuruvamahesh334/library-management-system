// ─────────────────────────────────────────────────────────────────────────────
// STEP 11d: TRANSACTION & FINE TESTS
// ─────────────────────────────────────────────────────────────────────────────
require("dotenv").config({ path: ".env.development" });
require("./setup");

const request  = require("supertest");
const app      = require("../server");
const { Transaction } = require("../models");

const getToken = async () => {
  await request(app).post("/api/auth/register")
    .send({ username: "Admin", email: "admin@test.edu", password: "admin123" });
  const r = await request(app).post("/api/auth/login")
    .send({ email: "admin@test.edu", password: "admin123" });
  return r.body.token;
};

describe("🔄 TRANSACTIONS & 💰 FINES API", () => {

  let token, bookId, memberId;

  beforeEach(async () => {
    token = await getToken();

    const book = await request(app).post("/api/books")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Clean Code", author: "Robert Martin", isbn: "9780132350884", category: "Programming", totalCopies: 3 });
    bookId = book.body.data.id;

    const member = await request(app).post("/api/members")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Test Student", email: "student@college.edu", phone: "9876543210", membershipType: "Student" });
    memberId = member.body.data.id;
  });

  describe("POST /api/transactions — Issue Book", () => {

    it("should issue a book successfully", async () => {
      const res = await request(app).post("/api/transactions")
        .set("Authorization", `Bearer ${token}`)
        .send({ bookId, memberId });
      expect(res.statusCode).toBe(201);
      expect(res.body.data.bookTitle).toBe("Clean Code");
      expect(res.body.data.status).toBe("Active");
    });

    it("should reduce available copies after issuing", async () => {
      await request(app).post("/api/transactions")
        .set("Authorization", `Bearer ${token}`).send({ bookId, memberId });
      const books = await request(app).get("/api/books")
        .set("Authorization", `Bearer ${token}`);
      const book = books.body.data[0];
      expect(book.availableCopies).toBe(2); // Was 3, now 2
    });

    it("should reject issuing to a blocked member", async () => {
      await request(app).patch(`/api/members/${memberId}/toggle-status`)
        .set("Authorization", `Bearer ${token}`);
      const res = await request(app).post("/api/transactions")
        .set("Authorization", `Bearer ${token}`).send({ bookId, memberId });
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain("blocked");
    });

    it("should reject issuing when no copies available", async () => {
      // Issue all 3 copies
      for (let i = 0; i < 3; i++) {
        const m = await request(app).post("/api/members")
          .set("Authorization", `Bearer ${token}`)
          .send({ name: `Member ${i}`, email: `m${i}@test.com`, phone: `987654321${i}`, membershipType: "Student" });
        await request(app).post("/api/transactions")
          .set("Authorization", `Bearer ${token}`)
          .send({ bookId, memberId: m.body.data.id });
      }
      const res = await request(app).post("/api/transactions")
        .set("Authorization", `Bearer ${token}`).send({ bookId, memberId });
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain("No copies available");
    });

    it("should reject issuing with invalid bookId", async () => {
      const res = await request(app).post("/api/transactions")
        .set("Authorization", `Bearer ${token}`)
        .send({ bookId: "invalid_id", memberId });
      expect(res.statusCode).toBe(400);
    });
  });

  describe("PUT /api/transactions/:id/return — Return Book", () => {

    it("should return a book with no fine when on time", async () => {
      const issue = await request(app).post("/api/transactions")
        .set("Authorization", `Bearer ${token}`).send({ bookId, memberId });
      const txnId = issue.body.data.id;

      const res = await request(app).put(`/api/transactions/${txnId}/return`)
        .set("Authorization", `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.transaction.status).toBe("Returned");
      expect(res.body.data.fine).toBeNull(); // No fine
    });

    it("should create a fine when book is overdue", async () => {
      const issue = await request(app).post("/api/transactions")
        .set("Authorization", `Bearer ${token}`).send({ bookId, memberId });
      const txnId = issue.body.data.id;

      // Manually set due date to 5 days ago to simulate overdue
      await Transaction.findByIdAndUpdate(txnId, {
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      });

      const res = await request(app).put(`/api/transactions/${txnId}/return`)
        .set("Authorization", `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.fine).not.toBeNull();
      expect(res.body.data.fine.amount).toBe(50); // 5 days × ₹10
    });

    it("should reject returning an already returned book", async () => {
      const issue = await request(app).post("/api/transactions")
        .set("Authorization", `Bearer ${token}`).send({ bookId, memberId });
      const txnId = issue.body.data.id;
      await request(app).put(`/api/transactions/${txnId}/return`).set("Authorization", `Bearer ${token}`);
      const res = await request(app).put(`/api/transactions/${txnId}/return`).set("Authorization", `Bearer ${token}`);
      expect(res.statusCode).toBe(400);
    });
  });

  describe("💰 FINES API", () => {

    let fineId;

    beforeEach(async () => {
      const issue = await request(app).post("/api/transactions")
        .set("Authorization", `Bearer ${token}`).send({ bookId, memberId });
      const txnId = issue.body.data.id;
      await Transaction.findByIdAndUpdate(txnId, { dueDate: new Date(Date.now() - 3 * 86400000) });
      const ret = await request(app).put(`/api/transactions/${txnId}/return`)
        .set("Authorization", `Bearer ${token}`);
      fineId = ret.body.data.fine?.id;
    });

    it("should list all fines", async () => {
      const res = await request(app).get("/api/fines").set("Authorization", `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.count).toBeGreaterThan(0);
    });

    it("should mark a fine as paid", async () => {
      const res = await request(app).put(`/api/fines/${fineId}/pay`)
        .set("Authorization", `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe("Paid");
      expect(res.body.data.paidDate).toBeDefined();
    });

    it("should reject marking an already paid fine", async () => {
      await request(app).put(`/api/fines/${fineId}/pay`).set("Authorization", `Bearer ${token}`);
      const res = await request(app).put(`/api/fines/${fineId}/pay`).set("Authorization", `Bearer ${token}`);
      expect(res.statusCode).toBe(400);
    });
  });
});
