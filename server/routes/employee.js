const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Employee = require("../models/Employee");

// Add new employee
router.post("/", async (req, res) => {
  try {
    const newEmployee = new Employee(req.body);
    await newEmployee.save();
    res.status(201).json(newEmployee);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all employees
router.get("/", async (req, res) => {
  try {
    const employees = await Employee.find();
    res.status(200).json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get employee by ID
router.get("/:id", async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (employee == null) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.status(200).json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update employee
router.put("/:id", async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (employee == null) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.status(200).json(employee);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/attendance/update", async (req, res) => {
  const attendanceUpdates = req.body; // Array of { id, date, present, overtimeHours }

  try {
    for (const update of attendanceUpdates) {
      const employee = await Employee.findById(update.id);
      if (employee) {
        // Check if an entry for the given date already exists
        const existingEntryIndex = employee.attendance.findIndex(
          (entry) => entry.date === update.date
        );

        if (existingEntryIndex !== -1) {
          // Update existing entry
          const existingEntry = employee.attendance[existingEntryIndex];
          if (existingEntry.present !== update.present) {
            if (update.present) {
              employee.totalPresent += 1;
              employee.totalAbsent -= 1;
            } else {
              employee.totalPresent -= 1;
              employee.totalAbsent += 1;
            }
          }
          existingEntry.present = update.present;
          existingEntry.absence = !update.present; // absence is the inverse of present
          existingEntry.overtimeHours = update.overtimeHours || 0; // update overtime hours
        } else {
          // Add new entry
          const attendanceEntry = {
            date: update.date,
            present: update.present,
            absence: !update.present, // absence is the inverse of present
            overtimeHours: update.overtimeHours || 0, // add overtime hours
          };
          employee.attendance.push(attendanceEntry);

          if (update.present) {
            employee.totalPresent += 1;
          } else {
            employee.totalAbsent += 1;
          }
        }

        await employee.save();
      }
    }

    res.status(200).json({
      message: "Attendance and overtime updated for multiple employees",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get attendance for a specific date
router.get("/attendance/:date", async (req, res) => {
  const date = req.params.date;

  try {
    const employees = await Employee.find();
    const attendanceData = employees.map((employee) => {
      const attendanceEntry = employee.attendance.find(
        (entry) => entry.date === date
      );
      return {
        _id: employee._id,
        name: employee.name,
        present: attendanceEntry ? attendanceEntry.present : false,
        absence: attendanceEntry ? attendanceEntry.absence : false,
        overtimeHours: attendanceEntry ? attendanceEntry.overtimeHours : 0,
        date: date,
      };
    });

    res.status(200).json(attendanceData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update salary details
router.put("/:id/salaryDetails", async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (employee == null) {
      return res.status(404).json({ message: "Employee not found" });
    }

    employee.salaryDetails.push(req.body);
    await employee.save();
    res.status(200).json(employee);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete employee
router.delete("/:id", async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (employee == null) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.status(200).json({ message: "Employee deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// update advance

router.put("/:id/advance", async (req, res) => {
  const { advance, date, month, operation } = req.body;
  const employeeId = req.params.id;

  try {
    const employee = await Employee.findById(employeeId);

    // Find the advance for the specified date
    const advanceIndex = employee.advance.findIndex(
      (entry) => entry.date === date
    );
    if (advanceIndex === -1) {
      // If there's no advance for the selected date, create one
      employee.advance.push({
        date,
        amount: operation === "add" ? advance : -advance,
      });
    } else {
      // Update the existing advance for the selected date
      if (operation === "add") {
        employee.advance[advanceIndex].amount += advance;
      } else if (operation === "subtract") {
        employee.advance[advanceIndex].amount -= advance;
      }
    }

    await employee.save();
    res.status(200).json({ message: "Advance updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error updating advance", error });
  }
});

// Get advance history for an employee for the selected month
router.get("/:id/advance/history/:month", async (req, res) => {
  try {
    const { id, month } = req.params;
    const employee = await Employee.findById(id).select("advanceHistory");
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Filter advance history by month
    const filteredHistory = employee.advanceHistory.filter(
      (entry) => entry.month === month
    );

    res.status(200).json(filteredHistory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/details/:yearMonth", async (req, res) => {
  const [year, month] = req.params.yearMonth.split("-");

  try {
    const employees = await Employee.find();
    const details = employees.map((employee) => {
      const totalPresent = employee.attendance.filter(
        (entry) =>
          new Date(entry.date).getFullYear() === parseInt(year) &&
          new Date(entry.date).getMonth() + 1 === parseInt(month) &&
          entry.present
      ).length;
      const totalAbsent = employee.attendance.filter(
        (entry) =>
          new Date(entry.date).getFullYear() === parseInt(year) &&
          new Date(entry.date).getMonth() + 1 === parseInt(month) &&
          entry.absence
      ).length;

      const advancesForMonth = employee.advance.filter(
        (entry) =>
          new Date(entry.date).getFullYear() === parseInt(year) &&
          new Date(entry.date).getMonth() + 1 === parseInt(month)
      );

      // Calculate total overtime hours for the specified month
      const totalOvertimeHours = employee.attendance
        .filter(
          (entry) =>
            new Date(entry.date).getFullYear() === parseInt(year) &&
            new Date(entry.date).getMonth() + 1 === parseInt(month) &&
            entry.present // Only consider days the employee was present
        )
        .reduce((sum, entry) => sum + (entry.overtimeHours || 0), 0);

      return {
        _id: employee._id,
        name: employee.name,
        position: employee.position,
        monthlySalary: employee.monthlySalary,
        totalPresent,
        totalAbsent,
        advances: advancesForMonth,
        salaryDetails: employee.salaryDetails.filter(
          (detail) =>
            new Date(detail.date).getFullYear() === parseInt(year) &&
            new Date(detail.date).getMonth() + 1 === parseInt(month)
        ),
        totalOvertimeHours, // Include total overtime hours for the month
      };
    });

    res.status(200).json(details);
  } catch (error) {
    console.error("Error fetching employee details:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
