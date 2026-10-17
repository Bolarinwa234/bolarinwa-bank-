import User from "../Models/Users.js";
import Account from "../Models/Account.js";

import {
  createNibssAccount,
  getPhoenixToken,
} from "../Services/nibssService.js";

// ==========================================
// CREATE CUSTOMER ACCOUNT
// ==========================================

export const createAccount = async (
  req,
  res,
  next
) => {
  try {
    // ==========================================
    // GET LOGGED-IN CUSTOMER
    // ==========================================

    const userId = req.user.id;

    const user = await User.findById(userId).select(
      "+bvn +nin"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // ==========================================
    // CHECK CUSTOMER ONBOARDING STATUS
    // ==========================================

    if (
      !user.isVerified ||
      !user.isOnboarded
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Complete BVN or NIN verification before creating an account",
      });
    }

    // ==========================================
    // DETERMINE KYC INFORMATION
    // ==========================================

    let kycID;

    if (user.kycType === "BVN") {
      kycID = user.bvn;
    } else if (user.kycType === "NIN") {
      kycID = user.nin;
    }

    if (!kycID) {
      return res.status(400).json({
        success: false,
        message:
          "Customer KYC information is missing",
      });
    }

    // Check whether the customer already has an account
const existingCustomerAccount = await Account.findOne({
  user: user._id,
});

if (existingCustomerAccount) {
  return res.status(409).json({
    success: false,
    message: "Customer already has an account",
  });
}

    // ==========================================
    // GENERATE UNIQUE ACCOUNT NUMBER
    // ==========================================

    // Generate a fresh Phoenix token
const phoenixToken =
  await getPhoenixToken();

// Ask Phoenix to create the account
const phoenixResponse =
  await createNibssAccount(
    {
      kycType: user.kycType,
      kycID,
      dob: user.dateOfBirth
        .toISOString()
        .split("T")[0],
    },
    phoenixToken
  );

// Phoenix may return the account directly
// or place it inside "data"
const phoenixAccount =
  phoenixResponse.data ||
  phoenixResponse;

const accountNumber =
  phoenixAccount.accountNumber ||
  phoenixAccount.account_number;

if (!accountNumber) {
  return res.status(502).json({
    success: false,
    message:
      "Phoenix did not return an account number",
  });
}

    // ==========================================
    // CREATE ACCOUNT
    // ==========================================

    const account = await Account.create({
      user: user._id,

      accountNumber,

      accountName:
        `${user.firstName} ${user.lastName}`,

      kycType:
        user.kycType,

      kycID,


      // Initial balance
      balance: 15000,

      status: "active",
    });

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(201).json({
      success: true,

      message:
        "Account created successfully",

      account: {
        id: account._id,

        accountNumber:
          account.accountNumber,

        accountName:
          account.accountName,

        balance:
          account.balance,

        kycType:
          account.kycType,

        status:
          account.status,

        createdAt:
          account.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET LOGGED-IN CUSTOMER'S ACCOUNTS
// ==========================================

export const getMyAccounts = async (
  req,
  res,
  next
) => {
  try {
    const accounts =
      await Account.find({
        user: req.user.id,
      }).sort({
        createdAt: -1,
      });

    if (!accounts.length) {
      return res.status(404).json({
        success: false,
        message:
          "No accounts found for this customer",
      });
    }

    return res.status(200).json({
      success: true,

      count: accounts.length,

      accounts: accounts.map(
        (account) => ({
          id: account._id,

          accountNumber:
            account.accountNumber,

          accountName:
            account.accountName,

          balance:
            account.balance,

          kycType:
            account.kycType,

          status:
            account.status,

          createdAt:
            account.createdAt,
        })
      ),
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET ALL BANK ACCOUNTS
// ==========================================

export const getAllAccounts = async (
  req,
  res,
  next
) => {
  try {
    const accounts =
      await Account.find()
        .populate(
          "user",
          "firstName lastName email phone"
        )
        .sort({
          createdAt: -1,
        });

    return res.status(200).json({
      success: true,

      count: accounts.length,

      accounts,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET CUSTOMER BALANCE
// ==========================================

export const getBalance = async (
  req,
  res,
  next
) => {
  try {
    const account =
      await Account.findOne({
        user: req.user.id,
      }).sort({
        createdAt: -1,
      });

    if (!account) {
      return res.status(404).json({
        success: false,
        message:
          "Account not found",
      });
    }

    return res.status(200).json({
      success: true,

      accountNumber:
        account.accountNumber,

      accountName:
        account.accountName,

      balance:
        account.balance,

      status:
        account.status,
    });
  } catch (error) {
    next(error);
  }
};