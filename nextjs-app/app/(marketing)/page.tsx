import Hero from '../../components/Hero'
import TrustLogos from '../../components/TrustLogos'
import FeatureSplit from '../../components/FeatureSplit'
import HowItWorks from '../../components/HowItWorks'
import Pricing from '../../components/Pricing'
import FAQ from '../../components/FAQ'
import Footer from '../../components/Footer'

export default function Page() {
  return (
    <main className="min-h-screen flex flex-col">
      <section className="container mx-auto py-20 px-6">
        <Hero />
        <TrustLogos />
      </section>

      <FeatureSplit />
      <HowItWorks />
      <Pricing />
      <FAQ />
      <Footer />
    </main>
  )
}


