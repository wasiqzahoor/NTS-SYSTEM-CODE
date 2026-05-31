const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Read .env.local file properly
function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    console.log("📁 Looking for .env.local at:", envPath);

    if (!fs.existsSync(envPath)) {
      console.log("❌ .env.local file not found!");
      return false;
    }

    const envContent = fs.readFileSync(envPath, "utf-8");
    console.log("✅ .env.local found, loading variables...");

    envContent.split("\n").forEach((line) => {
      // Skip empty lines and comments
      line = line.trim();
      if (!line || line.startsWith("#")) return;

      const equalIndex = line.indexOf("=");
      if (equalIndex > 0) {
        const key = line.substring(0, equalIndex).trim();
        let value = line.substring(equalIndex + 1).trim();

        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        process.env[key] = value;
        if (key === "MONGODB_URI") {
          console.log("✅ MONGODB_URI loaded successfully");
        }
      }
    });
    return true;
  } catch (error) {
    console.error("❌ Error reading .env.local:", error.message);
    return false;
  }
}

// Load environment variables
const loaded = loadEnv();

async function seedAdmin() {
  let MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    console.error("");
    console.error("❌ MONGODB_URI not found!");
    console.error("");
    console.log("📝 Please check your .env.local file contains:");
    console.log("   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/nts-management");
    console.log("");
    console.log("📁 Current folder:", process.cwd());
    console.log("📄 Files in current folder:");
    try {
      const files = fs.readdirSync(process.cwd());
      files.forEach(f => console.log("   -", f));
    } catch(e) {}
    process.exit(1);
  }

  // Fix MongoDB URI - add database name if missing
  if (!MONGODB_URI.includes("/nts-management")) {
    MONGODB_URI = MONGODB_URI.replace("/?", "/nts-management?");
  }

  try {
    console.log("");
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Define User Schema
    const UserSchema = new mongoose.Schema({
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      role: { type: String, enum: ["super_admin", "manager", "staff"], required: true },
      avatar: { type: String, default: "" },
      phone: { type: String, default: "" },
      department: { type: String, default: "" },
      managerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      isActive: { type: Boolean, default: true },
    }, { timestamps: true });

    const User = mongoose.models.User || mongoose.model("User", UserSchema);

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: "admin@nts.com" });
    if (existingAdmin) {
      console.log("");
      console.log("═══════════════════════════════════════");
      console.log("  ⚠️  ADMIN ALREADY EXISTS!");
      console.log("═══════════════════════════════════════");
      console.log("  📧 Email:    admin@nts.com");
      console.log("  🔑 Password: admin123");
      console.log("═══════════════════════════════════════");
      process.exit(0);
    }

    // Create admin
    const hashedPassword = await bcrypt.hash("admin123", 12);
    const admin = await User.create({
      name: "Super Admin",
      email: "admin@nts.com",
      password: hashedPassword,
      role: "super_admin",
      isActive: true,
    });

    console.log("");
    console.log("═══════════════════════════════════════");
    console.log("  ✅ SUPER ADMIN CREATED!");
    console.log("═══════════════════════════════════════");
    console.log("  📧 Email:    admin@nts.com");
    console.log("  🔑 Password: admin123");
    console.log("  👤 Role:     Super Admin");
    console.log("═══════════════════════════════════════");
    console.log("");
    console.log("👉 Go to http://localhost:3000/login");

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.log("");
    console.log("💡 Possible fixes:");
    console.log("   1. Check your MongoDB URI in .env.local");
    console.log("   2. Make sure IP whitelist allows your connection");
    console.log("   3. Check if password has special characters");
  } finally {
    await mongoose.disconnect();
  }
}

seedAdmin();
