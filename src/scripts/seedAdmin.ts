import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

import { User } from "../models/User";
import { GlobalRole } from "../types/enums";

const adminSeedData = {
  fname: "Admin",
  email: "vatsalp04sp@gmail.com",
  password: "V@tsal04",
  globalRole: GlobalRole.ADMIN,
  projectAssignments: [],
  isDeleted: false,
  createdBy: new mongoose.Types.ObjectId(),
};

const seedAdmin = async (): Promise<void> => {
  try {
    const mongouri = 'mongodb+srv://stopn4199_db_user:8hd4R7Sv9A7AxQ9Z@cluster0.zf7vmpi.mongodb.net/?appName=Cluster0'
    await mongoose.connect(mongouri)
    console.log('📦 Connected from MongoDB')

    const existingAdmin = await User.findOne({
        $or: [
            {email: adminSeedData.email}
        ]
    })

    if(existingAdmin) {
        console.log('✅ Admin already exists')
        await mongoose.disconnect()
        return
    }

    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(adminSeedData.password, saltRounds)

    const adminUser = new User({
        ...adminSeedData,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date()
    })

    await adminUser.save()
    console.log('✅ Admin user created successfully')
    console.log(`Email: ${adminSeedData.email}`)
    console.log(`Password: ${adminSeedData.password}`)


  } catch (error) {
    console.error("❌ Error seeding admin:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("📦 Disconnected from MongoDB");
  }
};

if(require.main === module) {
    seedAdmin()
}

export { seedAdmin }
