import mongoose from "mongoose";

const accountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    accountNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    accountName: {
      type: String,
      required: true,
    },

    balance: {
      type: Number,
      required: true,
      default: 15000,
      min: 0,
    },

    status: {
      type: String,
      enum: ["active", "inactive", "blocked"],
      default: "active",
    },

    bankName: {
      type: String,
      default: "Tenarz Bank",
      trim: true,
    },
     // Store the KYC method used to create the account
    kycType: {
      type: String,
      enum: ["BVN", "NIN"],
      required: true,
    },

    // Store the verified KYC identifier
    kycID: {
      type: String,
      required: true,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

const Account = mongoose.model(
  "Account",
  accountSchema
);

export default Account;