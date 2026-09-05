import "server-only";
import { decryptMpesaSecret } from "./encryption";

const urls = {
  SANDBOX: "https://sandbox.safaricom.co.ke",
  PRODUCTION: "https://api.safaricom.co.ke",
} as const;

type Account = { environment: keyof typeof urls; shortcode: string; consumerKeyEncrypted: string; consumerSecretEncrypted: string; passkeyEncrypted: string };

async function accessToken(account: Account) {
  const credentials = `${decryptMpesaSecret(account.consumerKeyEncrypted)}:${decryptMpesaSecret(account.consumerSecretEncrypted)}`;
  const response = await fetch(`${urls[account.environment]}/oauth/v1/generate?grant_type=client_credentials`, { headers: { Authorization: `Basic ${Buffer.from(credentials).toString("base64")}` }, cache: "no-store" });
  if (!response.ok) throw new Error(`Daraja authentication failed (${response.status}).`);
  const body = await response.json() as { access_token?: string };
  if (!body.access_token) throw new Error("Daraja did not return an access token.");
  return body.access_token;
}

export async function testDarajaConnection(account: Account) {
  await accessToken(account);
}

export async function initiateStkPush(account: Account, input: { phoneNumber: string; amount: string; accountReference: string; description: string; callbackUrl: string }) {
  const token = await accessToken(account);
  const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const password = Buffer.from(`${account.shortcode}${decryptMpesaSecret(account.passkeyEncrypted)}${timestamp}`).toString("base64");
  const response = await fetch(`${urls[account.environment]}/mpesa/stkpush/v1/processrequest`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ BusinessShortCode: account.shortcode, Password: password, Timestamp: timestamp, TransactionType: "CustomerPayBillOnline", Amount: Math.ceil(Number(input.amount)), PartyA: input.phoneNumber, PartyB: account.shortcode, PhoneNumber: input.phoneNumber, CallBackURL: input.callbackUrl, AccountReference: input.accountReference, TransactionDesc: input.description }) });
  const body = await response.json() as { ResponseCode?: string; ResponseDescription?: string; MerchantRequestID?: string; CheckoutRequestID?: string; CustomerMessage?: string };
  if (!response.ok || body.ResponseCode !== "0" || !body.CheckoutRequestID) throw new Error(body.ResponseDescription ?? "Daraja rejected the STK Push request.");
  return body;
}
