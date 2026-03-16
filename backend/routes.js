const router = require("express").Router();
const jwt    = require("jsonwebtoken");
const path   = require("path");
const logger = require("./config/logger");

const { Admin, User, Resource, Issue, Fine, Gate, EmailLog } = require("./models");
const { protect, authLimiter, upload } = require("./middleware");
const emailSvc = require("./email/emailService");

const FINE_PER_DAY    = () => parseInt(process.env.FINE_PER_DAY)    || 5;
const MAX_BORROW_DAYS = () => parseInt(process.env.MAX_BORROW_DAYS) || 14;
const MAX_BORROW_LIMIT= () => parseInt(process.env.MAX_BORROW_LIMIT)|| 4;
const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

// ═══════════════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════════════
router.post("/auth/register", authLimiter, async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password) return res.status(400).json({ success: false, message: "Username, email and password are required." });
    if (await Admin.findOne({ email })) return res.status(409).json({ success: false, message: "Email already registered." });
    const admin = await Admin.create({ username, email, passwordHash: password, role: role || "admin" });
    logger.info(`Admin registered: ${email}`);
    res.status(201).json({ success: true, message: "Registered.", token: signToken(admin._id), admin: { id: admin._id, username: admin.username, email: admin.email, role: admin.role } });
  } catch (e) { next(e); }
});

router.post("/auth/login", authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: "Email and password required." });
    const admin = await Admin.findOne({ email }).select("+passwordHash");
    if (!admin || !(await admin.comparePassword(password))) {
      logger.warn(`Failed login: ${email}`);
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }
    admin.lastLogin = new Date(); await admin.save({ validateBeforeSave: false });
    logger.info(`Admin logged in: ${email}`);
    res.json({ success: true, message: "Login successful.", token: signToken(admin._id), admin: { id: admin._id, username: admin.username, email: admin.email, role: admin.role } });
  } catch (e) { next(e); }
});

