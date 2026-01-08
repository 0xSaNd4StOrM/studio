import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyKashierSignature } from "@/lib/kashier";

type KashierWebhookPayload = {
  event?: string;
  data?: Record<string, unknown> & {
    merchantOrderId?: string;
    status?: string;
    signatureKeys?: string[];
  };
};

export async function POST(request: Request) {
  let payload: KashierWebhookPayload | null = null;
  try {
    payload = (await request.json()) as KashierWebhookPayload;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const signature = request.headers.get("x-kashier-signature");
  const data = (payload?.data ?? {}) as Record<string, unknown>;
  const signatureKeysCandidate = payload?.data?.signatureKeys;
  const signatureKeys =
    Array.isArray(signatureKeysCandidate) &&
    signatureKeysCandidate.every((key) => typeof key === "string")
      ? signatureKeysCandidate
      : null;

  const verification = await verifyKashierSignature({
    signature,
    signatureKeys,
    data,
  });

  if (!verification.ok) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const merchantOrderId = typeof data.merchantOrderId === "string" ? data.merchantOrderId : null;
  const paymentStatus = typeof data.status === "string" ? data.status : null;

  if (!merchantOrderId || !paymentStatus) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const nextStatus =
    paymentStatus.toUpperCase() === "SUCCESS"
      ? "Confirmed"
      : paymentStatus.toUpperCase() === "FAILED" || paymentStatus.toUpperCase() === "FAILURE"
        ? "Cancelled"
        : "Pending";

  const supabase = await createClient();
  const { error } = await supabase
    .from("bookings")
    .update({ status: nextStatus })
    .eq("id", merchantOrderId);

  if (error) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
