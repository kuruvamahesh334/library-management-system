const cron   = require("node-cron");
const logger = require("../config/logger");
const { Issue } = require("../models");
const { sendDueSoonReminder, sendDueTodayAlert, sendOverdueAlert } = require("./emailService");

const FINE_PER_DAY = () => parseInt(process.env.FINE_PER_DAY) || 5;

// ── Runs every day at 8:00 AM ─────────────────────────────────────────────────
const startEmailScheduler = () => {
  cron.schedule("0 8 * * *", async () => {
    logger.info("⏰ Daily email scheduler started...");
    try {
      const now   = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const in3   = new Date(today); in3.setDate(in3.getDate() + 3);
      const in3End= new Date(in3);   in3End.setHours(23, 59, 59);

      // 1. Due in exactly 3 days — send reminder
      const dueSoon = await Issue.find({
        status: "Active",
        dateOfReturn: { $gte: in3, $lte: in3End },
        emailSentReminder3: false,
      }).populate("user", "email");

      for (const issue of dueSoon) {
        if (issue.user?.email) {
          issue.userEmail = issue.user.email;
          await sendDueSoonReminder(issue);
          issue.emailSentReminder3 = true;
          await issue.save();
        }
      }
      logger.info(`📧 3-day reminders sent: ${dueSoon.length}`);

      // 2. Due today — send urgent alert
      const dueToday = await Issue.find({
        status: "Active",
        dateOfReturn: { $gte: today, $lt: new Date(today.getTime() + 86400000) },
        emailSentDueDay: false,
      }).populate("user", "email");

      for (const issue of dueToday) {
        if (issue.user?.email) {
          issue.userEmail = issue.user.email;
          await sendDueTodayAlert(issue);
          issue.emailSentDueDay = true;
          await issue.save();
        }
      }
      logger.info(`📧 Due-today alerts sent: ${dueToday.length}`);

      // 3. Overdue — mark overdue + send daily overdue email
      const overdueIssues = await Issue.find({
        status: { $in: ["Active", "Overdue"] },
        dateOfReturn: { $lt: today },
      }).populate("user", "email");

      for (const issue of overdueIssues) {
        issue.status = "Overdue";
        const overdueDays = Math.floor((today - issue.dateOfReturn) / 86400000);
        const fineAmount  = overdueDays * FINE_PER_DAY();

        // Send overdue email if not sent today
        const lastSent = issue.emailSentOverdue;
        const sentToday = lastSent && new Date(lastSent).toDateString() === today.toDateString();

        if (!sentToday && issue.user?.email) {
          issue.userEmail = issue.user.email;
          await sendOverdueAlert(issue, overdueDays, fineAmount);
          issue.emailSentOverdue = now;
        }
        await issue.save();
      }
      logger.info(`📧 Overdue alerts sent: ${overdueIssues.length}`);

    } catch (err) {
      logger.error(`Email scheduler error: ${err.message}`);
    }
    logger.info("⏰ Daily email scheduler completed.");
  });

  logger.info("⏰ Email scheduler registered — runs daily at 8:00 AM");
};

module.exports = { startEmailScheduler };
