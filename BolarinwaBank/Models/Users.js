import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    dateOfBirth: {
      type: Date,
      required: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

    // KYC method used by the customer
    kycType: {
      type: String,
      enum: ["BVN", "NIN"],
      required: true,
    },

    // Customer's BVN
    bvn: {
      type: String,
      unique: true,
      sparse: true,
      select: false,
    },

    // Customer's NIN
    nin: {
      type: String,
      unique: true,
      sparse: true,
      select: false,
    },

    // Indicates successful BVN/NIN verification
    isVerified: {
      type: Boolean,
      default: false,
    },

    // Indicates completed onboarding
    isOnboarded: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// ======================================
// HASH PASSWORD BEFORE SAVING
// ======================================

userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);

  this.password = await bcrypt.hash(
    this.password,
    salt
  );
});

// ======================================
// COMPARE PASSWORD
// ======================================

userSchema.methods.comparePassword = async function (
  enteredPassword
) {
  return bcrypt.compare(
    enteredPassword,
    this.password
  );
};

const User = mongoose.model("User", userSchema);

export default User;