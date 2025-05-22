import React from 'react';

export default function Question({
  q,
  value,
  onChange
}: {
  q: any;
  value: any;
  onChange: (id: string, v: any) => void;
}) {
  const box = 'mb-5';

  if (q.type === 'short-text' || q.type === 'long-text') {
    return (
      <div className={box}>
        <label className="block font-medium mb-1">{q.text}</label>
        {q.type === 'short-text' ? (
          <input
            className="w-full border rounded p-2"
            value={value || ''}
            onChange={(e) => onChange(q.id, e.target.value)}
          />
        ) : (
          <textarea
            className="w-full border rounded p-2"
            rows={3}
            value={value || ''}
            onChange={(e) => onChange(q.id, e.target.value)}
          />
        )}
      </div>
    );
  }

  if (q.type === 'yes/no') {
    return (
      <div className={box}>
        <p className="font-medium mb-1">{q.text}</p>
        {['Yes', 'No'].map((opt) => (
          <label key={opt} className="mr-6">
            <input
              type="radio"
              name={q.id}
              value={opt}
              checked={value === opt}
              onChange={() => onChange(q.id, opt)}
            />{' '}
            {opt}
          </label>
        ))}
      </div>
    );
  }

  if (q.type === 'multiple-choice') {
    return (
      <div className={box}>
        <p className="font-medium mb-1">{q.text}</p>
        {q.options.map((opt: string) =>
          q.multi ? (
            <label key={opt} className="block">
              <input
                type="checkbox"
                checked={Array.isArray(value) && value.includes(opt)}
                onChange={(e) => {
                  const prev = Array.isArray(value) ? value : [];
                  onChange(
                    q.id,
                    e.target.checked
                      ? [...prev, opt]
                      : prev.filter((x) => x !== opt)
                  );
                }}
              />{' '}
              {opt}
            </label>
          ) : (
            <label key={opt} className="mr-4">
              <input
                type="radio"
                name={q.id}
                value={opt}
                checked={value === opt}
                onChange={() => onChange(q.id, opt)}
              />{' '}
              {opt}
            </label>
          )
        )}
      </div>
    );
  }

  return null;
}
