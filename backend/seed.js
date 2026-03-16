require("dotenv").config({ path: ".env.development" });
const mongoose = require("mongoose");
const { Admin, User, Resource, Issue, Fine, Gate } = require("./models");

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("🌱 Seeding LibraryOS v4 — 30 Students...\n");

  await Promise.all([Admin.deleteMany(), User.deleteMany(), Resource.deleteMany(), Issue.deleteMany(), Fine.deleteMany(), Gate.deleteMany()]);

  // ── ADMIN ──────────────────────────────────────────────────────────────
  await Admin.create({ username: "Admin", email: "admin@acet.edu", passwordHash: "admin123", role: "admin" });
  console.log("✅ Admin  →  admin@acet.edu / admin123\n");

  // ── 30 STUDENTS + 3 FACULTY ────────────────────────────────────────────
  const users = await User.insertMany([

    // ── CSE DEPARTMENT (BE 1st Year)
    { userId: "24CSE001", name: "ARJUN KUMAR S",          email: "arjun.kumar@acet.edu",     phone: "9876501001", department: "COMPUTER SCIENCE ENGINEERING",    year: "BE 1Yr", degree: "B.E", sex: "Male",   dayscholarHostler: "Dayscholar", category: "General",         course: "CSE",  dateOfReg: new Date("2024-09-02"), dateOfBirth: new Date("2006-03-15"), expiryDate: new Date("2028-05-01"), maxBooksAllowed: 4 },
    { userId: "24CSE002", name: "PRIYA DHARSHINI R",      email: "priya.d@acet.edu",         phone: "9876501002", department: "COMPUTER SCIENCE ENGINEERING",    year: "BE 1Yr", degree: "B.E", sex: "Female", dayscholarHostler: "Hostler",    category: "SC/ST",           course: "CSE",  dateOfReg: new Date("2024-09-02"), dateOfBirth: new Date("2006-07-22"), expiryDate: new Date("2028-05-01"), maxBooksAllowed: 4 },
    { userId: "24CSE003", name: "MOHAMMED IRFAN A",       email: "irfan.a@acet.edu",         phone: "9876501003", department: "COMPUTER SCIENCE ENGINEERING",    year: "BE 1Yr", degree: "B.E", sex: "Male",   dayscholarHostler: "Dayscholar", category: "General",         course: "CSE",  dateOfReg: new Date("2024-09-02"), dateOfBirth: new Date("2005-11-08"), expiryDate: new Date("2028-05-01"), maxBooksAllowed: 4 },
    { userId: "24CSE004", name: "KEERTHANA LAKSHMI V",    email: "keerthana.v@acet.edu",     phone: "9876501004", department: "COMPUTER SCIENCE ENGINEERING",    year: "BE 1Yr", degree: "B.E", sex: "Female", dayscholarHostler: "Dayscholar", category: "OBC",             course: "CSE",  dateOfReg: new Date("2024-09-02"), dateOfBirth: new Date("2006-01-30"), expiryDate: new Date("2028-05-01"), maxBooksAllowed: 4 },

    // ── ECE DEPARTMENT (BE 2nd Year)
    { userId: "23ECE005", name: "SURESH BABU M",          email: "suresh.m@acet.edu",        phone: "9876501005", department: "ELECTRONICS & COMMUNICATIONS",    year: "BE 2Yr", degree: "B.E", sex: "Male",   dayscholarHostler: "Hostler",    category: "General",         course: "ECE",  dateOfReg: new Date("2023-09-05"), dateOfBirth: new Date("2005-05-18"), expiryDate: new Date("2027-05-01"), maxBooksAllowed: 4 },
    { userId: "23ECE006", name: "NANDHINI DEVI T",        email: "nandhini.t@acet.edu",      phone: "9876501006", department: "ELECTRONICS & COMMUNICATIONS",    year: "BE 2Yr", degree: "B.E", sex: "Female", dayscholarHostler: "Dayscholar", category: "SC/ST",           course: "ECE",  dateOfReg: new Date("2023-09-05"), dateOfBirth: new Date("2005-08-25"), expiryDate: new Date("2027-05-01"), maxBooksAllowed: 4 },
    { userId: "23ECE007", name: "VISHNU PRASAD K",        email: "vishnu.k@acet.edu",        phone: "9876501007", department: "ELECTRONICS & COMMUNICATIONS",    year: "BE 2Yr", degree: "B.E", sex: "Male",   dayscholarHostler: "Dayscholar", category: "General",         course: "ECE",  dateOfReg: new Date("2023-09-05"), dateOfBirth: new Date("2005-02-14"), expiryDate: new Date("2027-05-01"), maxBooksAllowed: 4 },

    // ── MECHANICAL DEPARTMENT (BE 2nd Year)
    { userId: "23MECH008", name: "RAJESH KANNAN P",       email: "rajesh.p@acet.edu",        phone: "9876501008", department: "MECHANICAL ENGINEERING",          year: "BE 2Yr", degree: "B.E", sex: "Male",   dayscholarHostler: "Hostler",    category: "OBC",             course: "MECH", dateOfReg: new Date("2023-09-05"), dateOfBirth: new Date("2005-04-10"), expiryDate: new Date("2027-05-01"), maxBooksAllowed: 4 },
    { userId: "23MECH009", name: "DIVYA BHARATHI S",      email: "divya.s@acet.edu",         phone: "9876501009", department: "MECHANICAL ENGINEERING",          year: "BE 2Yr", degree: "B.E", sex: "Female", dayscholarHostler: "Dayscholar", category: "General",         course: "MECH", dateOfReg: new Date("2023-09-05"), dateOfBirth: new Date("2005-06-03"), expiryDate: new Date("2027-05-01"), maxBooksAllowed: 4 },

    // ── CIVIL DEPARTMENT (BE 3rd Year)
    { userId: "22CIVIL010", name: "KARTHIK RAJA N",       email: "karthik.n@acet.edu",       phone: "9876501010", department: "CIVIL ENGINEERING",               year: "BE 3Yr", degree: "B.E", sex: "Male",   dayscholarHostler: "Dayscholar", category: "General",         course: "CIVIL",dateOfReg: new Date("2022-09-06"), dateOfBirth: new Date("2004-09-20"), expiryDate: new Date("2026-05-01"), maxBooksAllowed: 4 },
    { userId: "22CIVIL011", name: "ANITHA KUMARI R",      email: "anitha.r@acet.edu",        phone: "9876501011", department: "CIVIL ENGINEERING",               year: "BE 3Yr", degree: "B.E", sex: "Female", dayscholarHostler: "Hostler",    category: "SC/ST",           course: "CIVIL",dateOfReg: new Date("2022-09-06"), dateOfBirth: new Date("2004-12-07"), expiryDate: new Date("2026-05-01"), maxBooksAllowed: 4 },

    // ── CSE (BE 3rd Year) — from original screenshots
    { userId: "23CSB004",  name: "BURRA ITARABU",         email: "burra@acet.edu",           phone: "9876543210", department: "COMPUTER SCIENCE AND BUSINESS",   year: "BE 3Yr", degree: "B.E", sex: "Male",   dayscholarHostler: "Dayscholar", category: "General",         course: "CSE",  dateOfReg: new Date("2023-09-21"), dateOfBirth: new Date("2004-06-12"), expiryDate: new Date("2027-05-01"), maxBooksAllowed: 4 },
    { userId: "23ECO06",   name: "V KANYA SRAVANTHI",     email: "kanya@acet.edu",           phone: "9765432109", department: "ELECTRONICS & COMMUNICATIONS",    year: "BE 3Yr", degree: "B.E", sex: "Female", dayscholarHostler: "Dayscholar", category: "General",         course: "ECE",  dateOfReg: new Date("2023-09-21"), dateOfBirth: new Date("2004-08-18"), expiryDate: new Date("2027-05-01"), maxBooksAllowed: 4 },
    { userId: "23ME010",   name: "M KRITHIK PAVITHARAN",  email: "krithik@acet.edu",         phone: "9654321098", department: "MECHANICAL ENGINEERING",          year: "BE 3Yr", degree: "B.E", sex: "Male",   dayscholarHostler: "Dayscholar", category: "General",         course: "MECH", dateOfReg: new Date("2023-09-21"), dateOfBirth: new Date("2004-03-25"), expiryDate: new Date("2027-05-01"), maxBooksAllowed: 4 },
    { userId: "23CSB039",  name: "VIJAY GANGA RAM",       email: "vijay@acet.edu",           phone: "9543210987", department: "COMPUTER SCIENCE ENGINEERING",    year: "BE 3Yr", degree: "B.E", sex: "Male",   dayscholarHostler: "Dayscholar", category: "General",         course: "CSE",  dateOfReg: new Date("2023-09-21"), dateOfBirth: new Date("2004-11-05"), expiryDate: new Date("2027-05-01"), maxBooksAllowed: 4 },

    // ── EEE DEPARTMENT (BE 3rd Year)
    { userId: "22EEE012",  name: "SOUNDARYA PRIYA M",     email: "soundarya.m@acet.edu",     phone: "9876501012", department: "ELECTRICAL ENGINEERING",          year: "BE 3Yr", degree: "B.E", sex: "Female", dayscholarHostler: "Dayscholar", category: "OBC",             course: "EEE",  dateOfReg: new Date("2022-09-06"), dateOfBirth: new Date("2004-02-28"), expiryDate: new Date("2026-05-01"), maxBooksAllowed: 4 },
    { userId: "22EEE013",  name: "TAMILARASAN K",         email: "tamil.k@acet.edu",         phone: "9876501013", department: "ELECTRICAL ENGINEERING",          year: "BE 3Yr", degree: "B.E", sex: "Male",   dayscholarHostler: "Hostler",    category: "General",         course: "EEE",  dateOfReg: new Date("2022-09-06"), dateOfBirth: new Date("2004-07-15"), expiryDate: new Date("2026-05-01"), maxBooksAllowed: 4 },

    // ── IT DEPARTMENT (BE 4th Year)
    { userId: "21IT014",   name: "PAVITHRA DEVI C",       email: "pavithra.c@acet.edu",      phone: "9876501014", department: "INFORMATION TECHNOLOGY",          year: "BE 4Yr", degree: "B.E", sex: "Female", dayscholarHostler: "Dayscholar", category: "General",         course: "IT",   dateOfReg: new Date("2021-09-08"), dateOfBirth: new Date("2003-10-12"), expiryDate: new Date("2025-05-01"), maxBooksAllowed: 4 },
    { userId: "21IT015",   name: "ARUN PRAKASH V",        email: "arun.v@acet.edu",          phone: "9876501015", department: "INFORMATION TECHNOLOGY",          year: "BE 4Yr", degree: "B.E", sex: "Male",   dayscholarHostler: "Dayscholar", category: "SC/ST",           course: "IT",   dateOfReg: new Date("2021-09-08"), dateOfBirth: new Date("2003-05-07"), expiryDate: new Date("2025-05-01"), maxBooksAllowed: 4 },
    { userId: "21IT016",   name: "DEEPIKA RANI S",        email: "deepika.s@acet.edu",       phone: "9876501016", department: "INFORMATION TECHNOLOGY",          year: "BE 4Yr", degree: "B.E", sex: "Female", dayscholarHostler: "Hostler",    category: "OBC",             course: "IT",   dateOfReg: new Date("2021-09-08"), dateOfBirth: new Date("2003-01-19"), expiryDate: new Date("2025-05-01"), maxBooksAllowed: 4 },

    // ── MECH (BE 4th Year)
    { userId: "21MECH017", name: "SELVAM RAJA T",         email: "selvam.t@acet.edu",        phone: "9876501017", department: "MECHANICAL ENGINEERING",          year: "BE 4Yr", degree: "B.E", sex: "Male",   dayscholarHostler: "Dayscholar", category: "General",         course: "MECH", dateOfReg: new Date("2021-09-08"), dateOfBirth: new Date("2003-08-30"), expiryDate: new Date("2025-05-01"), maxBooksAllowed: 4 },
    { userId: "21MECH018", name: "GOWRI SHANKAR R",       email: "gowri.r@acet.edu",         phone: "9876501018", department: "MECHANICAL ENGINEERING",          year: "BE 4Yr", degree: "B.E", sex: "Male",   dayscholarHostler: "Hostler",    category: "SC/ST",           course: "MECH", dateOfReg: new Date("2021-09-08"), dateOfBirth: new Date("2003-04-22"), expiryDate: new Date("2025-05-01"), maxBooksAllowed: 4 },

    // ── CSB DEPARTMENT (Various years)
    { userId: "22CSB019",  name: "HARINI PRIYA N",        email: "harini.n@acet.edu",        phone: "9876501019", department: "COMPUTER SCIENCE AND BUSINESS",   year: "BE 3Yr", degree: "B.E", sex: "Female", dayscholarHostler: "Dayscholar", category: "General",         course: "CSB",  dateOfReg: new Date("2022-09-06"), dateOfBirth: new Date("2004-05-09"), expiryDate: new Date("2026-05-01"), maxBooksAllowed: 4 },
    { userId: "22CSB020",  name: "MUTHU KUMAR S",         email: "muthu.s@acet.edu",         phone: "9876501020", department: "COMPUTER SCIENCE AND BUSINESS",   year: "BE 3Yr", degree: "B.E", sex: "Male",   dayscholarHostler: "Hostler",    category: "OBC",             course: "CSB",  dateOfReg: new Date("2022-09-06"), dateOfBirth: new Date("2004-09-14"), expiryDate: new Date("2026-05-01"), maxBooksAllowed: 4 },
    { userId: "24CSB021",  name: "NITHYA SRI K",          email: "nithya.k@acet.edu",        phone: "9876501021", department: "COMPUTER SCIENCE AND BUSINESS",   year: "BE 1Yr", degree: "B.E", sex: "Female", dayscholarHostler: "Dayscholar", category: "General",         course: "CSB",  dateOfReg: new Date("2024-09-02"), dateOfBirth: new Date("2006-06-25"), expiryDate: new Date("2028-05-01"), maxBooksAllowed: 4 },
    { userId: "24CSB022",  name: "SANTHOSH KUMAR G",      email: "santhosh.g@acet.edu",      phone: "9876501022", department: "COMPUTER SCIENCE AND BUSINESS",   year: "BE 1Yr", degree: "B.E", sex: "Male",   dayscholarHostler: "Dayscholar", category: "SC/ST",           course: "CSB",  dateOfReg: new Date("2024-09-02"), dateOfBirth: new Date("2006-02-11"), expiryDate: new Date("2028-05-01"), maxBooksAllowed: 4 },

    // ── CIVIL (BE 4th Year)
    { userId: "21CIVIL023", name: "BHARATHI DASAN M",     email: "bharathi.m@acet.edu",      phone: "9876501023", department: "CIVIL ENGINEERING",               year: "BE 4Yr", degree: "B.E", sex: "Male",   dayscholarHostler: "Dayscholar", category: "General",         course: "CIVIL",dateOfReg: new Date("2021-09-08"), dateOfBirth: new Date("2003-12-03"), expiryDate: new Date("2025-05-01"), maxBooksAllowed: 4 },
    { userId: "21CIVIL024", name: "LAVANYA PRIYA S",      email: "lavanya.s@acet.edu",       phone: "9876501024", department: "CIVIL ENGINEERING",               year: "BE 4Yr", degree: "B.E", sex: "Female", dayscholarHostler: "Hostler",    category: "OBC",             course: "CIVIL",dateOfReg: new Date("2021-09-08"), dateOfBirth: new Date("2003-07-16"), expiryDate: new Date("2025-05-01"), maxBooksAllowed: 4 },

    // ── ME (Post Graduate)
    { userId: "23ME025",   name: "SENTHIL KUMAR A",       email: "senthil.a@acet.edu",       phone: "9876501025", department: "MECHANICAL ENGINEERING",          year: "ME 1Yr", degree: "M.E", sex: "Male",   dayscholarHostler: "Dayscholar", category: "General",         course: "ME",   dateOfReg: new Date("2023-09-21"), dateOfBirth: new Date("2001-03-18"), expiryDate: new Date("2025-05-01"), maxBooksAllowed: 6 },
    { userId: "23ME026",   name: "KAVITHA DEVI P",        email: "kavitha.p@acet.edu",       phone: "9876501026", department: "COMPUTER SCIENCE ENGINEERING",    year: "ME 1Yr", degree: "M.E", sex: "Female", dayscholarHostler: "Dayscholar", category: "SC/ST",           course: "ME",   dateOfReg: new Date("2023-09-21"), dateOfBirth: new Date("2001-08-27"), expiryDate: new Date("2025-05-01"), maxBooksAllowed: 6 },

    // ── EEE (BE 1st Year)
    { userId: "24EEE027",  name: "DINESH KUMAR R",        email: "dinesh.r@acet.edu",        phone: "9876501027", department: "ELECTRICAL ENGINEERING",          year: "BE 1Yr", degree: "B.E", sex: "Male",   dayscholarHostler: "Hostler",    category: "OBC",             course: "EEE",  dateOfReg: new Date("2024-09-02"), dateOfBirth: new Date("2006-04-05"), expiryDate: new Date("2028-05-01"), maxBooksAllowed: 4 },
    { userId: "24EEE028",  name: "RANJITHA SRI M",        email: "ranjitha.m@acet.edu",      phone: "9876501028", department: "ELECTRICAL ENGINEERING",          year: "BE 1Yr", degree: "B.E", sex: "Female", dayscholarHostler: "Dayscholar", category: "General",         course: "EEE",  dateOfReg: new Date("2024-09-02"), dateOfBirth: new Date("2006-10-20"), expiryDate: new Date("2028-05-01"), maxBooksAllowed: 4 },

    // ── IT (BE 2nd Year)
    { userId: "23IT029",   name: "MANIKANDAN S",          email: "mani.s@acet.edu",          phone: "9876501029", department: "INFORMATION TECHNOLOGY",          year: "BE 2Yr", degree: "B.E", sex: "Male",   dayscholarHostler: "Dayscholar", category: "General",         course: "IT",   dateOfReg: new Date("2023-09-05"), dateOfBirth: new Date("2005-01-13"), expiryDate: new Date("2027-05-01"), maxBooksAllowed: 4 },
    { userId: "23IT030",   name: "SWETHA LAKSHMI V",      email: "swetha.v@acet.edu",        phone: "9876501030", department: "INFORMATION TECHNOLOGY",          year: "BE 2Yr", degree: "B.E", sex: "Female", dayscholarHostler: "Hostler",    category: "SC/ST",           course: "IT",   dateOfReg: new Date("2023-09-05"), dateOfBirth: new Date("2005-09-08"), expiryDate: new Date("2027-05-01"), maxBooksAllowed: 4 },

    // ── FACULTY (3 members)
    { userId: "FAC001",    name: "Dr. RAJESHWARI S",      email: "rajeshwari@acet.edu",      phone: "9432109876", department: "COMPUTER SCIENCE AND BUSINESS",   year: "Faculty", degree: "Ph.D", sex: "Female", dayscholarHostler: "Dayscholar", category: "General", course: "Faculty", dateOfReg: new Date("2015-06-01"), expiryDate: new Date("2030-05-01"), maxBooksAllowed: 6 },
    { userId: "FAC002",    name: "Prof. ANAND KUMAR T",   email: "anand.t@acet.edu",         phone: "9432109877", department: "MECHANICAL ENGINEERING",          year: "Faculty", degree: "M.E",  sex: "Male",   dayscholarHostler: "Dayscholar", category: "General", course: "Faculty", dateOfReg: new Date("2018-06-01"), expiryDate: new Date("2030-05-01"), maxBooksAllowed: 6 },
    { userId: "FAC003",    name: "Dr. MEENA KUMARI R",    email: "meena.r@acet.edu",         phone: "9432109878", department: "ELECTRONICS & COMMUNICATIONS",    year: "Faculty", degree: "Ph.D", sex: "Female", dayscholarHostler: "Dayscholar", category: "General", course: "Faculty", dateOfReg: new Date("2017-06-01"), expiryDate: new Date("2030-05-01"), maxBooksAllowed: 6 },
  ]);
  console.log(`✅ ${users.length} users (30 students + 3 faculty)\n`);

  // Print all user IDs for reference
  console.log("📋 ALL USER IDs — Type any of these to auto-fill:");
  console.log("─".repeat(60));
  users.forEach((u, i) => {
    console.log(`  ${String(i+1).padStart(2,"0")}. ${u.userId.padEnd(14)} → ${u.name}`);
  });
  console.log("─".repeat(60));

  // ── 15 BOOKS across all departments ────────────────────────────────────
  const resources = await Resource.insertMany([
    { accessionNo: "4701", callNo: "005.13",  title: "LET US C",                                    authors:{author1:"Yashavant Kanetkar"},          publisher:"BPB Publications",   isbn:"978-8176567909", yearOfPub:2016, pages:675, department:"CSE",   subject:"C Programming",    language:"English", status:"Available", timesIssued:18, resourceType:"Book", price:350, actualPages:675 },
    { accessionNo: "4702", callNo: "005.133", title: "OBJECT ORIENTED PROGRAMMING WITH C++",        authors:{author1:"E Balaguruswamy"},              publisher:"Tata McGraw Hill",   isbn:"978-0070593305", yearOfPub:2011, pages:538, department:"CSE",   subject:"Programming",       language:"English", status:"Available", timesIssued:12, resourceType:"Book", price:425, actualPages:538 },
    { accessionNo: "4703", callNo: "670.285", title: "CAD CAM CONCEPTS AND APPLICATIONS",           authors:{author1:"Alavala Chennakesava R"},       publisher:"PHI Learning",       isbn:"978-8120332393", yearOfPub:2008, pages:339, department:"MECH",  subject:"CAD/CAM",           language:"English", status:"Available", timesIssued:8,  resourceType:"Book", price:350, actualPages:339 },
    { accessionNo: "4704", callNo: "621.381", title: "ELECTRONIC DEVICES AND CIRCUITS",             authors:{author1:"Boylestad",author2:"Nashelsky"},publisher:"Pearson",            isbn:"978-0132622271", yearOfPub:2013, pages:892, department:"ECE",   subject:"Electronics",       language:"English", status:"Available", timesIssued:20, resourceType:"Book", price:580, actualPages:892 },
    { accessionNo: "4705", callNo: "004.678", title: "COMPUTER NETWORKS",                           authors:{author1:"Andrew S. Tanenbaum"},          publisher:"Pearson",            isbn:"978-0132126953", yearOfPub:2011, pages:960, department:"CSE",   subject:"Networks",          language:"English", status:"Available", timesIssued:15, resourceType:"Book", price:620, actualPages:960 },
    { accessionNo: "4706", callNo: "519.5",   title: "PROBABILITY AND STATISTICS",                  authors:{author1:"T Veerarajan"},                 publisher:"Tata McGraw Hill",   isbn:"978-0070700260", yearOfPub:2008, pages:548, department:"MATHS", subject:"Statistics",        language:"English", status:"Available", timesIssued:6,  resourceType:"Book", price:320, actualPages:548 },
    { accessionNo: "4707", callNo: "624.1",   title: "STRENGTH OF MATERIALS",                       authors:{author1:"R K Bansal"},                  publisher:"Laxmi Publications", isbn:"978-8131808146", yearOfPub:2010, pages:1092,department:"CIVIL", subject:"Structural",        language:"English", status:"Available", timesIssued:14, resourceType:"Book", price:480, actualPages:1092},
    { accessionNo: "4708", callNo: "621.3",   title: "BASIC ELECTRICAL ENGINEERING",                authors:{author1:"D C Kulshreshtha"},             publisher:"Tata McGraw Hill",   isbn:"978-0070669116", yearOfPub:2009, pages:612, department:"EEE",   subject:"Electrical",        language:"English", status:"Available", timesIssued:11, resourceType:"Book", price:395, actualPages:612 },
    { accessionNo: "4709", callNo: "005.74",  title: "DATABASE MANAGEMENT SYSTEMS",                 authors:{author1:"Ramez Elmasri",author2:"Shamkant Navathe"}, publisher:"Pearson", isbn:"978-0136086208",yearOfPub:2010, pages:1008,department:"CSE",  subject:"DBMS",              language:"English", status:"Available", timesIssued:22, resourceType:"Book", price:695, actualPages:1008},
    { accessionNo: "4710", callNo: "620.1",   title: "ENGINEERING MECHANICS",                       authors:{author1:"R K Rajput"},                  publisher:"S Chand",            isbn:"978-8121928731", yearOfPub:2012, pages:750, department:"MECH",  subject:"Mechanics",         language:"English", status:"Available", timesIssued:9,  resourceType:"Book", price:375, actualPages:750 },
    { accessionNo: "4711", callNo: "005.1",   title: "SOFTWARE ENGINEERING",                        authors:{author1:"Roger S. Pressman"},            publisher:"Tata McGraw Hill",   isbn:"978-0073375977", yearOfPub:2014, pages:976, department:"IT",    subject:"Software Engg",     language:"English", status:"Available", timesIssued:17, resourceType:"Book", price:710, actualPages:976 },
    { accessionNo: "4712", callNo: "621.39",  title: "DIGITAL ELECTRONICS AND LOGIC DESIGN",       authors:{author1:"M Morris Mano"},               publisher:"Pearson",            isbn:"978-0132054669", yearOfPub:2013, pages:672, department:"ECE",   subject:"Digital Electronics",language:"English", status:"Available", timesIssued:13, resourceType:"Book", price:560, actualPages:672 },
    { accessionNo: "4713", callNo: "624.15",  title: "GEOTECHNICAL ENGINEERING",                    authors:{author1:"Arumugam",author2:"Murugaiyan"},publisher:"Anuradha Agency",    isbn:"978-8187721123", yearOfPub:2011, pages:480, department:"CIVIL", subject:"Geotechnical",      language:"English", status:"Available", timesIssued:5,  resourceType:"Book", price:285, actualPages:480 },
    { accessionNo: "4714", callNo: "658.4",   title: "PRINCIPLES OF MANAGEMENT",                    authors:{author1:"P C Tripathi",author2:"P N Reddy"},publisher:"Tata McGraw Hill",isbn:"978-0070700116",yearOfPub:2012, pages:512, department:"MBA",   subject:"Management",        language:"English", status:"Available", timesIssued:7,  resourceType:"Book", price:310, actualPages:512 },
    { accessionNo: "4715", callNo: "004.165", title: "COMPUTER ORGANIZATION AND ARCHITECTURE",      authors:{author1:"William Stallings"},            publisher:"Pearson",            isbn:"978-0136073734", yearOfPub:2013, pages:792, department:"CSE",   subject:"Computer Org.",     language:"English", status:"Available", timesIssued:10, resourceType:"Book", price:645, actualPages:792 },
  ]);
  console.log(`\n✅ ${resources.length} books across all departments\n`);

  // ── ACTIVE ISSUES (5 students currently have books) ────────────────────
  const findUser = (uid) => users.find(u => u.userId === uid);
  const findBook = (acc) => resources.find(r => r.accessionNo === acc);

  const issueData = [
    { uid:"23CSB039", acc:"4702", issued:"2026-03-10", due:"2026-03-31" },
    { uid:"24CSE001", acc:"4709", issued:"2026-03-05", due:"2026-03-19" },
    { uid:"23ECE005", acc:"4704", issued:"2026-03-08", due:"2026-03-22" },
    { uid:"22CSB019", acc:"4711", issued:"2026-03-01", due:"2026-03-15" },
    { uid:"FAC001",   acc:"4715", issued:"2026-03-12", due:"2026-04-12" },
  ];

  for (const d of issueData) {
    const u = findUser(d.uid);
    const r = findBook(d.acc);
    const due = new Date(d.due);
    const status = due < new Date() ? "Overdue" : "Active";
    await Issue.create({
      resource: r._id, user: u._id,
      accessionNo: r.accessionNo, callNo: r.callNo, resourceTitle: r.title,
      userId: u.userId, userName: u.name, department: u.department,
      dateOfIssue: new Date(d.issued), dateOfReturn: due,
      status, actualPages: r.actualPages, missingPages: "NIL",
    });
    await Resource.findByIdAndUpdate(r._id, { status: "Issued" });
    await User.findByIdAndUpdate(u._id, { $inc: { booksTaken: 1 } });
  }
  console.log(`✅ 5 active issues created\n`);

  // ── OVERDUE + FINE (Krithik from screenshot) ───────────────────────────
  const uKrithik = findUser("23ME010");
  const rCadCam  = findBook("4703");
  const overdueIssue = await Issue.create({
    resource: rCadCam._id, user: uKrithik._id,
    accessionNo: "4703", callNo: "670.285", resourceTitle: rCadCam.title,
    userId: "23ME010", userName: "M KRITHIK PAVITHARAN", department: "MECHANICAL ENGINEERING",
    dateOfIssue: new Date("2025-11-10"), dateOfReturn: new Date("2025-11-27"),
    dateOfActReturn: new Date("2026-03-10"), status: "Returned",
    actualPages: 339, missingPages: "NIL",
  });
  await Fine.create({
    issue: overdueIssue._id, user: uKrithik._id, resource: rCadCam._id,
    userId: "23ME010", userName: "M KRITHIK PAVITHARAN",
    resourceTitle: rCadCam.title, accessionNo: "4703",
    fineDays: 103, fineAmount: 515, status: "Unpaid",
    actualPages: 339, missingPages: "NIL",
  });
  console.log(`✅ 1 overdue fine record\n`);

  // ── GATE ENTRIES (today) ───────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const ago   = (m) => new Date(Date.now() - m * 60000);
  const gateUsers = [
    { uid:"23CSB004",  purpose:"Study",       mins:52,  out:10  },
    { uid:"23ECO06",   purpose:"Book Issue",  mins:38,  out:null},
    { uid:"FAC001",    purpose:"Reference",   mins:125, out:null},
    { uid:"23ME010",   purpose:"Study",       mins:85,  out:20  },
    { uid:"23CSB039",  purpose:"Assignment",  mins:45,  out:null},
    { uid:"24CSE001",  purpose:"Study",       mins:30,  out:15  },
    { uid:"23ECE006",  purpose:"Research",    mins:60,  out:null},
    { uid:"22CIVIL010",purpose:"Project",     mins:72,  out:25  },
    { uid:"FAC002",    purpose:"Cataloguing", mins:90,  out:null},
    { uid:"24CSB021",  purpose:"Study",       mins:18,  out:8   },
  ];
  const gateEntries = gateUsers.map(g => {
    const u = findUser(g.uid);
    const isFac = u.year === "Faculty";
    return {
      user: u._id, userId: u.userId, userName: u.name,
      department: u.department, degree: u.degree || u.year,
      userType: isFac ? "Faculty" : "Student",
      dayscholar: u.dayscholarHostler,
      loginDate: today,
      loginTime: ago(g.mins),
      logoutTime: g.out ? ago(g.out) : null,
      status: g.out ? "Exited" : "Inside",
      duration: g.out ? (g.mins - g.out) : null,
      purpose: g.purpose,
    };
  });
  await Gate.insertMany(gateEntries);
  console.log(`✅ ${gateEntries.length} gate entries for today\n`);

  // ── SUMMARY ────────────────────────────────────────────────────────────
  console.log("═".repeat(60));
  console.log("🎉 SEED COMPLETE — LibraryOS v4");
  console.log("═".repeat(60));
  console.log("  Login      : admin@acet.edu / admin123");
  console.log("  Students   : 30");
  console.log("  Faculty    : 3");
  console.log("  Books      : 15");
  console.log("  Issues     : 5 active + 1 returned overdue");
  console.log("  Gate Today : 10 entries");
  console.log("─".repeat(60));
  console.log("\n📋 QUICK REFERENCE — User IDs to test auto-fill:");
  console.log("  Gate Register / Issue / Return → type any ID below:");
  console.log("  23CSB039  →  VIJAY GANGA RAM       (CSE 3rd yr)");
  console.log("  23ME010   →  M KRITHIK PAVITHARAN  (MECH 3rd yr)");
  console.log("  24CSE001  →  ARJUN KUMAR S          (CSE 1st yr)");
  console.log("  23ECE005  →  SURESH BABU M          (ECE 2nd yr)");
  console.log("  22CIVIL010→  KARTHIK RAJA N         (CIVIL 3rd yr)");
  console.log("  FAC001    →  Dr. RAJESHWARI S       (Faculty)");
  console.log("  FAC002    →  Prof. ANAND KUMAR T    (Faculty)");
  console.log("═".repeat(60));

  process.exit(0);
};

seed().catch(e => { console.error("❌ Seed failed:", e.message); process.exit(1); });