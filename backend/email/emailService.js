const nodemailer = require("nodemailer");
const path       = require("path");
const fs         = require("fs");
const logger     = require("../config/logger");
const { EmailLog } = require("../models");

// ── Create transporter using Gmail service (NOT raw SMTP host)
// This is the CORRECT way for Gmail App Passwords
const createTransporter = () => nodemailer.createTransport({
  service: "gmail",          // ← KEY FIX: use "gmail" service, not host/port
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ── Read HTML template
const readTemplate = (name) => {
  const p = path.join(__dirname, "templates", `${name}.html`);
  try { return fs.readFileSync(p, "utf8"); } catch { return null; }
};

// ── Replace {{placeholders}} in template
const fillTemplate = (html, data) => {
  let out = html;
  Object.entries(data).forEach(([k, v]) => {
    out = out.replace(new RegExp(`{{${k}}}`, "g"), v || "");
  });
  return out;
};

// ── Core send function
const sendMail = async ({ to, subject, html, type, issueId, userId }) => {
  const fromAddr = process.env.SMTP_USER
    ? `"ACET Central Library" <${process.env.SMTP_USER}>`
    : "ACET Central Library <library@acet.edu>";

  try {
    const transporter = createTransporter();
    await transporter.sendMail({ from: fromAddr, to, subject, html });
    await EmailLog.create({ to, subject, type, issueId, userId, status: "sent" });
    logger.info(`📧 Email sent [${type}] → ${to}`);
    return { success: true };
  } catch (err) {
    await EmailLog.create({ to, subject, type, issueId, userId, status: "failed", error: err.message });
    logger.error(`📧 Email FAILED [${type}] → ${to}: ${err.message}`);
    return { success: false, error: err.message };
  }
};

// ── Test connection
const testConnection = async () => {
  try {
    const t = createTransporter();
    await t.verify();
    return { success: true, message: `SMTP OK — connected as ${process.env.SMTP_USER}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ── 1. Issue Confirmation
const sendIssueConfirmation = async (issue) => {
  const tmpl = readTemplate("issueConfirm");
  if (!tmpl) return;
  const due    = new Date(issue.dateOfReturn).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
  const issued = new Date(issue.dateOfIssue ).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
  const html   = fillTemplate(tmpl, {
    userName: issue.userName, userId: issue.userId,
    resourceTitle: issue.resourceTitle, accessionNo: issue.accessionNo,
    callNo: issue.callNo, dateOfIssue: issued, dateOfReturn: due,
    collegeName: process.env.COLLEGE_NAME || "ACET", finePerDay: process.env.FINE_PER_DAY || "5",
  });
  return sendMail({ to: issue.userEmail, subject: `📚 Book Issued: ${issue.resourceTitle} — ACET Library`, html, type: "issue_confirm", issueId: issue._id, userId: issue.userId });
};

// ── 2. Due Soon Reminder
const sendDueSoonReminder = async (issue) => {
  const tmpl = readTemplate("dueSoonReminder");
  if (!tmpl) return;
  const due  = new Date(issue.dateOfReturn).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
  const html = fillTemplate(tmpl, {
    userName: issue.userName, resourceTitle: issue.resourceTitle,
    accessionNo: issue.accessionNo, dateOfReturn: due, daysLeft: "3",
    collegeName: process.env.COLLEGE_NAME || "ACET", finePerDay: process.env.FINE_PER_DAY || "5",
  });
  return sendMail({ to: issue.userEmail, subject: `⚠️ Return Reminder: "${issue.resourceTitle}" due in 3 days — ACET Library`, html, type: "due_reminder", issueId: issue._id, userId: issue.userId });
};

// ── 3. Due Today
const sendDueTodayAlert = async (issue) => {
  const tmpl = readTemplate("dueSoonReminder");
  if (!tmpl) return;
  const due  = new Date(issue.dateOfReturn).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
  const html = fillTemplate(tmpl, {
    userName: issue.userName, resourceTitle: issue.resourceTitle,
    accessionNo: issue.accessionNo, dateOfReturn: due, daysLeft: "0 — Return TODAY",
    collegeName: process.env.COLLEGE_NAME || "ACET", finePerDay: process.env.FINE_PER_DAY || "5",
  });
  return sendMail({ to: issue.userEmail, subject: `🔴 Due TODAY: Please return "${issue.resourceTitle}" — ACET Library`, html, type: "due_reminder", issueId: issue._id, userId: issue.userId });
};

// ── 4. Overdue Alert
const sendOverdueAlert = async (issue, overdueDays, fineAmount) => {
  const tmpl = readTemplate("overdueAlert");
  if (!tmpl) return;
  const due  = new Date(issue.dateOfReturn).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
  const html = fillTemplate(tmpl, {
    userName: issue.userName, resourceTitle: issue.resourceTitle,
    accessionNo: issue.accessionNo, dateOfReturn: due,
    overdueDays: String(overdueDays), fineAmount: `₹${fineAmount}`,
    finePerDay: process.env.FINE_PER_DAY || "5", collegeName: process.env.COLLEGE_NAME || "ACET",
  });
  return sendMail({ to: issue.userEmail, subject: `🚨 OVERDUE: ${overdueDays} days — Fine ₹${fineAmount} — ACET Library`, html, type: "overdue_alert", issueId: issue._id, userId: issue.userId });
};

// ── 5. Return Receipt
const sendReturnReceipt = async (issue, fine) => {
  const tmpl = readTemplate("returnReceipt");
  if (!tmpl) return;
  const returned = new Date().toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
  const html = fillTemplate(tmpl, {
    userName: issue.userName, resourceTitle: issue.resourceTitle,
    accessionNo: issue.accessionNo, dateOfReturn: returned,
    fineAmount: fine ? `₹${fine.fineAmount}` : "NIL",
    fineStatus: fine ? fine.status : "No Fine",
    collegeName: process.env.COLLEGE_NAME || "ACET",
  });
  return sendMail({ to: issue.userEmail, subject: `✅ Book Returned: ${issue.resourceTitle} — ACET Library`, html, type: "return_receipt", issueId: issue._id, userId: issue.userId });
};

module.exports = { sendIssueConfirmation, sendDueSoonReminder, sendDueTodayAlert, sendOverdueAlert, sendReturnReceipt, testConnection, sendMail };