import User from "../Models/Users.js";

import {
  verifyBVN,
  verifyNIN,
} from "../Services/nibssService.js";

export const onboardCustomer = async (
  req,
  res,
  next
) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      dateOfBirth,
      bvn,
      nin,
    } = req.body;

    // ==========================================
    // NORMALIZE KYC TYPE
    // ==========================================

    const kycType = req.body.kycType?.toUpperCase();

    // ==========================================
    // VALIDATE KYC TYPE
    // ==========================================

    if (!["BVN", "NIN"].includes(kycType)) {
      return res.status(400).json({
        success: false,
        message: "KYC type must be BVN or NIN",
      });
    }

    // ==========================================
    // CHECK REQUIRED CUSTOMER INFORMATION
    // ==========================================

    if (
      !firstName ||
      !lastName ||
      !email ||
      !phone ||
      !password ||
      !dateOfBirth
    ) {
      return res.status(400).json({
        success: false,
        message:
          "First name, last name, email, phone, password and date of birth are required",
      });
    }

    // ==========================================
    // CHECK IF CUSTOMER ALREADY EXISTS
    // ==========================================

    const existingUser = await User.findOne({
      $or: [
        {
          email: email.toLowerCase().trim(),
        },
        {
          phone: phone.trim(),
        },
      ],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Customer already exists",
      });
    }

    let verificationResponse;

    // ==========================================
    // BVN VERIFICATION
    // ==========================================

    if (kycType === "BVN") {
      if (!bvn) {
        return res.status(400).json({
          success: false,
          message: "BVN is required",
        });
      }

      verificationResponse = await verifyBVN({
        bvn,
        firstName,
        lastName,
        dob: dateOfBirth,
        phone,
      });
    }

    // ==========================================
    // NIN VERIFICATION
    // ==========================================

    if (kycType === "NIN") {
      if (!nin) {
        return res.status(400).json({
          success: false,
          message: "NIN is required",
        });
      }

      verificationResponse = await verifyNIN({
        nin,
        firstName,
        lastName,
        dob: dateOfBirth,
      });
    }

    // ==========================================
    // CHECK NIBSS VERIFICATION RESPONSE
    // ==========================================

    if (!verificationResponse) {
      return res.status(400).json({
        success: false,
        message: "KYC verification failed",
      });
    }

    // ==========================================
    // CREATE CUSTOMER
    // ==========================================
    // Password hashing is handled automatically
    // by the User model's pre-save middleware.

    const user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      password,
      dateOfBirth,

      kycType,

      bvn:
        kycType === "BVN"
          ? bvn
          : undefined,

      nin:
        kycType === "NIN"
          ? nin
          : undefined,

      isVerified: true,
      isOnboarded: true,
    });

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(201).json({
      success: true,
      message: "Customer onboarded successfully",

      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        kycType: user.kycType,
        isVerified: user.isVerified,
        isOnboarded: user.isOnboarded,
      },

      verification: verificationResponse,
    });
  } catch (error) {
    next(error);
  }
};
