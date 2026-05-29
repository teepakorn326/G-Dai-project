// app/api/email/route.js
// Endpoint to send emails via Resend. POST { to, subject, html }.

import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const { to, subject, html } = body || {};
  
  if (!to || !subject || !html) {
    return NextResponse.json(
      { error: "Missing required fields: to, subject, html." },
      { status: 400 }
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY is not set on the server. Add it to .env.local." },
      { status: 500 }
    );
  }

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: "G'dAI Hack <onboarding@resend.dev>",
      to,
      subject,
      html,
    });

    if (result.error) {
      throw new Error(result.error.message || "Failed to send email via Resend.");
    }

    return NextResponse.json({ ok: true, id: result.data?.id });
  } catch (err) {
    console.error("[api/email] Failed to send email:", err);
    return NextResponse.json(
      { error: err.message || "An unexpected error occurred while sending email." },
      { status: 500 }
    );
  }
}