router.get("/auth/me",              protect, (req, res) => res.json({ success: true, admin: req.admin }));
router.put("/auth/change-password", protect, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const admin = await Admin.findById(req.admin._id).select("+passwordHash");
    if (!(await admin.comparePassword(currentPassword))) return res.status(400).json({ success: false, message: "Current password incorrect." });
    admin.passwordHash = newPassword; await admin.save();
    res.json({ success: true, message: "Password changed." });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════════════════════════
// USERS (Students/Faculty/Staff)
// ═══════════════════════════════════════════════════════════════════════════
router.get("/users", protect, async (req, res, next) => {
  try {
    const { search, department, status, year } = req.query;
    const q = {};
    if (search)     q.$or = [{ userId:{$regex:search,$options:"i"} }, { name:{$regex:search,$options:"i"} }, { email:{$regex:search,$options:"i"} }];
    if (department && department !== "All") q.department = department;
    if (status     && status     !== "All") q.status     = status;
    if (year       && year       !== "All") q.year       = year;
    const users = await User.find(q).sort({ name: 1 });
    res.json({ success: true, count: users.length, data: users });
  } catch (e) { next(e); }
});

router.get("/users/:userId", protect, async (req, res, next) => {
  try {
    const user = await User.findOne({ userId: req.params.userId.toUpperCase() });
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    res.json({ success: true, data: user });
  } catch (e) { next(e); }
});

router.post("/users", protect, upload.single("photo"), async (req, res, next) => {
  try {
    const body = JSON.parse(req.body.data || "{}");
    if (req.file) body.photo = req.file.filename;
    const user = await User.create(body);
    logger.info(`User registered: ${user.userId} — ${user.name}`);
    res.status(201).json({ success: true, message: "User registered.", data: user });
  } catch (e) { next(e); }
});

router.put("/users/:userId", protect, upload.single("photo"), async (req, res, next) => {
  try {
    const user = await User.findOne({ userId: req.params.userId.toUpperCase() });
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    const body = JSON.parse(req.body.data || "{}");
    if (req.file) body.photo = req.file.filename;
    Object.assign(user, body);
    await user.save();
    res.json({ success: true, message: "User updated.", data: user });
  } catch (e) { next(e); }
});

router.delete("/users/:userId", protect, async (req, res, next) => {
  try {
    const user = await User.findOne({ userId: req.params.userId.toUpperCase() });
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    if (user.booksTaken > 0) return res.status(400).json({ success: false, message: "Cannot delete: user has books issued." });
    await user.deleteOne();
    res.json({ success: true, message: "User deleted." });
  } catch (e) { next(e); }
});

router.patch("/users/:userId/toggle-status", protect, async (req, res, next) => {
  try {
    const user = await User.findOne({ userId: req.params.userId.toUpperCase() });
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    if (user.status === "Active" && user.booksTaken > 0) return res.status(400).json({ success: false, message: `Cannot block: user has ${user.booksTaken} book(s) issued.` });
    user.status = user.status === "Active" ? "Blocked" : "Active";
    await user.save();
    res.json({ success: true, message: `User ${user.status}.`, data: user });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════════════════════════
// RESOURCE MASTER
// ═══════════════════════════════════════════════════════════════════════════
router.get("/resources", protect, async (req, res, next) => {
  try {
    const { search, resourceType, department, status } = req.query;
    const q = {};
    if (search)       q.$or = [{ title:{$regex:search,$options:"i"} }, { accessionNo:{$regex:search,$options:"i"} }, { isbn:{$regex:search,$options:"i"} }, { "authors.author1":{$regex:search,$options:"i"} }];
    if (resourceType && resourceType !== "All") q.resourceType = resourceType;
    if (department   && department   !== "All") q.department   = department;
    if (status       && status       !== "All") q.status       = status;
    const resources = await Resource.find(q).sort({ accessionNo: 1 });
    res.json({ success: true, count: resources.length, data: resources });
  } catch (e) { next(e); }
});

router.get("/resources/by-accno/:accNo", protect, async (req, res, next) => {
  try {
    const resource = await Resource.findOne({ accessionNo: req.params.accNo.toUpperCase() });
    if (!resource) return res.status(404).json({ success: false, message: "Resource not found." });
    res.json({ success: true, data: resource });
  } catch (e) { next(e); }
});

router.get("/resources/:id", protect, async (req, res, next) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ success: false, message: "Resource not found." });
    res.json({ success: true, data: resource });
  } catch (e) { next(e); }
});

router.post("/resources", protect, async (req, res, next) => {
  try {
    const resource = await Resource.create(req.body);
    logger.info(`Resource added: ${resource.accessionNo} — "${resource.title}"`);
    res.status(201).json({ success: true, message: "Resource added.", data: resource });
  } catch (e) { next(e); }
});

router.put("/resources/:id", protect, async (req, res, next) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ success: false, message: "Resource not found." });
    Object.assign(resource, req.body);
    await resource.save();
    res.json({ success: true, message: "Resource updated.", data: resource });
  } catch (e) { next(e); }
});

router.delete("/resources/:id", protect, async (req, res, next) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ success: false, message: "Resource not found." });
    if (resource.status === "Issued") return res.status(400).json({ success: false, message: "Cannot delete: resource is currently issued." });
    await resource.deleteOne();
    res.json({ success: true, message: "Resource deleted." });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════════════════════════
