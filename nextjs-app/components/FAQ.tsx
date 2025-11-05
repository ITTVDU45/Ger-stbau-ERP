export default function FAQ() {
  const faqs = [
    { q: 'Was ist KI-Telefonie?', a: 'Automatische Analyse von Anrufen.' },
    { q: 'Ist das DSGVO-konform?', a: 'Ja, mit geeigneten Prozessen.' }
  ]

  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto space-y-4">
        {faqs.map((f) => (
          <details key={f.q} className="p-4 rounded-2xl glass">
            <summary className="font-semibold">{f.q}</summary>
            <div className="mt-2 text-slate-600">{f.a}</div>
          </details>
        ))}
      </div>
    </section>
  )
}


