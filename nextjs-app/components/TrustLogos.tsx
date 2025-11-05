export default function TrustLogos() {
  const logos = ['DSGVO', 'ISO', 'Trusted']
  return (
    <div className="mt-10 flex gap-6 items-center">
      {logos.map((l) => (
        <div key={l} className="opacity-80 hover:opacity-100 transition">{l}</div>
      ))}
    </div>
  )
}