// RESOURCE ISSUE
// ═══════════════════════════════════════════════════════════════════════════
router.post("/issue", protect, async (req, res, next) => {
  try {
    const { userId, accessionNo, dueDate, actualPages, missingPages } = req.body;
    if (!userId || !accessionNo) return res.status(400).json({ success: false, message: "userId and accessionNo are required." });

    const [user, resource] = await Promise.all([
      User.findOne({ userId: userId.toUpperCase() }),
      Resource.findOne({ accessionNo: accessionNo.toUpperCase() }),
    ]);
    if (!user)                      return res.status(404).json({ success: false, message: "User not found." });
    if (user.status === "Blocked")  return res.status(403).json({ success: false, message: "User is blocked. Clear dues before issue." });
    if (!resource)                  return res.status(404).json({ success: false, message: "Resource not found." });
    if (resource.status !== "Available") return res.status(400).json({ success: false, message: `Resource is ${resource.status}.` });
    if (user.booksTaken >= MAX_BORROW_LIMIT()) return res.status(400).json({ success: false, message: `Max borrow limit (${MAX_BORROW_LIMIT()}) reached.` });

    const due = dueDate ? new Date(dueDate) : new Date(Date.now() + MAX_BORROW_DAYS() * 86400000);
    const issue = await Issue.create({
      resource:      resource._id,
      user:          user._id,
      accessionNo:   resource.accessionNo,
      callNo:        resource.callNo,
      resourceTitle: resource.title,
      userId:        user.userId,
      userName:      user.name,
      department:    user.department,
      dateOfReturn:  due,
      actualPages:   actualPages || resource.actualPages,
      missingPages:  missingPages || "NIL",
      issuedByAdmin: req.admin.username,
      userEmail:     user.email,
    });

    await Promise.all([
      Resource.findByIdAndUpdate(resource._id, { status: "Issued", $inc: { timesIssued: 1 } }),
      User.findByIdAndUpdate(user._id, { $inc: { booksTaken: 1 } }),
    ]);

    // Send confirmation email (non-blocking)
    if (user.email) {
      issue.userEmail = user.email;
      emailSvc.sendIssueConfirmation(issue).then(r => {
        if (r?.success) Issue.findByIdAndUpdate(issue._id, { emailSentIssue: true }).exec();
      }).catch(() => {});
    }

    logger.info(`Issue: ${resource.accessionNo} → ${user.userId}`);
    res.status(201).json({ success: true, message: `"${resource.title}" issued to ${user.name}. Email confirmation sent.`, data: issue });
  } catch (e) { next(e); }
});

router.get("/issue/user/:userId", protect, async (req, res, next) => {
  try {
    const issues = await Issue.find({ userId: req.params.userId.toUpperCase() }).sort({ createdAt: -1 });
    res.json({ success: true, count: issues.length, data: issues });
  } catch (e) { next(e); }
});

router.get("/issue", protect, async (req, res, next) => {
  try {
    await Issue.updateMany({ status: "Active", dateOfReturn: { $lt: new Date() } }, { $set: { status: "Overdue" } });
    const { status, userId } = req.query;
    const q = {};
    if (status && status !== "All") q.status = status;
    if (userId) q.userId = userId.toUpperCase();
    const issues = await Issue.find(q).sort({ createdAt: -1 });
    res.json({ success: true, count: issues.length, data: issues });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════════════════════════
// RESOURCE RETURN
// ═══════════════════════════════════════════════════════════════════════════
router.put("/return/:issueId", protect, async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.issueId).populate("user","email");
    if (!issue) return res.status(404).json({ success: false, message: "Issue record not found." });
    if (issue.status === "Returned") return res.status(400).json({ success: false, message: "Already returned." });

    const today      = new Date();
    const overdueDays= Math.max(0, Math.floor((today - issue.dateOfReturn) / 86400000));
    const fineAmount = overdueDays * FINE_PER_DAY();
    const { actualPages, missingPages, reservedStatus } = req.body;

    let fine = null;
    if (fineAmount > 0) {
      fine = await Fine.create({
        issue:         issue._id,
        user:          issue.user._id || issue.user,
        resource:      issue.resource,
        userId:        issue.userId,
        userName:      issue.userName,
        resourceTitle: issue.resourceTitle,
        accessionNo:   issue.accessionNo,
        fineDays:      overdueDays,
        fineAmount,
        reservedStatus: reservedStatus || false,
        actualPages:   actualPages || issue.actualPages,
        missingPages:  missingPages || issue.missingPages,
      });
      await User.findOneAndUpdate({ userId: issue.userId }, { $inc: { fineBalance: fineAmount } });
    }

    issue.dateOfActReturn  = today;
    issue.status           = "Returned";
    issue.returnedByAdmin  = req.admin.username;
    if (actualPages)  issue.actualPages  = actualPages;
    if (missingPages) issue.missingPages = missingPages;
    await issue.save();

    await Promise.all([
      Resource.findByIdAndUpdate(issue.resource, { status: "Available" }),
      User.findOneAndUpdate({ userId: issue.userId }, { $inc: { booksTaken: -1 } }),
    ]);

    // Send return receipt email (non-blocking)
    const userEmail = issue.user?.email;
    if (userEmail) {
      issue.userEmail = userEmail;
      emailSvc.sendReturnReceipt(issue, fine).catch(() => {});
    }

    logger.info(`Return: ${issue.accessionNo} by ${issue.userId}${overdueDays > 0 ? ` — Fine ₹${fineAmount}` : ""}`);
    res.json({ success: true, message: overdueDays > 0 ? `Returned. Fine ₹${fineAmount} (${overdueDays} days).` : "Returned successfully. No fine.", data: { issue, fine } });
  } catch (e) { next(e); }
});

