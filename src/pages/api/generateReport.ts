import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import nodemailer from 'nodemailer';
const pdf = require('html-pdf-node');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    /* answers */
    const a = req.body;
    const list = Array.isArray(a.core_tools) ? a.core_tools.join(', ') : '';
    const other = (a.other_tools || '').toString().trim();
    const tools =
      (list + (other ? ', ' + other : '')).replace(/^,|,$/g, '') ||
      'unspecified tools';

    /* GPT-3.5 → HTML */
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content: [
            'You are an AI-readiness consultant for independent insurance agencies.',
            'Return ONLY valid <html>, ~900 words, with these H2 sections:',
            '1. Executive Summary',
            '2. Independent-Agency AI Wins (2–3 indie examples, no Lemonade/GEICO)',
            '3. Near-Neighbor Insights (MGAs, wholesale brokers, small banks, TPAs)',
            '4. Five Quick Wins (≤60 days)',
            '5. 90-Day Action Plan',
            '6. Tool-Stack Integration Map (use their tools: ' + tools + ')',
            'End each section with 1–2 takeaway bullets. Brand blue #034694.'
          ].join('\n')
        },
        { role: 'user', content: JSON.stringify(a) }
      ]
    });

    const html = (completion.choices[0].message?.content ?? '').trim();
    if (!html.startsWith('<'))
      throw new Error('LLM did not return valid HTML — please retry.');

    /* HTML → PDF */
    const pdfBuffer: Buffer = await pdf.generatePdf(
      { content: html },
      { format: 'A4' }
    );

    /* e-mail PDF */
    const mailer = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    const send = (to: string) =>
      mailer.sendMail({
        from: `Every Solution IT <${process.env.SMTP_USER}>`,
        to,
        subject: 'Your AI Readiness Report',
        html,
        attachments: [{ filename: 'AI-Readiness.pdf', content: pdfBuffer }]
      });
    await Promise.all([send(a.email), send('info@everysolutionit.com')]);

    /* return plain base-64 (no data-URI) */
    res.status(200).json({
      pdfBase64: pdfBuffer.toString('base64').replace(/\s+/g, '')
    });
  } catch (err: any) {
    console.error('generateReport error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
}
