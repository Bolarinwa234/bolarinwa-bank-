import assert from "node:assert/strict";
import test from "node:test";

import generateAccountNumber from "../Utils/generateAccountNumber.js";

test("generates a 10-digit account number", () => {
  const accountNumber = generateAccountNumber();

  assert.match(accountNumber, /^\d{10}$/);
  assert.ok(Number(accountNumber) >= 1_000_000_000);
  assert.ok(Number(accountNumber) <= 9_999_999_999);
});
