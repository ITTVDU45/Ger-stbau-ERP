export default function HowItWorks() {
  const steps = [
    { title: '1. Anfrage', text: 'Telefonnummer eingeben' },
    { title: '2. Analyse', text: 'KI wertet Gespräch aus' },
    { title: '3. Zusammenfassung', text: 'Ergebnis per Mail' },
    { title: '4. Follow-up', text: 'Optionaler Rückruf' }
  ]

  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto grid md:grid-cols-4 gap-6">
        {steps.map((s) => (
          <div key={s.title} className="p-4 rounded-2xl glass">
            <div className="text-xl font-bold">{s.title}</div>
            <div className="mt-2 text-slate-600">{s.text}</div>
          </div>
        ))}
      </div>
    </section>
  )
}


