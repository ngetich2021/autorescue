// M-Pesa Daraja (Lipa Na M-Pesa Online / STK Push) client.
//
// Credentials come from env — see .env's MPESA_* keys. MPESA_ENV selects
// sandbox vs production host. MPESA_SHORTCODE + MPESA_PASSKEY generate the
// STK password (Daraja's "Online Shortcode"); MPESA_TILL_NUMBER is where the
// payment actually lands (PartyB) — this app assumes a Till ("Buy Goods")
// setup. If your Daraja app is Paybill-only instead, set PartyB to
// MPESA_SHORTCODE and TRANSACTION_TYPE to "CustomerPayBillOnline" below.
const MPESA_ENV = process.env.MPESA_ENV?.trim().toLowerCase();
const BASE_URL =
  MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

const TRANSACTION_TYPE = "CustomerBuyGoodsOnline";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name}`);
  return value;
}

// Kenyan numbers only, normalised to Daraja's expected 2547XXXXXXXX /
// 2541XXXXXXXX (no +, no leading 0).
export function formatMpesaPhone(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("254") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `254${digits.slice(1)}`;
  if (digits.startsWith("7") && digits.length === 9) return `254${digits}`;
  if (digits.startsWith("1") && digits.length === 9) return `254${digits}`;
  return null;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  const consumerKey = requireEnv("MPESA_CONSUMER_KEY");
  const consumerSecret = requireEnv("MPESA_CONSUMER_SECRET");
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

  const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) {
    throw new Error(`M-Pesa auth failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: string };
  // Refresh a minute early rather than racing the actual expiry.
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in) - 60) * 1000,
  };
  return cachedToken.value;
}

function daraTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

export type StkPushResult = {
  merchantRequestId: string;
  checkoutRequestId: string;
};

// Sends the STK push prompt to the customer's phone. Throws on any
// non-success response from Daraja — callers should catch and surface a
// user-facing error rather than leaving a Payment row stuck PENDING.
export async function initiateStkPush({
  phone,
  amount,
  accountReference,
  transactionDesc,
}: {
  phone: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
}): Promise<StkPushResult> {
  const shortcode = requireEnv("MPESA_SHORTCODE");
  const passkey = requireEnv("MPESA_PASSKEY");
  const partyB = process.env.MPESA_TILL_NUMBER?.trim() || shortcode;
  const callbackUrl = requireEnv("MPESA_CALLBACK_URL");
  const timestamp = daraTimestamp();
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");

  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: TRANSACTION_TYPE,
      Amount: amount,
      PartyA: phone,
      PartyB: partyB,
      PhoneNumber: phone,
      CallBackURL: callbackUrl,
      AccountReference: accountReference.slice(0, 12),
      TransactionDesc: transactionDesc.slice(0, 13),
    }),
  });

  const data = await res.json();
  if (!res.ok || data.ResponseCode !== "0") {
    throw new Error(data.errorMessage || data.ResponseDescription || "STK push failed.");
  }

  return {
    merchantRequestId: data.MerchantRequestID,
    checkoutRequestId: data.CheckoutRequestID,
  };
}

export type StkCallbackPayload = {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: { Name: string; Value?: string | number }[];
      };
    };
  };
};

export function parseStkCallback(payload: StkCallbackPayload) {
  const cb = payload.Body.stkCallback;
  const items = cb.CallbackMetadata?.Item ?? [];
  const find = (name: string) => items.find((i) => i.Name === name)?.Value;

  return {
    checkoutRequestId: cb.CheckoutRequestID,
    merchantRequestId: cb.MerchantRequestID,
    success: cb.ResultCode === 0,
    resultDesc: cb.ResultDesc,
    mpesaReceiptNumber: find("MpesaReceiptNumber") as string | undefined,
    amount: find("Amount") as number | undefined,
  };
}
