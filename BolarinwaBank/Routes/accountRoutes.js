import express from "express";

import {
  createAccount,
  getBalance,
  getMyAccounts,
} from "../Controllers/accountController.js";

import {
  protect,
} from "../Middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/create",
  protect,
  createAccount
);

router.get(
  "/balance",
  protect,
  getBalance
);

// Logged-in customer's accounts
router.get(
  "/my-accounts",
  protect,
  getMyAccounts
);

export default router;