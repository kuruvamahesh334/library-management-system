const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

// ─── ADMIN ───────────────────────────────────────────────────────────────────
const adminSchema = new mongoose.Schema({
  username:     { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role:         { type: String, enum: ["admin","librarian"], default: "admin" },
  lastLogin:    { type: Date },
}, { timestamps: true });

adminSchema.pre("save", async function(next) {
  if (!this.isModified("passwordHash")) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
  next();
});
adminSchema.methods.comparePassword = function(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

// ─── USER (Student/Faculty/Staff) ────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  userId:         { type: String, required: true, unique: true, trim: true, uppercase: true },
  name:           { type: String, required: true, trim: true },
  photo:          { type: String, default: null }, // filename in uploads/
  permAddress: {
    line1:   { type: String, trim: true },
    line2:   { type: String, trim: true },
    city:    { type: String, trim: true },
    pincode: { type: String, trim: true },
  },
  tempAddress: {
    line1:   { type: String, trim: true },
    line2:   { type: String, trim: true },
    city:    { type: String, trim: true },
    pincode: { type: String, trim: true },
  },
  phone:           { type: String, trim: true, match: [/^\d{10}$/, "Phone must be 10 digits"] },
  email:           { type: String, required: true, unique: true, lowercase: true, trim: true },
  dateOfReg:       { type: Date, default: Date.now },
  dateOfBirth:     { type: Date },
  sex:             { type: String, enum: ["Male","Female","Other"] },
  dayscholarHostler: { type: String, enum: ["Dayscholar","Hostler"], default: "Dayscholar" },
  department:      { type: String, required: true, trim: true },
  category:        { type: String, enum: ["General","SC/ST","Special Category","OBC"], default: "General" },
  course:          { type: String, trim: true },
  year:            { type: String, enum: ["BE 1Yr","BE 2Yr","BE 3Yr","BE 4Yr","ME 1Yr","ME 2Yr","PhD","Faculty","Staff"], default: "BE 1Yr" },
  degree:          { type: String, trim: true, default: "B.E" },
  expiryDate:      { type: Date },
  status:          { type: String, enum: ["Active","Blocked","Expired"], default: "Active" },
  booksTaken:      { type: Number, default: 0 },
  maxBooksAllowed: { type: Number, default: 4 },
  fineBalance:     { type: Number, default: 0 },
}, { timestamps: true });

userSchema.index({ userId: 1 });
userSchema.index({ name: "text", email: "text" });

// ─── RESOURCE MASTER (Books, Journals, Back Volumes, Projects) ───────────────
const resourceSchema = new mongoose.Schema({
  accessionNo:   { type: String, required: true, unique: true, trim: true },
  callNo:        { type: String, trim: true },
  resourceType:  { type: String, enum: ["Book","Journal","Back Volume","Project"], default: "Book" },
  title:         { type: String, required: true, trim: true },
  subTitle:      { type: String, trim: true },
  authors: {
    author1: { type: String, trim: true },
    author2: { type: String, trim: true },
    author3: { type: String, trim: true },
  },
  series:        { type: String, trim: true },
  yearOfPub:     { type: Number },
  pages:         { type: Number },
  department:    { type: String, trim: true },
  subject:       { type: String, trim: true },
  subjectHeader: { type: String, trim: true },
  location:      { type: String, trim: true },
  language:      { type: String, default: "English", trim: true },
  publisher:     { type: String, trim: true },
  vendor:        { type: String, trim: true },
  keyword:       { type: String, trim: true },
  price:         { type: Number, default: 0 },
  isCurrency:    { type: Boolean, default: false },
  isDiscount:    { type: Boolean, default: false },
  purchaseDate:  { type: Date },
  editionDetail: { type: String, trim: true },
  isbn:          { type: String, trim: true },
  notes:         { type: String, trim: true },
  status:        { type: String, enum: ["Available","Issued","Reserved","Lost","Discarded"], default: "Available" },
  timesIssued:   { type: Number, default: 0 },
  actualPages:   { type: Number },
  condition:     { type: String, enum: ["Good","Fair","Poor"], default: "Good" },
}, { timestamps: true });

resourceSchema.index({ accessionNo: 1 });
resourceSchema.index({ title: "text", authors: "text", isbn: "text", keyword: "text" });

