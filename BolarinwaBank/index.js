import "dotenv/config";
import express from "express";
import cors from "cors";

import fintechRoutes from "./Routes/fintechRoutes.js";
import customerRoutes from "./Routes/customerRoutes.js";
import accountRoutes from "./Routes/accountRoutes.js";
import transactionRoutes from "./Routes/transactionRoutes.js";

import {
  errorHandler,
} from "./Middleware/errorMiddleware.js";

const app = express();
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json());

// ======================================
// ROUTES
// ======================================

app.use(
  "/api/fintech",
  fintechRoutes
);

app.use(
  "/api/customers",
  customerRoutes
);

app.use(
  "/api/account",
  accountRoutes
);

app.use(
  "/api/transactions",
  transactionRoutes
);

// Convert route errors into the API's JSON error format.
app.use(errorHandler);

// ======================================
// TEST ROUTE
// ======================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Ten Bank API is running",
  });
});

export default app;