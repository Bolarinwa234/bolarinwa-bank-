import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    // Customer initiating the transaction
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Sender's account
    senderAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },

    // Recipient if the recipient is one of our customers
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    // Recipient's account number
    recipientAccountNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    // Recipient's name returned from name enquiry
    recipientName: {
      type: String,
      trim: true,
      default: "Unknown",
    },

    // Recipient bank
    recipientBank: {
      type: String,
      trim: true,
      default: null,
    },

    // Amount transferred
    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    // Transaction description
    narration: {
      type: String,
      trim: true,
      default: "Fund Transfer",
    },

    // Your application's transaction reference
    transactionReference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    idempotencyKey: {
      type: String,
      trim: true,
    },

    // Intra-bank or inter-bank
    type: {
      type: String,
      enum: ["intra-bank", "inter-bank"],
      required: true,
    },

    // Transaction status
    status: {
      type: String,
      enum: [
        "pending",
        "successful",
        "failed",
      ],
      default: "pending",
      index: true,
    },

    // Reference returned by NIBSS by Phoenix
    nibssReference: {
      type: String,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.index(
  { sender: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      idempotencyKey: { $type: "string" },
    },
  }
);

const Transaction = mongoose.model(
  "Transaction",
  transactionSchema
);

export default Transaction;