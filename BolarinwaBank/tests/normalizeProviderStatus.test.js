import assert from "node:assert/strict";
import test from "node:test";

import normalizeProviderStatus from "../Utils/normalizeProviderStatus.js";

test("normalizes confirmed successful provider statuses", () => {
  assert.equal(
    normalizeProviderStatus({ status: "SUCCESSFUL" }),
    "successful"
  );
  assert.equal(
    normalizeProviderStatus({
      data: { data: { transactionStatus: "completed" } },
    }),
    "successful"
  );
});

test("normalizes confirmed failed provider statuses", () => {
  assert.equal(
    normalizeProviderStatus({ status: "rejected" }),
    "failed"
  );
  assert.equal(
    normalizeProviderStatus({
      data: { transactionStatus: "cancelled" },
    }),
    "failed"
  );
});

test("keeps pending and unrecognized statuses pending", () => {
  assert.equal(
    normalizeProviderStatus({ status: "processing" }),
    "pending"
  );
  assert.equal(normalizeProviderStatus({}), "pending");
  assert.equal(
    normalizeProviderStatus({ status: "00" }),
    "pending"
  );
});
