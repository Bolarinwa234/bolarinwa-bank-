import crypto from "crypto";
import mongoose from "mongoose";

import Account from "../Models/Account.js";
import Transaction from "../Models/Transaction.js";
import normalizeProviderStatus from "../Utils/normalizeProviderStatus.js";

import {
  nameEnquiry,
  transferFunds,
  checkTransactionStatus,
  getPhoenixToken,
} from "../Services/nibssService.js";

// ==========================================
// NAME ENQUIRY
// ==========================================

export const enquireName = async (
  req,
  res,
  next
) => {
  try {
    const { accountNumber } = req.params;

    if (!accountNumber) {
      return res.status(400).json({
        success: false,
        message: "Account number is required",
      });
    }

    // First check Tenarz Bank's own accounts
    const localAccount = await Account.findOne({
      accountNumber,
    });

    if (localAccount) {
      return res.status(200).json({
        success: true,
        message: "Name enquiry successful",
        data: {
          accountNumber:
            localAccount.accountNumber,
          accountName:
            localAccount.accountName,
          bankName:
            localAccount.bankName,
        },
      });
    }

    // If not a local account, ask NIBSS
    const phoenixToken =
      await getPhoenixToken();

    const response =
      await nameEnquiry(
        accountNumber,
        phoenixToken
      );

    const providerData =
      response.data?.data ||
      response.data ||
      response;

    const recipientData = {
      accountNumber:
        providerData.accountNumber ||
        providerData.account_number ||
        accountNumber,

      accountName:
        providerData.accountName ||
        providerData.account_name ||
        providerData.name,

      bankName:
        providerData.bankName ||
        providerData.bank_name ||
        providerData.bank?.name ||
        providerData.bank ||
        providerData.institutionName ||
        providerData.institution?.name,
    };

    if (
      !recipientData.accountName ||
      !recipientData.bankName
    ) {
      return res.status(502).json({
        success: false,
        message:
          "Phoenix returned incomplete recipient details",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Name enquiry successful",
      data: recipientData,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// MAKE TRANSFER
// ==========================================

export const makeTransfer = async (
  req,
  res,
  next
) => {
  let session;

  try {
    const {
      recipientAccountNumber,
      recipientBank,
      recipientName,
      amount,
      narration,
    } = req.body;

    // ==========================================
    // VALIDATION
    // ==========================================

    const normalizedRecipientAccountNumber =
      typeof recipientAccountNumber === "string"
        ? recipientAccountNumber.trim()
        : "";

    if (
      !normalizedRecipientAccountNumber ||
      amount === undefined ||
      amount === null
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Recipient account number and amount are required",
      });
    }

    const transferAmount = Number(amount);

    if (
      !Number.isFinite(transferAmount) ||
      transferAmount < 1
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Transfer amount must be at least 1",
      });
    }

    // ==========================================
    // GET SENDER ACCOUNT
    // ==========================================

    const idempotencyKey =
      req.get("Idempotency-Key")?.trim();

    if (idempotencyKey && idempotencyKey.length > 128) {
      return res.status(400).json({
        success: false,
        message: "Idempotency-Key must be 128 characters or fewer",
      });
    }

    const existingTransaction = idempotencyKey
      ? await Transaction.findOne({
          sender: req.user.id,
          idempotencyKey,
        })
      : null;

    if (existingTransaction) {
      return respondToIdempotentRetry(
        existingTransaction,
        normalizedRecipientAccountNumber,
        transferAmount,
        res
      );
    }

    const senderAccount =
      await Account.findOne({
        user: req.user.id,
      });

    if (!senderAccount) {
      return res.status(404).json({
        success: false,
        message: "Sender account not found",
      });
    }

    // ==========================================
    // CHECK SENDER ACCOUNT
    // ==========================================

    if (
      senderAccount.status !== "active"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Your account is not active",
      });
    }

    // ==========================================
    // CHECK BALANCE
    // ==========================================

    // ==========================================
    // FIND RECIPIENT
    // ==========================================

    const recipientAccount =
      await Account.findOne({
        accountNumber: normalizedRecipientAccountNumber,
      });

    // ==========================================
    // PREVENT SELF TRANSFER
    // ==========================================

    if (recipientAccount && recipientAccount._id.equals(senderAccount._id)) {
      return res.status(400).json({
        success: false,
        message:
          "You cannot transfer money to your own account",
      });
    }

    // ==========================================
    // CREATE TRANSACTION REFERENCE
    // ==========================================

    if (recipientAccount) {
      try {
        session = await mongoose.startSession();
        let transactionId;

        await session.withTransaction(async () => {
          const [transaction] = await Transaction.create(
            [
              {
                sender: req.user.id,
                senderAccount: senderAccount._id,
                recipient: recipientAccount.user,
                recipientAccountNumber: recipientAccount.accountNumber,
                recipientName: recipientAccount.accountName,
                recipientBank: recipientAccount.bankName,
                amount: transferAmount,
                narration: narration || "Fund Transfer",
                transactionReference: crypto.randomUUID(),
                idempotencyKey: idempotencyKey || undefined,
                type: "intra-bank",
                status: "pending",
              },
            ],
            { session }
          );

          const debit = await Account.updateOne(
            {
              _id: senderAccount._id,
              status: "active",
              balance: { $gte: transferAmount },
            },
            { $inc: { balance: -transferAmount } },
            { session }
          );

          if (debit.matchedCount !== 1) {
            throw createTransferError(
              "Insufficient balance or sender account is no longer active",
              409
            );
          }

          const credit = await Account.updateOne(
            {
              _id: recipientAccount._id,
              status: "active",
            },
            { $inc: { balance: transferAmount } },
            { session }
          );

          if (credit.matchedCount !== 1) {
            throw createTransferError(
              "Recipient account is no longer active",
              409
            );
          }

          await Transaction.updateOne(
            { _id: transaction._id },
            { $set: { status: "successful" } },
            { session }
          );

          transactionId = transaction._id;
        });

        const transaction =
          await Transaction.findById(transactionId);
        return res.status(200).json({
          success: true,
          message:
            "Intra-bank transfer successful",
          transaction,
        });
      } catch (error) {
        if (error.code === 11000 && idempotencyKey) {
          const duplicate = await Transaction.findOne({
            sender: req.user.id,
            idempotencyKey,
          });
          if (duplicate) {
            return respondToIdempotentRetry(
              duplicate,
              normalizedRecipientAccountNumber,
              transferAmount,
              res
            );
          }
        }
        throw error;
      } finally {
        await session?.endSession();
        session = null;
      }
    }

    session = await mongoose.startSession();
    let transactionId;

    try {
      await session.withTransaction(async () => {
        const [transaction] = await Transaction.create(
          [
            {
              sender: req.user.id,
              senderAccount: senderAccount._id,
              recipient: null,
              recipientAccountNumber: normalizedRecipientAccountNumber,
              recipientName: recipientName || "Pending name enquiry",
              recipientBank: recipientBank || null,
              amount: transferAmount,
              narration: narration || "Fund Transfer",
              transactionReference: crypto.randomUUID(),
              idempotencyKey: idempotencyKey || undefined,
              type: "inter-bank",
              status: "pending",
            },
          ],
          { session }
        );

        const debit = await Account.updateOne(
          {
            _id: senderAccount._id,
            status: "active",
            balance: { $gte: transferAmount },
          },
          { $inc: { balance: -transferAmount } },
          { session }
        );

        if (debit.matchedCount !== 1) {
          throw createTransferError(
            "Insufficient balance or sender account is no longer active",
            409
          );
        }

        transactionId = transaction._id;
      });
    } catch (nibssError) {
      if (nibssError.code === 11000 && idempotencyKey) {
        const duplicate = await Transaction.findOne({
          sender: req.user.id,
          idempotencyKey,
        });
        if (duplicate) {
          return respondToIdempotentRetry(
            duplicate,
            normalizedRecipientAccountNumber,
            transferAmount,
            res
          );
        }
      }
      throw nibssError;
    }

    const transaction =
      await Transaction.findById(transactionId);

    let nibssResponse;
    try {
      const phoenixToken = await getPhoenixToken();
      nibssResponse = await transferFunds(
        {
          from: senderAccount.accountNumber,
          to: normalizedRecipientAccountNumber,
          amount: transferAmount,
        },
        phoenixToken
      );
    } catch (providerError) {
      console.error(
        "Inter-bank transfer confirmation is pending:",
        providerError.message
      );
      return res.status(202).json({
        success: true,
        message:
          "Transfer outcome is pending confirmation. Check its status before retrying.",
        transaction,
      });
    } finally {
      await session.endSession();
      session = null;
    }

    const providerStatus =
      normalizeProviderStatus(nibssResponse);
    const nibssReference =
      nibssResponse?.reference ||
      nibssResponse?.transactionReference ||
      nibssResponse?.ref ||
      nibssResponse?.data?.reference ||
      nibssResponse?.data?.transactionReference ||
      null;

    let updatedTransaction;
    if (providerStatus === "pending") {
      if (nibssReference) {
        await Transaction.updateOne(
          { _id: transactionId, status: "pending" },
          { $set: { nibssReference } }
        );
      }
      updatedTransaction =
        await Transaction.findById(transactionId);
    } else {
      updatedTransaction = await settleInterBankTransaction(
        transactionId,
        providerStatus,
        nibssReference
      );
    }

    if (updatedTransaction.status === "pending") {
      return res.status(202).json({
        success: true,
        message:
          "Transfer outcome is pending confirmation. Check its status before retrying.",
        transaction: updatedTransaction,
        nibssResponse,
      });
    }

    if (providerStatus === "failed") {
      return res.status(502).json({
        success: false,
        message: "The receiving bank rejected the transfer",
        transaction: updatedTransaction,
        nibssResponse,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Inter-bank transfer successful",
      transaction: updatedTransaction,
      nibssResponse,
    });
  } catch (error) {
    if (error.code === 11000 && req.get("Idempotency-Key")) {
      try {
        const duplicate = await Transaction.findOne({
          sender: req.user.id,
          idempotencyKey: req.get("Idempotency-Key").trim(),
        });
        if (duplicate) {
          return respondToIdempotentRetry(
            duplicate,
            typeof req.body.recipientAccountNumber === "string"
              ? req.body.recipientAccountNumber.trim()
              : "",
            Number(req.body.amount),
            res
          );
        }
      } catch (lookupError) {
        return next(lookupError);
      }
    }
    next(error);
  } finally {
    await session?.endSession();
  }
};

