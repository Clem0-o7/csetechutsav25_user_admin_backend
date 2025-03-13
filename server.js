const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const createCSVWriter = require("csv-writer").createObjectCsvWriter;
const { requireAuth } = require("./middleware/auth");
const User = require("./models/User");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const nodemailer = require("nodemailer");
const { BlobServiceClient } = require('@azure/storage-blob');
//const { getBlobSasUrl } = require("./lib/SASURL");
require("dotenv").config();


const app = express();

app.use(express.json());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN,
    credentials: true,
    exposedHeaders: ["set-cookie"],
  })
);
app.use(cookieParser());

const maxAge = 3 * 24 * 60 * 60;

const createToken = (user, department) => {
  return jwt.sign({ user, department }, process.env.SECRET_KEY, { expiresIn: maxAge });
};

// Setup Brevo transporter
const transporter = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_HOST,
  port: Number(process.env.BREVO_SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS,
  },
});

// Function to send emails via Brevo
const sendEmail = async (recipient, subject, htmlContent) => {
  const mailOptions = {
    from: `"${process.env.BREVO_SENDER_NAME}" <${process.env.BREVO_SENDER_EMAIL}>`,
    to: recipient,
    subject: subject,
    html: htmlContent,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: %s", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error };
  }
};



// Login endpoint with department-specific access
app.post("/", (req, res) => {
  const { username, password } = req.body;
  
  // Super admin login
  if (username === process.env.SUPER_ADMIN_USERNAME && password === process.env.SUPER_ADMIN_PASSWORD) {
    const token = createToken("super_admin", "all");
    res.cookie("auth_token", token, {
      maxAge: maxAge * 1000,
      httpOnly: true,
      sameSite: "none",
      secure: true,
    });
    res.status(200).json({ msg: "success", user: "super_admin", department: "all" });
  } 
  // Department admin logins
  else if (username === process.env.CSE_ADMIN_USERNAME && password === process.env.CSE_ADMIN_PASSWORD) {
    const token = createToken("department_admin", "CSE");
    res.cookie("auth_token", token, {
      maxAge: maxAge * 1000,
      httpOnly: true,
      sameSite: "none",
      secure: true,
    });
    res.status(200).json({ msg: "success", user: "department_admin", department: "CSE" });
  }
  else if (username === process.env.IT_ADMIN_USERNAME && password === process.env.IT_ADMIN_PASSWORD) {
    const token = createToken("department_admin", "IT");
    res.cookie("auth_token", token, {
      maxAge: maxAge * 1000,
      httpOnly: true,
      sameSite: "none",
      secure: true,
    });
    res.status(200).json({ msg: "success", user: "department_admin", department: "IT" });
  }
  else if (username === process.env.CSBS_ADMIN_USERNAME && password === process.env.CSBS_ADMIN_PASSWORD) {
    const token = createToken("department_admin", "CSBS");
    res.cookie("auth_token", token, {
      maxAge: maxAge * 1000,
      httpOnly: true,
      sameSite: "none",
      secure: true,
    });
    res.status(200).json({ msg: "success", user: "department_admin", department: "CSBS" });
  }
  else if (username === process.env.DS_ADMIN_USERNAME && password === process.env.DS_ADMIN_PASSWORD) {
    const token = createToken("department_admin", "DS");
    res.cookie("auth_token", token, {
      maxAge: maxAge * 1000,
      httpOnly: true,
      sameSite: "none",
      secure: true,
    });
    res.status(200).json({ msg: "success", user: "department_admin", department: "DS" });
  }
  else {
    res.status(400).json({ msg: "Invalid credentials" });
  }
});

// Get data endpoint with department filtering
app.get("/getData", requireAuth, (req, res) => {
  // Get department from JWT token
  const department = req.user.department;
  
  let query = {};
  // If department is specified and not 'all', filter by department
  if (department && department !== 'all') {
    query = { selectedDepartment: department };
  }
  
  User.find(query)
    .then((result) => {
      res.status(200).json(result);
    })
    .catch((err) => {
      console.error("Error fetching data:", err); // Add detailed error logging
      res.status(500).json({ msg: "Error fetching data", error: err.message }); // Return detailed error message
    });
});

