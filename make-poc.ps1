# ╔═════════════════════════════════════════════════════════════════╗
# ║  AI-Readiness POC - full scaffold (Next.js + Tailwind + GPT)   ║
# ║  Save as make-poc.ps1   •   run in elevated PowerShell window   ║
# ╚═════════════════════════════════════════════════════════════════╝
$base = "C:\Users\Matt\AI-Readiness\ai-readiness-poc"
Remove-Item $base -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $base | Out-Null
Set-Location $base

# ---------- helper: write file, ensuring folder exists ------------
function Write-File($Path,$Content){
  $dir = Split-Path $Path
  if(-not (Test-Path $dir)){ New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  $Content | Out-File $Path -Encoding utf8
}

# ---------- 1. package.json ---------------------------------------
Write-File "package.json" @'
{
  "name": "ai-readiness-poc",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "14.2.3",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "openai": "4.28.4",
    "nodemailer": "6.9.8",
    "html-pdf-node": "^1.0.0",
    "tailwindcss": "3.4.4",
    "postcss": "8.4.31",
    "autoprefixer": "10.4.16"
  },
  "devDependencies": {
    "typescript": "5.4.4"
  }
}
'@

# ---------- 2. project configs ------------------------------------
Write-File "next.config.js" @'
module.exports = { reactStrictMode: true };
'@

Write-File "tailwind.config.js" @'
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: []
};
'@

Write-File "postcss.config.js" @'
module.exports = {
  plugins: { tailwindcss: {}, autoprefixer: {} }
};
'@

# ---------- 3. env template ---------------------------------------
Write-File ".env.local.example" @'
OPENAI_API_KEY="YOUR_OPENAI_KEY_HERE"
SMTP_USER="matt@everysolutionit.com"
SMTP_PASS="YOUR_KEY_FOR EMAIL"
'@

# ---------- 4. styles ---------------------------------------------
Write-File "src/styles/globals.css" @'
@tailwind base;
@tailwind components;
@tailwind utilities;

body { @apply bg-gray-50 text-gray-900; }
'@

# ---------- 5. _app ------------------------------------------------
Write-File "src/pages/_app.tsx" @'
import "@/styles/globals.css";
import type { AppProps } from "next/app";
export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
'@

# ---------- 6. Question component ---------------------------------
Write-File "src/components/Question.tsx" @'
import React from "react";
export default function Question({ q, value, onChange }:{
  q:any; value:any; onChange:(id:string,v:any)=>void;
}){
  const box="mb-4";
  if(q.type==="multiple-choice") return (
    <div className={box}>
      <label className="block font-medium mb-2">{q.text}</label>
      {q.options.map((o:string)=>
        <label key={o} className="mr-4">
          <input type="radio" name={q.id} value={o}
                 checked={value===o}
                 onChange={()=>onChange(q.id,o)} /> {o}
        </label>)}
    </div>);
  if(q.type==="Likert 1-5") return (
    <div className={box}>
      <label className="block font-medium mb-2">{q.text}</label>
      {["1","2","3","4","5"].map(n=>
        <label key={n} className="mr-2">
          <input type="radio" name={q.id} value={n}
                 checked={value===n}
                 onChange={()=>onChange(q.id,n)} /> {n}
        </label>)}
    </div>);
  if(q.type==="yes/no") return (
    <div className={box}>
      <label className="block font-medium mb-2">{q.text}</label>
      {["Yes","No"].map(a=>
        <label key={a} className="mr-4">
          <input type="radio" name={q.id} value={a}
                 checked={value===a}
                 onChange={()=>onChange(q.id,a)} /> {a}
        </label>)}
    </div>);
  return (
    <div className={box}>
      <label className="block font-medium mb-2">{q.text}</label>
      <textarea className="w-full border rounded p-2"
                value={value||""}
                onChange={e=>onChange(q.id,e.target.value)} />
    </div>);
}
'@