const createTransferError = (message, statusCode) =>
  Object.assign(new Error(message), { statusCode });

const respondToIdempotentRetry = (
  transaction,
  recipientAccountNumber,
  amount,
  res
) => {
  if (
    transaction.recipientAccountNumber !== recipientAccountNumber ||
    transaction.amount !== amount
  ) {
    return res.status(409).json({
      success: false,
      message:
        "Idempotency-Key was already used for a different transfer",
    });
  }

  if (transaction.status === "pending") {
    return res.status(202).json({
      success: true,
      message:
        "Transfer outcome is pending confirmation. Check its status before retrying.",
      transaction,
    });
  }

  if (transaction.status === "failed") {
    return res.status(409).json({
      success: false,
      message:
        "This transfer already failed. Use a new Idempotency-Key to submit another transfer.",
      transaction,
    });
  }

  return res.status(200).json({
    success: true,
    message: "Transfer already completed",
    transaction,
  });
};

const settleInterBankTransaction = async (
  transactionId,
  status,
  nibssReference
) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const transaction = await Transaction.findById(
        transactionId
      ).session(session);

      if (!transaction || transaction.status !== "pending") {
        return;
      }

      if (status === "failed") {
        const refund = await Account.updateOne(
          { _id: transaction.senderAccount },
          { $inc: { balance: transaction.amount } },
          { session }
        );

        if (refund.matchedCount !== 1) {
          throw createTransferError(
            "Unable to refund the failed transfer",
            500
          );
        }
      }

      transaction.status = status;
      if (nibssReference) {
        transaction.nibssReference = nibssReference;
      }
      await transaction.save({ session });
    });

    return Transaction.findById(transactionId);
  } finally {
    await session.endSession();
  }
};

