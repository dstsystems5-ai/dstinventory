import { NextResponse } from "next/server";

export async function GET() {
  const configured = Boolean(
    process.env.QUICKBOOKS_CLIENT_ID &&
      process.env.QUICKBOOKS_CLIENT_SECRET,
  );
  return NextResponse.json({ configured });
}
