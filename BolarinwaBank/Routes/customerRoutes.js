import express from "express";

import {
  onboardCustomer,
} from "../Controllers/UserController.js";

import {
  loginCustomer,
} from "../Controllers/authController.js";

const router = express.Router();

router.post(
  "/onboard",
  onboardCustomer
);

router.post(
  "/login",
  loginCustomer
);

export default router;