// ==========================================
// TRANSACTION STATUS
// ==========================================

export const getTransactionStatus =
  async (req, res, next) => {
    try {
      const { ref } = req.params;

      if (!ref) {
        return res.status(400).json({
          success: false,
          message:
            "Transaction reference is required",
        });
      }

      const transaction =
        await Transaction.findOne({
          transactionReference: ref,
        });

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message:
            "Transaction not found",
        });
      }

      const isSender =
        transaction.sender?.toString() ===
        req.user.id.toString();

      const isRecipient =
        transaction.recipient?.toString() ===
        req.user.id.toString();

      if (!isSender && !isRecipient) {
        return res.status(403).json({
          success: false,
          message:
            "You are not authorized to view this transaction",
        });
      }

      if (transaction.type === "intra-bank") {
        return res.status(200).json({
          success: true,
          transaction,
        });
      }

      if (transaction.status !== "pending") {
        return res.status(200).json({
          success: true,
          transaction,
        });
      }

      const nibssReference =
        transaction.nibssReference ||
        transaction.transactionReference;

      let nibssResponse;
      try {
        const phoenixToken = await getPhoenixToken();
        nibssResponse = await checkTransactionStatus(
          nibssReference,
          phoenixToken
        );
      } catch (providerError) {
        console.error(
          "Unable to reconcile inter-bank transfer:",
          providerError.message
        );
        return res.status(202).json({
          success: true,
          message:
            "Transfer outcome is still pending provider confirmation",
          transaction,
        });
      }

      const providerStatus =
        normalizeProviderStatus(nibssResponse);
      const updatedTransaction =
        providerStatus === "pending"
          ? transaction
          : await settleInterBankTransaction(
              transaction._id,
              providerStatus,
              nibssReference
            );

      return res
        .status(providerStatus === "pending" ? 202 : 200)
        .json({
          success: true,
          transaction: updatedTransaction,
          nibssResponse,
        });
    } catch (error) {
      next(error);
    }
  };

// ==========================================
// TRANSACTION HISTORY
// ==========================================

export const getTransactionHistory =
  async (req, res, next) => {
    try {
      const transactions =
        await Transaction.find({
          $or: [
            {
              sender: req.user.id,
            },
            {
              recipient: req.user.id,
            },
          ],
        })
          .populate(
            "sender",
            "firstName lastName email"
          )
          .populate(
            "recipient",
            "firstName lastName email"
          )
          .populate(
            "senderAccount",
            "accountNumber accountName"
          )
          .sort({
            createdAt: -1,
          });

      return res.status(200).json({
        success: true,

        count:
          transactions.length,

        transactions,
      });
    } catch (error) {
      next(error);
    }
  };