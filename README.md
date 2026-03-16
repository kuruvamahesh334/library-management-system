# 📚 LibraryOS v4 — ACET Library Management System

> Akshaya College of Engineering and Technology — Central Library, Coimbatore

## ✨ Modules

| Module | Description |
|---|---|
| 👤 User Details | Register students/faculty with photo, addresses, category, expiry |
| 📚 Resource Master | Manage Books, Journals, Back Volumes, Projects |
| 📤 Resource Issue | Issue books with auto-fill, balance check, email confirmation |
| 📥 Resource Return | Return with fine calculation, receipt email |
| 🚪 Gate Register | ACET-style gate login/logout with live timer |
| 💰 Fines | Track, pay and waive overdue fines |
| 📊 Reports | Analytics — most issued, dept stats, overdue list |
| 📧 Email Settings | Gmail SMTP config, scheduler, email logs |

## 🚀 Quick Start

### Backend
```bash
cd backend
npm install
# Edit .env.development — set MONGO_URI and Gmail SMTP credentials
node seed.js       # Seed sample data
npm run dev        # Start on http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm run dev        # Start on http://localhost:3000
```

**Login:** admin@acet.edu / admin123

## 📧 Email Setup (Gmail SMTP)

1. Enable 2-Step Verification on your Google account
2. Go to **Security → App passwords** → generate one
3. Add to `backend/.env.development`:
   ```
   SMTP_USER=your_gmail@gmail.com
   SMTP_PASS=your16charapppassword
   ```
4. Test via **Email Settings** page in the UI

## 📬 Automatic Emails

- **Issue Confirmation** — immediately on issue
- **3-Day Reminder** — 3 days before due date (8 AM daily)
- **Due Today Alert** — morning of due date (8 AM daily)
- **Overdue Alert** — daily at 8 AM for all overdue books
- **Return Receipt** — immediately on return

## 🔐 API

- Docs: http://localhost:5000/api-docs
- Health: http://localhost:5000/health

## 🏗️ Tech Stack

**Backend:** Node.js, Express, MongoDB, Mongoose, JWT, Nodemailer, node-cron, Multer, Swagger  
**Frontend:** React 18, Vite, React Router v6, Axios
