# Bolarinwa Bank API

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set the MongoDB and Phoenix credentials.
3. Use a MongoDB replica set. Transfer operations use MongoDB transactions to keep the transaction record and account balance changes consistent.
4. Start the API with `npm run dev`; run tests with `npm test`.

The local MongoDB URI in `.env.example` assumes a replica set named `rs0`. Configure and initialize that replica set before starting the API.

## Transfer safety

Send transfers to `POST /api/transactions/transfer` with an `Idempotency-Key` header (up to 128 characters). Reusing the same key for the same customer and transfer returns the existing transaction instead of sending it again. Reusing a key with a different destination or amount returns `409`. Use a new key for a new transfer.

Intra-bank transfers debit and credit accounts together in one database transaction. Inter-bank transfers reserve the amount and record a pending transaction before calling Phoenix. A timeout or unrecognized provider response leaves the transaction pending and the amount reserved; it is not safe to assume the provider did not execute the transfer. Check `GET /api/transactions/:ref` to reconcile the provider result. A confirmed failure refunds the reserved amount once; a confirmed success marks the transaction successful.

Provider statuses not explicitly recognized by the API remain pending. Confirm the Phoenix status values against the provider contract before extending the status mapping.