# ---------- 7. minimal questionnaire (replace later) --------------
Write-File "src/data/insurance-readiness.json" @'
{
  "questions": [
    {
      "id": "org_size",
      "text": "Choose your employee bracket.",
      "type": "multiple-choice",
      "options": ["1-10","11-50","51-200","201-500","500+"],
      "category": "Profile & Scale",
      "rationale": "Headcount affects the scope and cost of automation."
    }
  ],
  "rubric": {
    "Foundational": "0-35",
    "Emerging": "36-60",
    "Advanced": "61-75"
  }
}
'@

# ---------- 8. index page -----------------------------------------
Write-File "src/pages/index.tsx" @'
import { useState } from "react";
import questionsJson from "@/data/insurance-readiness.json";
import Question from "@/components/Question";

export default function Home(){
  const [answers,set]=useState<Record<string,any>>({});
  const [loading,setLoading]=useState(false);
  const [pdfUrl,setPdf]=useState<string|null>(null);
  const qList:any[]=(questionsJson as any).questions;

  const update=(id:string,v:any)=>set(a=>({...a,[id]:v}));

  async function handleSubmit(){
    setLoading(true);
    const r=await fetch("/api/generateReport",{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify(answers)
    });
    const d=await r.json(); setPdf(d.pdfUrl); setLoading(false);
  }

  return (
    <main className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6">AI Readiness Assessment</h1>
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {["contact_name","business_name","website","email"].map(f=>
          <input key={f} className="border rounded p-2 w-full" type="text"
                 placeholder={f.replace("_"," ").toUpperCase()}
                 onChange={e=>update(f,e.target.value)} />)}
      </div>
      {qList.map(q=>
        <Question key={q.id} q={q} value={answers[q.id]} onChange={update} />)}
      <button onClick={handleSubmit} disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded">
        {loading?"Generating…":"Generate Report"}
      </button>
      {pdfUrl&&<div className="mt-6 p-4 border rounded bg-green-50">
        <p className="mb-2 font-semibold">Report ready!</p>
        <a href={pdfUrl} target="_blank" rel="noreferrer"
           className="text-blue-700 underline mr-4">Download PDF</a>
        <a href="https://calendarbridge.com/book/matt-slade/"
           className="text-blue-700 underline">Book a consult</a>
      </div>}
    </main>);
}
'@

# ---------- 9. API route -----------------------------------------
Write-File "src/pages/api/generateReport.ts" @'
import type { NextApiRequest,NextApiResponse } from "next";
import OpenAI from "openai";
import nodemailer from "nodemailer";
const pdf = require("html-pdf-node");

export default async function handler(req:NextApiRequest,res:NextApiResponse){
  if(req.method!=="POST") return res.status(405).end();
  const answers=req.body;
  const openai=new OpenAI({ apiKey:process.env.OPENAI_API_KEY });

  const completion=await openai.chat.completions.create({
    model:"gpt-4o-mini", temperature:0.5,
    messages:[
      { role:"system", content:"You are an AI readiness consultant. Return <html>…</html> under 10KB." },
      { role:"user", content:JSON.stringify(answers) }
    ]
  });
  const html=completion.choices[0].message.content||"<p>No content</p>";
  const pdfBuf:Buffer=await pdf.generatePdf({ content:html },{ format:"A4" });

  const mailer=nodemailer.createTransport({
    service:"gmail",
    auth:{ user:process.env.SMTP_USER, pass:process.env.SMTP_PASS }
  });
  const mail=(to:string)=>({
    from:`Every Solution IT <${process.env.SMTP_USER}>`, to,
    subject:"Your AI Readiness Report",
    html:`${html}<p><a href="https://calendarbridge.com/book/matt-slade/">Book a consult »</a></p>`,
    attachments:[{ filename:"AI-Readiness.pdf", content:pdfBuf }]
  });
  await Promise.all([
    mailer.sendMail(mail(answers.email)),
    mailer.sendMail(mail("info@everysolutionit.com"))
  ]);
  res.status(200).json({ pdfUrl:`data:application/pdf;base64,${pdfBuf.toString("base64")}` });
}
'@

```bash
# local dev
cp .env.local.example .env.local  # add keys
npm install
npm run dev
# → http://localhost:3000
