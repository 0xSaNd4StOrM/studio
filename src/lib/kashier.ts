"use server";

import crypto from "crypto";

type KashierConfig = {
  merchantId: string;
  secretKey: string;
  apiKey: string;
  currency: string;
  mode: "test" | "live";
  hppBaseUrl: string;
  merchantRedirectUrl: string;
  allowedMethods?: string;
  display?: string;
};

function getKashierConfig(): KashierConfig {
  const merchantId = process.env.KASHIER_MERCHANT_ID;
  const secretKey = process.env.KASHIER_SECRET_KEY;
  const apiKey = process.env.KASHIER_API_KEY;
  const currency = process.env.KASHIER_CURRENCY ?? "EGP";
  const mode = (process.env.KASHIER_MODE ?? "test") as KashierConfig["mode"];
  const merchantRedirectUrl = process.env.KASHIER_MERCHANT_REDIRECT_URL;
  const hppBaseUrl = process.env.KASHIER_HPP_BASE_URL ?? "https://checkout.kashier.io/";
  const allowedMethods = process.env.KASHIER_ALLOWED_METHODS;
  const display = process.env.KASHIER_DISPLAY ?? "en";

  if (!merchantId) throw new Error("Missing KASHIER_MERCHANT_ID");
  if (!secretKey) throw new Error("Missing KASHIER_SECRET_KEY");
  if (!apiKey) throw new Error("Missing KASHIER_API_KEY");
  if (!merchantRedirectUrl) throw new Error("Missing KASHIER_MERCHANT_REDIRECT_URL");
  if (mode !== "test" && mode !== "live") throw new Error("Invalid KASHIER_MODE");

  return {
    merchantId,
    secretKey,
    apiKey,
    currency,
    mode,
    hppBaseUrl,
    merchantRedirectUrl,
    allowedMethods: allowedMethods && allowedMethods.trim() ? allowedMethods.trim() : undefined,
    display,
  };
}

function hmacSha256Hex(secret: string, payload: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function normalizeAmount(amount: number) {
  if (!Number.isFinite(amount)) throw new Error("Invalid amount");
  return amount.toFixed(2);
}

export async function buildKashierHppUrl(input: {
  merchantOrderId: string;
  amount: number;
  customer?: {
    name?: string;
    email?: string;
    mobile?: string;
  };
}) {
  const cfg = getKashierConfig();
  const amount = normalizeAmount(input.amount);
  const orderId = input.merchantOrderId;

  const paymentPath = `/?payment=${cfg.merchantId}.${orderId}.${amount}.${cfg.currency}`;
  const hash = hmacSha256Hex(cfg.secretKey, paymentPath);

  const url = new URL(cfg.hppBaseUrl);
  url.searchParams.set("merchantId", cfg.merchantId);
  url.searchParams.set("orderId", orderId);
  url.searchParams.set("mode", cfg.mode);
  url.searchParams.set("amount", amount);
  url.searchParams.set("currency", cfg.currency);
  url.searchParams.set("hash", hash);
  url.searchParams.set("merchantRedirect", cfg.merchantRedirectUrl);
  url.searchParams.set("display", cfg.display ?? "en");

  if (cfg.allowedMethods) url.searchParams.set("allowedMethods", cfg.allowedMethods);
  if (input.customer?.name) url.searchParams.set("customerName", input.customer.name);
  if (input.customer?.email) url.searchParams.set("customerEmail", input.customer.email);
  if (input.customer?.mobile) url.searchParams.set("customerMobile", input.customer.mobile);

  return url.toString();
}

export async function verifyKashierSignature(input: {
  signature: string | null | undefined;
  signatureKeys: string[] | null | undefined;
  data: Record<string, unknown>;
}) {
  const cfg = getKashierConfig();
  const signature = (input.signature ?? "").trim();
  const signatureKeys = input.signatureKeys ?? [];

  if (!signature) return { ok: false as const, reason: "missing_signature" as const };
  if (!Array.isArray(signatureKeys) || signatureKeys.length === 0) {
    return { ok: false as const, reason: "missing_signature_keys" as const };
  }

  const keys = [...signatureKeys].map((k) => String(k)).sort((a, b) => a.localeCompare(b));
  const payload = keys
    .map((key) => {
      const value = (input.data as Record<string, unknown>)[key];
      return `${key}=${value === undefined || value === null ? "" : String(value)}`;
    })
    .join("&");

  const expected = hmacSha256Hex(cfg.apiKey, payload);
  const match = expected.toLowerCase() === signature.toLowerCase();
  return match ? { ok: true as const } : { ok: false as const, reason: "signature_mismatch" as const };
}
