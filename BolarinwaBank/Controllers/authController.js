import jwt from "jsonwebtoken";
import User from "../Models/Users.js";

// ======================================
// GENERATE CUSTOMER JWT
// ======================================

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRATION || "1h"
    }
  );
};

// ======================================
// CUSTOMER LOGIN
// ======================================

export const loginCustomer = async (
  req,
  res,
  next
) => {
  try {
    const { email, password } = req.body;

    // ======================================
    // VALIDATE INPUT
    // ======================================

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // ======================================
    // FIND CUSTOMER
    // ======================================
    // Password is select:false in the User model,
    // so we explicitly include it for comparison.

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // ======================================
    // CHECK PASSWORD
    // ======================================

    const isMatch =
      await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // ======================================
    // CHECK CUSTOMER STATUS
    // ======================================

    if (!user.isOnboarded) {
      return res.status(403).json({
        success: false,
        message: "Customer onboarding is not complete",
      });
    }

    // ======================================
    // GENERATE JWT
    // ======================================

    const token = generateToken(user._id);

    // ======================================
    // RESPONSE
    // ======================================

    return res.status(200).json({
      success: true,
      message: "Login successful",

      token,

      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        kycType: user.kycType,
        isVerified: user.isVerified,
        isOnboarded: user.isOnboarded,
      },
    });
  } catch (error) {
    next(error);
  }
};