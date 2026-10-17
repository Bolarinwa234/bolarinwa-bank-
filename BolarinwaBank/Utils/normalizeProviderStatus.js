const successfulStatuses = new Set([
  "complete",
  "completed",
  "paid",
  "settled",
  "success",
  "successful",
]);

const failedStatuses = new Set([
  "canceled",
  "cancelled",
  "declined",
  "failed",
  "failure",
  "rejected",
  "reversed",
]);

const pendingStatuses = new Set([
  "accepted",
  "initiated",
  "in progress",
  "pending",
  "processing",
  "queued",
]);

const getStatusValue = (response) =>
  response?.status ??
  response?.transactionStatus ??
  response?.data?.status ??
  response?.data?.transactionStatus ??
  response?.data?.data?.status ??
  response?.data?.data?.transactionStatus;

const normalizeProviderStatus = (response) => {
  const status = getStatusValue(response);

  if (typeof status !== "string") {
    return "pending";
  }

  const normalizedStatus = status.trim().toLowerCase();

  if (successfulStatuses.has(normalizedStatus)) {
    return "successful";
  }

  if (failedStatuses.has(normalizedStatus)) {
    return "failed";
  }

  if (pendingStatuses.has(normalizedStatus)) {
    return "pending";
  }

  return "pending";
};

export default normalizeProviderStatus;