// ─── ISSUE ────────────────────────────────────────────────────────────────────
const issueSchema = new mongoose.Schema({
  resource:       { type: mongoose.Schema.Types.ObjectId, ref: "Resource", required: true },
  user:           { type: mongoose.Schema.Types.ObjectId, ref: "User",     required: true },
  accessionNo:    { type: String },
  callNo:         { type: String },
  resourceTitle:  { type: String },
  userId:         { type: String },
  userName:       { type: String },
  department:     { type: String },
  dateOfIssue:    { type: Date, default: Date.now },
  dateOfReturn:   { type: Date, required: true },
  dateOfActReturn:{ type: Date, default: null },
  actualPages:    { type: Number },
  missingPages:   { type: String, default: "NIL" },
  status:         { type: String, enum: ["Active","Returned","Overdue","Lost"], default: "Active" },
  issuedByAdmin:  { type: String },
  returnedByAdmin:{ type: String },
  emailSentIssue: { type: Boolean, default: false },
  emailSentReminder3: { type: Boolean, default: false },
  emailSentDueDay:    { type: Boolean, default: false },
  emailSentOverdue:   { type: Date,    default: null },
}, { timestamps: true });

issueSchema.virtual("overdueDays").get(function() {
  const ref = this.dateOfActReturn || new Date();
  if (this.status === "Returned" && !this.dateOfActReturn) return 0;
  const diff = Math.floor((ref - this.dateOfReturn) / 86400000);
  return diff > 0 ? diff : 0;
});

// ─── FINE ────────────────────────────────────────────────────────────────────
const fineSchema = new mongoose.Schema({
  issue:          { type: mongoose.Schema.Types.ObjectId, ref: "Issue",    required: true },
  user:           { type: mongoose.Schema.Types.ObjectId, ref: "User",     required: true },
  resource:       { type: mongoose.Schema.Types.ObjectId, ref: "Resource" },
  userId:         { type: String },
  userName:       { type: String },
  resourceTitle:  { type: String },
  accessionNo:    { type: String },
  fineDays:       { type: Number, required: true },
  fineAmount:     { type: Number, required: true },
  reservedStatus: { type: Boolean, default: false },
  missingPages:   { type: String, default: "NIL" },
  actualPages:    { type: Number },
  status:         { type: String, enum: ["Unpaid","Paid","Waived"], default: "Unpaid" },
  paidDate:       { type: Date },
  paidAmount:     { type: Number },
  notes:          { type: String },
}, { timestamps: true });

// ─── GATE REGISTER ───────────────────────────────────────────────────────────
const gateSchema = new mongoose.Schema({
  user:         { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  userId:       { type: String, required: true },
  userName:     { type: String, required: true },
  department:   { type: String },
  degree:       { type: String },
  photo:        { type: String },
  userType:     { type: String, enum: ["Student","Staff","Faculty"], default: "Student" },
  dayscholar:   { type: String },
  loginDate:    { type: String },  // YYYY-MM-DD
  loginTime:    { type: Date, default: Date.now },
  logoutTime:   { type: Date, default: null },
  duration:     { type: Number, default: null }, // minutes
  status:       { type: String, enum: ["Inside","Exited"], default: "Inside" },
  purpose:      { type: String, enum: ["Study","Book Issue","Reference","Research","Cataloguing","Assignment","Project","Other"], default: "Study" },
  remarks:      { type: String, trim: true },
}, { timestamps: true });

gateSchema.pre("save", function(next) {
  if (!this.loginDate) this.loginDate = new Date(this.loginTime).toISOString().slice(0, 10);
  if (this.logoutTime && this.loginTime) {
    this.duration = Math.round((new Date(this.logoutTime) - new Date(this.loginTime)) / 60000);
    this.status = "Exited";
  }
  next();
});

gateSchema.index({ loginDate: 1 });
gateSchema.index({ userId: 1 });

// ─── EMAIL LOG ───────────────────────────────────────────────────────────────
const emailLogSchema = new mongoose.Schema({
  to:        { type: String, required: true },
  subject:   { type: String },
  type:      { type: String, enum: ["issue_confirm","due_reminder","overdue_alert","return_receipt","test"] },
  issueId:   { type: mongoose.Schema.Types.ObjectId, ref: "Issue" },
  userId:    { type: String },
  status:    { type: String, enum: ["sent","failed"], default: "sent" },
  error:     { type: String },
}, { timestamps: true });

module.exports = {
  Admin:    mongoose.model("Admin",    adminSchema),
  User:     mongoose.model("User",     userSchema),
  Resource: mongoose.model("Resource", resourceSchema),
  Issue:    mongoose.model("Issue",    issueSchema),
  Fine:     mongoose.model("Fine",     fineSchema),
  Gate:     mongoose.model("Gate",     gateSchema),
  EmailLog: mongoose.model("EmailLog", emailLogSchema),
};