router.get("/return/lookup", protect, async (req, res, next) => {
  try {
    const { accNo, userId } = req.query;
    const q = { status: { $in: ["Active","Overdue"] } };
    if (accNo)  q.accessionNo = accNo.toUpperCase();
    if (userId) q.userId      = userId.toUpperCase();
    const issues = await Issue.find(q).sort({ createdAt: -1 });
    res.json({ success: true, data: issues });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════════════════════════
// FINES
// ═══════════════════════════════════════════════════════════════════════════
router.get("/fines", protect, async (req, res, next) => {
  try {
    const { status, userId } = req.query;
    const q = {};
    if (status && status !== "All") q.status = status;
    if (userId) q.userId = userId.toUpperCase();
    const fines = await Fine.find(q).sort({ createdAt: -1 });
    const summary = await Fine.aggregate([{ $group: { _id: null,
      total:     { $sum: "$fineAmount" },
      collected: { $sum: { $cond: [{ $eq: ["$status","Paid"]  }, "$fineAmount", 0] } },
      pending:   { $sum: { $cond: [{ $eq: ["$status","Unpaid"]}, "$fineAmount", 0] } },
    }}]);
    res.json({ success: true, count: fines.length, data: fines, summary: summary[0] || {} });
  } catch (e) { next(e); }
});

router.put("/fines/:id/pay", protect, async (req, res, next) => {
  try {
    const fine = await Fine.findById(req.params.id);
    if (!fine) return res.status(404).json({ success: false, message: "Fine not found." });
    if (fine.status === "Paid") return res.status(400).json({ success: false, message: "Already paid." });
    fine.status = "Paid"; fine.paidDate = new Date(); fine.paidAmount = req.body.paidAmount || fine.fineAmount;
    await fine.save();
    await User.findOneAndUpdate({ userId: fine.userId }, { $inc: { fineBalance: -fine.fineAmount } });
    logger.info(`Fine paid: ₹${fine.fineAmount} by ${fine.userName}`);
    res.json({ success: true, message: `Fine of ₹${fine.fineAmount} paid.`, data: fine });
  } catch (e) { next(e); }
});

router.put("/fines/:id/waive", protect, async (req, res, next) => {
  try {
    const fine = await Fine.findById(req.params.id);
    if (!fine) return res.status(404).json({ success: false, message: "Fine not found." });
    fine.status = "Waived"; fine.notes = req.body.reason || "Waived by admin"; await fine.save();
    await User.findOneAndUpdate({ userId: fine.userId }, { $inc: { fineBalance: -fine.fineAmount } });
    res.json({ success: true, message: "Fine waived.", data: fine });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════════════════════════
// GATE REGISTER
// ═══════════════════════════════════════════════════════════════════════════
router.post("/gate/login", protect, async (req, res, next) => {
  try {
    const { userId, purpose, remarks } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: "userId is required." });
    const user = await User.findOne({ userId: userId.toUpperCase() });
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    if (user.status === "Blocked") return res.status(403).json({ success: false, message: "User is blocked." });
    const alreadyIn = await Gate.findOne({ userId: userId.toUpperCase(), status: "Inside" });
    if (alreadyIn) return res.status(400).json({ success: false, message: `${user.name} is already inside.` });
    const today = new Date().toISOString().slice(0, 10);
    const isFaculty = user.year === "Faculty";
    const isStaff   = user.year === "Staff";
    const entry = await Gate.create({
      user: user._id, userId: user.userId, userName: user.name,
      department: user.department, degree: user.degree || user.year,
      photo: user.photo, userType: isFaculty ? "Faculty" : isStaff ? "Staff" : "Student",
      dayscholar: user.dayscholarHostler, loginDate: today,
      purpose: purpose || "Study", remarks: remarks || "",
    });
    logger.info(`Gate login: ${user.userId} — ${user.name}`);
    res.status(201).json({ success: true, message: `Welcome, ${user.name}!`, data: { entry, user } });
  } catch (e) { next(e); }
});

router.post("/gate/logout/:entryId", protect, async (req, res, next) => {
  try {
    const entry = await Gate.findById(req.params.entryId);
    if (!entry) return res.status(404).json({ success: false, message: "Gate entry not found." });
    if (entry.status === "Exited") return res.status(400).json({ success: false, message: "Already exited." });
    entry.logoutTime = new Date(); await entry.save();
    logger.info(`Gate logout: ${entry.userId} — duration: ${entry.duration}m`);
    const dur = entry.duration; const h = Math.floor(dur/60); const m = dur%60;
    res.json({ success: true, message: `Goodbye, ${entry.userName}! Duration: ${h > 0 ? h+"h " : ""}${m}m`, data: entry });
  } catch (e) { next(e); }
});

router.get("/gate/today", protect, async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const entries = await Gate.find({ loginDate: today }).sort({ loginTime: -1 });
    const countInside = entries.filter(e => e.status === "Inside").length;
    const countOut    = entries.filter(e => e.status === "Exited").length;
    res.json({ success: true, count: entries.length, countInside, countOut, data: entries });
  } catch (e) { next(e); }
});

router.get("/gate/inside", protect, async (req, res, next) => {
  try {
    const entries = await Gate.find({ status: "Inside" }).sort({ loginTime: 1 });
    res.json({ success: true, count: entries.length, data: entries });
  } catch (e) { next(e); }
});

router.get("/gate/report", protect, async (req, res, next) => {
  try {
    const { from, to, userType, userId } = req.query;
    const q = {};
    if (from || to) { q.loginDate = {}; if (from) q.loginDate.$gte = from; if (to) q.loginDate.$lte = to; }
    if (userType && userType !== "All") q.userType = userType;
    if (userId) q.userId = userId.toUpperCase();
    const entries = await Gate.find(q).sort({ loginDate: -1, loginTime: -1 }).limit(500);
    res.json({ success: true, count: entries.length, data: entries });
  } catch (e) { next(e); }
});

router.get("/gate/stats", protect, async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const todayAll = await Gate.find({ loginDate: today });
    const inside   = await Gate.find({ status: "Inside" });
    const exited   = todayAll.filter(e => e.status === "Exited");
    const avgDur   = exited.length ? Math.round(exited.reduce((s, e) => s + (e.duration||0), 0) / exited.length) : 0;
    res.json({ success: true, data: {
      todayTotal: todayAll.length, currentlyInside: inside.length, exited: exited.length, avgDuration: avgDur,
      byType: { Student: todayAll.filter(e=>e.userType==="Student").length, Faculty: todayAll.filter(e=>e.userType==="Faculty").length, Staff: todayAll.filter(e=>e.userType==="Staff").length },
    }});
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════════════════════════
// EMAIL
// ═══════════════════════════════════════════════════════════════════════════
router.get("/email/test", protect, async (req, res) => {
  const result = await emailSvc.testConnection();
  res.status(result.success ? 200 : 500).json(result);
});

router.post("/email/blast-overdue", protect, async (req, res, next) => {
  try {
    const overdue = await Issue.find({ status: "Overdue" }).populate("user", "email");
    let sent = 0, failed = 0;
    const today = new Date();
    for (const issue of overdue) {
      if (!issue.user?.email) continue;
      const days = Math.floor((today - issue.dateOfReturn) / 86400000);
      const fine = days * FINE_PER_DAY();
      issue.userEmail = issue.user.email;
      const r = await emailSvc.sendOverdueAlert(issue, days, fine);
      if (r?.success) { sent++; issue.emailSentOverdue = today; await issue.save(); }
      else failed++;
    }
    res.json({ success: true, message: `Overdue blast: ${sent} sent, ${failed} failed.`, sent, failed });
  } catch (e) { next(e); }
});

router.get("/email/logs", protect, async (req, res, next) => {
  try {
    const logs = await EmailLog.find().sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, count: logs.length, data: logs });
  } catch (e) { next(e); }
});

// Send a custom notification email to specific members (by userId list)
router.post("/email/send-to-members", protect, async (req, res, next) => {
  try {
    const { members, subject, message, emailType } = req.body;
    // members = [{ userId, userName, email }]
    if (!members || members.length === 0)
      return res.status(400).json({ success:false, message:"No members provided." });
    if (!subject || !message)
      return res.status(400).json({ success:false, message:"Subject and message are required." });

    let sent = 0, failed = 0;
    const results = [];

    for (const m of members) {
      if (!m.email) { failed++; results.push({ userId:m.userId, status:"failed", reason:"No email" }); continue; }

      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0}
  .container{max-width:600px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.1)}
  .header{background:linear-gradient(135deg,#1a3a6c,#0d5c9e);padding:30px;text-align:center}
  .header h1{color:#fff;font-size:22px;margin:0 0 5px}
  .header p{color:#b8d4f0;font-size:13px;margin:0}
  .body{padding:30px}
  .greeting{font-size:16px;color:#1a3a6c;font-weight:700;margin-bottom:12px}
  .student-card{background:#f0f7ff;border:1px solid #b8d4f0;border-radius:8px;padding:15px;margin-bottom:18px;display:flex;gap:14px;align-items:center}
  .avatar{width:44px;height:44px;background:#1a3a6c;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px;flex-shrink:0}
  .student-info p{margin:0;font-size:13px;color:#4a5568}
  .student-info b{color:#1a3a6c;font-size:14px}
  .message-box{background:#fff8e1;border-left:4px solid #f59e0b;padding:16px 18px;border-radius:0 8px 8px 0;margin:18px 0;font-size:14px;color:#374151;line-height:1.7}
  .footer{background:#1a3a6c;padding:20px;text-align:center}
  .footer p{color:#b8d4f0;font-size:12px;margin:3px 0}
  .badge{display:inline-block;background:#e8f4f8;color:#1a3a6c;border-radius:20px;padding:3px 12px;font-size:12px;font-weight:600;margin-top:6px}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>📚 ACET Central Library</h1>
    <p>Akshaya College of Engineering and Technology, Coimbatore</p>
  </div>
  <div class="body">
    <p class="greeting">Dear ${m.userName},</p>
    <div class="student-card">
      <div class="avatar">${m.userName.charAt(0).toUpperCase()}</div>
      <div class="student-info">
        <b>${m.userName}</b>
        <p>Roll No: ${m.userId}</p>
        <p>Email: ${m.email}</p>
      </div>
    </div>
    <div class="message-box">${message.replace(/\n/g, "<br/>")}</div>
    <p style="font-size:13px;color:#718096;margin-top:20px">
      If you have any queries, please contact the library staff at the Central Library counter.
    </p>
  </div>
  <div class="footer">
    <p><b style="color:#fff">ACET Central Library</b></p>
    <p>Akshaya College of Engineering and Technology</p>
    <p>Coimbatore — Tamil Nadu</p>
    <span class="badge">This is an automated message from LibraryOS v4</span>
  </div>
</div>
</body>
</html>`;

      const r = await emailSvc.sendMail({
        to: m.email,
        subject,
        html,
        type: emailType || "custom_notification",
        userId: m.userId,
      });
      if (r?.success) { sent++; results.push({ userId:m.userId, name:m.userName, email:m.email, status:"sent" }); }
      else             { failed++; results.push({ userId:m.userId, name:m.userName, email:m.email, status:"failed", reason:r?.error }); }
    }

    res.json({
      success: true,
      message: `Email sent to ${sent} member(s)${failed>0 ? `, ${failed} failed` : ""}.`,
      sent, failed, results,
    });
  } catch(e) { next(e); }
});

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════
router.get("/dashboard", protect, async (req, res, next) => {
  try {
    await Issue.updateMany({ status: "Active", dateOfReturn: { $lt: new Date() } }, { $set: { status: "Overdue" } });
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const in3 = new Date(); in3.setDate(in3.getDate() + 3);

    const [totalUsers, totalResources, activeIssues, overdueIssues, fineAgg,
           recentIssues, dueTodayCount, dueIn3Count, gateToday, emailLogs] = await Promise.all([
      User.countDocuments(),
      Resource.countDocuments(),
      Issue.countDocuments({ status: "Active" }),
      Issue.countDocuments({ status: "Overdue" }),
      Fine.aggregate([{ $group: { _id: null,
        total:     { $sum: "$fineAmount" },
        collected: { $sum: { $cond: [{ $eq: ["$status","Paid"]  }, "$fineAmount", 0] } },
        pending:   { $sum: { $cond: [{ $eq: ["$status","Unpaid"]}, "$fineAmount", 0] } },
      }}]),
      Issue.find({ status: { $in: ["Active","Overdue"] } }).sort({ createdAt: -1 }).limit(8),
      Issue.countDocuments({ status: "Active", dateOfReturn: { $gte: new Date(), $lt: tomorrow } }),
      Issue.countDocuments({ status: "Active", dateOfReturn: { $gte: new Date(), $lt: in3 } }),
      Gate.find({ loginDate: today }).select("userId userName status loginTime logoutTime department userType").limit(20),
      EmailLog.countDocuments({ status: "sent", createdAt: { $gte: new Date(Date.now() - 86400000) } }),
    ]);
    const fs = fineAgg[0] || {};
    res.json({ success: true, data: {
      stats: { totalUsers, totalResources, activeIssues, overdueIssues, dueTodayCount, dueIn3Count,
        finesCollected: fs.collected||0, finesPending: fs.pending||0, emailsSentToday: emailLogs,
        gateCountToday: gateToday.length,
      },
      recentIssues, gateToday,
    }});
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════════════════
router.get("/reports/most-issued", protect, async (req, res, next) => {
  try {
    const data = await Issue.aggregate([
      { $group: { _id: "$resourceTitle", count: { $sum: 1 }, accNo: { $first: "$accessionNo" } } },
      { $sort: { count: -1 } }, { $limit: 10 },
    ]);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

router.get("/reports/dept-stats", protect, async (req, res, next) => {
  try {
    const data = await Issue.aggregate([
      { $group: { _id: "$department", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

router.get("/reports/overdue-users", protect, async (req, res, next) => {
  try {
    const issues = await Issue.find({ status: "Overdue" }).sort({ dateOfReturn: 1 });
    const today = new Date();
    const data = issues.map(i => ({
      ...i.toJSON(),
      overdueDays: Math.floor((today - i.dateOfReturn) / 86400000),
      currentFine: Math.floor((today - i.dateOfReturn) / 86400000) * FINE_PER_DAY(),
    }));
    res.json({ success: true, count: data.length, data });
  } catch (e) { next(e); }
});

module.exports = router;