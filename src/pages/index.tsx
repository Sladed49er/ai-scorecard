'use client';

import { useState, useEffect } from 'react';
import qs from '@/data/insurance-readiness.json';
import Question from '@/components/Question';

export default function Home() {
  const [answers, set] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const questions: any[] = (qs as any).questions;
  const update = (id: string, v: any) => set((p) => ({ ...p, [id]: v }));

  /* revoke Blob URL when component unmounts */
  useEffect(
    () => () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    },
    [pdfUrl]
  );

  async function handleSubmit() {
    setLoading(true);
    setPdfUrl(null);

    const res = await fetch('/api/generateReport', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(answers)
    });
    const data = await res.json();

    if (data.error) {
      alert('Server error: ' + data.error);
    } else if (data.pdfBase64) {
      const bytes = Uint8Array.from(atob(data.pdfBase64), (c) =>
        c.charCodeAt(0)
      );
      const blobUrl = URL.createObjectURL(
        new Blob([bytes], { type: 'application/pdf' })
      );
      setPdfUrl(blobUrl);
    } else {
      alert('Unexpected response from server.');
    }

    setLoading(false);
  }

  return (
    <main className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6">AI Readiness Quick Check</h1>

      {questions.map((q) => (
        <Question key={q.id} q={q} value={answers[q.id]} onChange={update} />
      ))}

      <button
        disabled={loading}
        onClick={handleSubmit}
        className="px-6 py-2 bg-blue-600 text-white rounded"
      >
        {loading ? 'Generating…' : 'Generate Report'}
      </button>

      {pdfUrl && (
        <div className="mt-6 p-4 border rounded bg-green-50">
          <p className="font-semibold mb-2">Report ready!</p>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="text-blue-700 underline mr-4"
          >
            Download PDF
          </a>
          <a
            href="https://calendarbridge.com/book/matt-slade/"
            target="_blank"
            rel="noreferrer"
            className="text-blue-700 underline"
          >
            Book a consult
          </a>
        </div>
      )}
    </main>
  );
}
