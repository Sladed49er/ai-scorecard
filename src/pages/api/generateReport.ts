/**
 * /api/generateReport
 * -------------------
 * ▸ Accepts POSTed form data (JSON)
 * ▸ Streams that data through OpenAI to build a short narrative
 * ▸ Renders the HTML with Puppeteer → PDF
 * ▸ E-mails the PDF to the address supplied
 * ▸ Returns { ok: true } or { error: string }
 */

import type { NextApiRequest, NextApiResponse } from "next";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { OpenAI } from "openai";
import nodemailer from "nodemailer";

// ---------- ENV-VAR SAFETY ----------
const {
  OPENAI_API_KEY,
  SMTP_HOST,
  SMTP_PORT = "465",
  SMTP_SECURE = "true",
  SMTP_USER,
  SMTP_PASS,
  FROM_EMAIL = SMTP_USER,
} = process.env;

if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY in env");
if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) throw new Error("Missing SMTP_* vars");

// ---------- CONFIG ----------
export const config = {
  api: {
    bodyParser: true,
    sizeLimit: "1mb",
  },
};

// ---------- HANDLER ----------
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    /* 1️⃣  Grab the questionnaire answers */
    const answers = req.body as Record<string, string | string[]>;
    const toEmail = String(answers.email ?? ""); // you can rename this field

    /* 2️⃣  Generate an executive summary with OpenAI */
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an analyst producing a short executive summary.",
        },
        {
          role: "user",
          content: `Write a concise narrative (~200 words) interpreting these answers:\n${JSON.stringify(
            answers,
            null,
            2
          )}`,
        },
      ],
    });
    const summary = completion.choices[0].message.content ?? "(No summary)";

    /* 3️⃣  Build simple HTML */
    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 2rem; }
            h1   { color: #3b82f6; }
            table{ width: 100%; border-collapse: collapse; margin-top: 2rem; }
            td,th{ border: 1px solid #ddd; padding: .5rem; }
            th   { background:#f3f4f6; text-align:left; }
          </style>
        </head>
        <body>
          <h1>AI Readiness Scorecard</h1>
          <h2>Executive Summary</h2>
          <p>${summary}</p>

          <h2>Raw Responses</h2>
          <table>
            ${Object.entries(answers)
              .map(
                ([k, v]) =>
                  `<tr><th>${k}</th><td>${Array.isArray(v) ? v.join(", ") : v}</td></tr>`
              )
              .join("")}
          </table>
        </body>
      </html>
    `;

    /* 4️⃣  Render to PDF (edge-compatible Chromium) */
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();

    /* 5️⃣  Send e-mail with Nodemailer */
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: SMTP_SECURE === "true",
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    await transporter.sendMail({
      from: FROM_EMAIL,
      to: toEmail || FROM_EMAIL,
      subject: "Your AI Readiness Scorecard",
      text: "Attached is your AI Readiness PDF.",
      attachments: [
        {
          filename: "ai-readiness-scorecard.pdf",
          content: pdfBuffer,
        },
      ],
    });

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: String(err.message || err) });
  }
}
