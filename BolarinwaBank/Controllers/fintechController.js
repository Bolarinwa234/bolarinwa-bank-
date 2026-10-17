import {
  onboardFintech,
} from "../Services/nibssService.js";

export const registerFintech = async (
  req,
  res,
  next
) => {
  try {
    const {
      email,
      companyName,
    } = req.body;

    // ==========================================
    // VALIDATE REQUIRED FIELDS
    // ==========================================

    if (!email || !companyName) {
      return res.status(400).json({
        success: false,
        message:
          "Email and company name are required",
      });
    }

    // ==========================================
    // VALIDATE EMAIL
    // ==========================================

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide a valid email address",
      });
    }

    // ==========================================
    // ONBOARD FINTECH WITH NIBSS
    // ==========================================

    const response =
      await onboardFintech(
        email.trim().toLowerCase(),
        companyName.trim()
      );

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(201).json({
      success: true,

      message:
        "Fintech onboarding request submitted successfully",

      data: response,
    });
  } catch (error) {
    next(error);
  }
};