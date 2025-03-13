const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  verified: { type: Boolean, default: false },
  fullName: { type: String, required: true, minLength: 2 },
  phoneNumber: { type: String, required: true, minLength: 10, maxLength: 10 },
  collegeName: { type: String, required: true, minLength: 2 },
  department: { type: String, required: true, minLength: 2 },
  paid: { type: Boolean, default: false },
  transactionNumber: { type: String, default: "" },
  transactionScreenshot: { type: String, default: "" },
  password: { type: String, required: true, minLength: 6 },
  selectedDepartment: { type: String, default: "" },
  emailOTP: { type: String },
  emailOTPExpires: { type: Date },
});

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
