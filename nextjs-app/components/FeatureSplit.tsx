export default function FeatureSplit({ title = 'Feature', copy = 'Beschreibung' }: { title?: string; copy?: string }) {
  return (
    <section className="py-12">
      <div className="container mx-auto grid md:grid-cols-2 gap-8 items-center">
        <div>
          <h3 className="text-2xl font-semibold">{title}</h3>
          <p className="mt-3 text-slate-600">{copy}</p>
        </div>
        <div className="h-48 bg-slate-100 rounded-2xl glass flex items-center justify-center">Bild</div>
      </div>
    </section>
  )
}


