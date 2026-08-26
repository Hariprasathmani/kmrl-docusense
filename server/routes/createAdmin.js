const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User"); // adjust path if needed

mongoose.connect("mongodb://127.0.0.1:27017/kmrl");

async function createAdmin() {
    const existing = await User.findOne({ email: "hariprasathmani102@gmail.com" });

    if (existing) {
        console.log("Admin already exists.");
        process.exit();
    }

    const hashedPassword = await bcrypt.hash("Admin@123", 10);

    const admin = new User({
        name: "Hari Prasath Mani",
        email: "hariprasathmani102@gmail.com",
        password: hashedPassword,
        role: "Admin",
        // Admins have no scoped department — full access is granted via role.
        status: "Active"
    });

    await admin.save();
    console.log("Admin created successfully.");
    process.exit();
}

createAdmin();