// Endpoint to get payment screenshot SAS URL from Azure Blob Storage
app.get("/getPaymentImage/:id", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || !user.transactionScreenshot) {
      return res.status(404).json({ msg: "Image not found" });
    }
    
    // Return the direct URL instead of generating a SAS token
    const imageUrl = user.transactionScreenshot;
    
    res.status(200).json({ imageUrl });
  } catch (err) {
    console.error("Error retrieving payment image:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Update payment status endpoint
app.put("/update", requireAuth, async (req, res) => {
  const { _id, paid, fullName, email, transactionNumber } = req.body;
  
  try {
    await User.updateOne(
      { _id: _id },
      { paid: paid, transactionNumber: paid ? transactionNumber : "" }
    );
    
    // Create email content based on payment status
    const subject = paid 
      ? "Techutsav25 -Panorama - Payment Verification Successful" 
      : "Techutsav25 -Panorama - Payment Verification Failed";
    
    const htmlContent = paid
      ? `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #4CAF50;">Payment Successfully Verified!</h2>
          <p>Dear ${fullName},</p>
          <p>Your payment has been successfully verified by the Administrator.</p>
          <p>Our Team is very eager to meet you up in the event. Wish you have a safe journey.</p>
          <p>If you have any questions, please don't hesitate to contact us.</p>
          <p>Regards,<br>Team Techutsav25 -Panorama</p>
        </div>`
      : `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #F44336;">Payment Verification Failed</h2>
          <p>Dear ${fullName},</p>
          <p>Your payment transaction address is not matched. Please check the transaction ID of your payment and try once again.</p>
          <p>If you need any assistance, please contact our support team.</p>
          <p>Thank you.</p>
          <p>Regards,<br>Team Techutsav25 -Panorama</p>
        </div>`;
    
    // Send email notification using Brevo
    const emailResult = await sendEmail(email, subject, htmlContent);
    if (!emailResult.success) {
      return res.status(400).json({ msg: "Email sending failed", error: emailResult.error });
    }
    
    res.status(200).json({ msg: "Success", emailId: emailResult.messageId });
  } catch (err) {
    console.error(err);
    res.status(400).json({ msg: "Error updating record" });
  }
});

const studentData = [
  { id: "sno", title: "S No" },
  { id: "email", title: "Email" },
  { id: "fullName", title: "Full Name" },
  { id: "phoneNumber", title: "Phone" },
  { id: "collegeName", title: "College Name" },
  { id: "department", title: "Department" },
  { id: "paid", title: "Paid" },
  { id: "transactionNumber", title: "Transaction Number" },
  { id: "selectedDepartment", title: "Selected Department" },
];

const fileUrl = "./files/userData.csv";

const csvWriter = createCSVWriter({
  path: fileUrl,
  header: studentData,
});

// Download data endpoint with department filtering
app.get("/downloadData", requireAuth, async (req, res) => {
  // Get department from JWT token
  const department = req.user.department;
  
  try {
    // Remove existing CSV file if it exists
    try {
      fs.unlinkSync(fileUrl);
    } catch (err) {
      console.log("File Not Found!");
    }

    let query = {};
    // If department is specified and not 'all', filter by department
    if (department && department !== 'all') {
      query = { selectedDepartment: department };
    }
    
    const data = await User.find(query);
    const newList = data.map(
      (
        {
          email,
          fullName,
          phoneNumber,
          collegeName,
          department,
          paid,
          transactionNumber,
          selectedDepartment,
          ...row
        },
        index
      ) => ({
        sno: index + 1,
        email,
        fullName,
        phoneNumber,
        collegeName,
        department,
        paid: paid ? "Yes" : "No",
        transactionNumber,
        selectedDepartment,
      })
    );
    
    await csvWriter.writeRecords(newList);
    res.status(200).download(fileUrl);
  } catch (err) {
    console.error(err);
    res.status(400).json({ msg: "Error downloading data" });
  }
});


mongoose
  .connect(process.env.DB_URL)
  .then(() => {
    console.log("DB CONNECTION SUCCESSFUL");
    app.listen(process.env.PORT, () => {
      console.log("Server Started in PORT: " + process.env.PORT);
    });
  })
  .catch((err) => {
    console.log(err);
  });