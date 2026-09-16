// Portfolio route group layout — Navbar + Footer + EasterEgg + cursor propio
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import EasterEggListener from '@/components/easter-egg/EasterEggListener'
import CustomCursor from '@/components/ui/CustomCursor'

export default function PortfolioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar />
      <EasterEggListener />
      <CustomCursor />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  )
}
