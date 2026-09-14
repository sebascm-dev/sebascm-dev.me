// Portfolio home — all sections
import { connection } from 'next/server'
import Hero from '@/components/sections/Hero'
import About from '@/components/sections/About'
import Projects from '@/components/sections/Projects'
import Skills from '@/components/sections/Skills'
import Contact from '@/components/sections/Contact'
import { getProfile } from '@/app/actions/profile'

export default async function Home() {
  // Render at request time instead of prerendering at build time. The database
  // lives on the internal Docker network of the VPS, which the build step is
  // not guaranteed to reach; without this, a deploy fails whenever it can't.
  await connection()
  const profile = await getProfile()

  return (
    <>
      <Hero profile={profile} />
      <About />
      <Projects />
      <Skills />
      <Contact />
    </>
  )
}
