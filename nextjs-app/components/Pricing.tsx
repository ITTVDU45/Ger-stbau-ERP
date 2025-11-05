export default function Pricing() {
  const plans = [
    { name: 'Starter', price: '€19', features: ['50 Min'] },
    { name: 'Business', price: '€49', features: ['250 Min'] },
    { name: 'Scale', price: '€149', features: ['unbegrenzt'] }
  ]

  return (
    <section className="py-12">
      <div className="container mx-auto grid md:grid-cols-3 gap-6">
        {plans.map((p) => (
          <div key={p.name} className="p-6 rounded-2xl glass">
            <div className="text-xl font-semibold">{p.name}</div>
            <div className="mt-2 text-3xl font-bold">{p.price}</div>
            <ul className="mt-4 space-y-2 text-slate-600">
              {p.features.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}


