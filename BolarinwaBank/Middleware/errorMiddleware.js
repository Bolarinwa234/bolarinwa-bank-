export const errorHandler = (
  err,
  req,
  res,
  next
) => {
  console.error(err);

  const statusCode =
    err.statusCode ||
    err.response?.status ||
    (err.request ? 503 : 500);

  const message =
    err.response?.data?.message ||
    (err.request
      ? "Phoenix service is unavailable"
      : null) ||
    err.message ||
    "Internal server error";

  res.status(statusCode).json({
    success: false,
    message,
  });
};