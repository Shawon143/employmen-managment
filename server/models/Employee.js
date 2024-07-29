const mongoose = require("mongoose");

const EmployeeSchema = new mongoose.Schema({
  name: String,
  position: String,
  number: String,
  address: String,
  monthlySalary: Number,
  advance: [
    {
      date: String, // Use "YYYY-MM-DD" format for date
      amount: Number,
    },
  ],
  attendance: [
    {
      date: String,
      present: Boolean,
      absence: Boolean,
      overtimeHours: Number,
    },
  ],

  totalOvertimeHours: { type: Number, default: 0 },
  totalPresent: { type: Number, default: 0 },
  totalAbsent: { type: Number, default: 0 },
  salaryDetails: [
    {
      date: String,
      salaryByPresent: Number,
      overtimeRatePerHour: Number,
      overtimeHours: Number,
      earningsByOvertimeHours: Number,
      advance: Number,
      totalEarnings: Number,
    },
  ],
});

module.exports = mongoose.model("Employee", EmployeeSchema);
