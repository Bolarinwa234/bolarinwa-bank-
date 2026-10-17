import "dotenv/config";
import axios from "axios";

const nibssAPI = axios.create({
  baseURL: process.env.NIBSS_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ==========================================
// FINTECH ONBOARDING
// ==========================================

export const onboardFintech = async (
  email,
  companyName
) => {
  const response = await nibssAPI.post(
    "/api/fintech/onboard",
    {
      email,
      companyName,
    }
  );

  return response.data;
};

// ==========================================
// NIBSS AUTHENTICATION
// ==========================================

export const loginFintech = async (
  apiKey,
  apiSecret
) => {
  const response = await nibssAPI.post(
    "/api/auth/token",
    {
      apiKey,
      apiSecret,
    }
  );

  return response.data;
};

// ==========================================
// CREATE BVN
// ==========================================

export const createBVN = async (data) => {
  const response =
    await nibssAPI.post(
      "/api/insertBvn",
      data
    );

  return response.data;
};

// ==========================================
// VALIDATE BVN
// ==========================================

export const verifyBVN = async (data) => {
  const response =
    await nibssAPI.post(
      "/api/validateBvn",
      data
    );

  return response.data;
};

// ==========================================
// CREATE NIN
// ==========================================

export const createNIN = async (data) => {
  const response =
    await nibssAPI.post(
      "/api/insertNin",
      data
    );

  return response.data;
};

// ==========================================
// VALIDATE NIN
// ==========================================

export const verifyNIN = async (data) => {
  const response =
    await nibssAPI.post(
      "/api/validateNin",
      data
    );

  return response.data;
};

// ==========================================
// CREATE ACCOUNT
// ==========================================

export const createNibssAccount =
  async (data, token) => {
    const response =
      await nibssAPI.post(
        "/api/account/create",
        data,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

    return response.data;
  };

// ==========================================
// NAME ENQUIRY
// ==========================================

export const nameEnquiry = async (
  accountNumber,
  token
) => {
  const response =
    await nibssAPI.get(
      `/api/account/name-enquiry/${accountNumber}`,
      {
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      }
    );

  return response.data;
};

// ==========================================
// FUND TRANSFER
// ==========================================

export const transferFunds = async (
  data,
  token
) => {
  const response =
    await nibssAPI.post(
      "/api/transfer",
      data,
      {
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      }
    );

  return response.data;
};

// ==========================================
// ACCOUNT BALANCE
// ==========================================

export const checkBalance = async (
  accountNumber,
  token
) => {
  const response =
    await nibssAPI.get(
      `/api/account/balance/${accountNumber}`,
      {
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      }
    );

  return response.data;
};

// ==========================================
// TRANSACTION STATUS
// ==========================================

export const checkTransactionStatus =
  async (reference, token) => {
    const response =
      await nibssAPI.get(
        `/api/transaction/${reference}`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

    return response.data;
  };

  // ==========================================
// GET PHOENIX TOKEN
// ==========================================

export const getPhoenixToken = async () => {
  if (
    !process.env.PHOENIX_API_KEY ||
    !process.env.PHOENIX_API_SECRET
  ) {
    throw new Error(
      "Phoenix API key or secret is missing"
    );
  }

  const response = await loginFintech(
    process.env.PHOENIX_API_KEY,
    process.env.PHOENIX_API_SECRET
  );

  const token =
    response.token ||
    response.accessToken ||
    response.data?.token ||
    response.data?.accessToken;

  if (!token) {
    throw new Error(
      "Phoenix did not return a token"
    );
  }

  return token;
};