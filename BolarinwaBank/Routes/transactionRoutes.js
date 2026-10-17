import express from "express";

import {
  enquireName,
  makeTransfer,
  getTransactionHistory,
  getTransactionStatus,
} from "../Controllers/transactionController.js";

import {
  protect,
} from "../Middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/name-enquiry/:accountNumber",
  protect,
  enquireName
);

router.post(
  "/transfer",
  protect,
  makeTransfer
);

router.get(
  "/history",
  protect,
  getTransactionHistory
);

router.get(
  "/:ref",
  protect,
  getTransactionStatus
);

export default router;