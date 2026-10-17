import express from "express";

import {
  registerFintech,
} from "../Controllers/fintechController.js";

const router = express.Router();

router.post(
  "/onboard",
  registerFintech
);

export default router;