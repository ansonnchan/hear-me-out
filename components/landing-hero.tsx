import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Cat, LockKeyhole, Sparkles } from 'lucide-react'
import heroArtwork from '@/assets/hear-me-out-hero-v2.png'

export function LandingHero() {
  return (
    <section className="relative isolate h-svh min-h-[640px] w-full overflow-hidden">
      <Image
        src={heroArtwork}
        alt="A cozy illustrated study opening onto a cherry-blossom town and distant mountains"
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(27,19,16,.16)_0%,rgba(32,22,18,.03)_44%,rgba(44,28,23,.14)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_56%_48%,rgba(54,33,25,.34)_0%,rgba(54,33,25,.18)_31%,transparent_58%)]" />

      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-5 text-[#fffaf0] sm:px-9 sm:py-7">
        <Link href="/" className="group inline-flex items-center gap-3" aria-label="hear me out home">
          <span className="flex h-9 w-9 items-center justify-center text-[#fffaf0] transition group-hover:-rotate-6">
            <Sparkles size={28} strokeWidth={1.6} />
          </span>
          <span className="font-hand block text-2xl font-bold leading-none [text-shadow:0_2px_12px_rgba(25,16,12,.38)]">hear me out</span>
        </Link>

        <nav className="flex items-center gap-1 rounded-full bg-[#3c2a23]/18 p-1 text-xs font-medium backdrop-blur-[3px] sm:text-sm">
          <Link href="/" className="rounded-full bg-white/14 px-3 py-2 text-white shadow-sm sm:px-4">Home</Link>
          <Link href="/personalities" className="rounded-full px-3 py-2 text-white/78 transition hover:bg-white/12 hover:text-white sm:px-4">Personalities</Link>
        </nav>
      </header>

      <div className="pointer-events-none absolute left-[10.2%] top-[38%] hidden w-[21%] -rotate-1 text-center text-[#6c584a] lg:block">
        <p className="font-cjk text-[clamp(.75rem,1vw,1rem)] leading-[1.9]">心に浮かんだことを、<br />言葉にしてみよう。</p>
        <Cat className="mx-auto mt-2 opacity-55" size={23} strokeWidth={1.25} />
      </div>

      <div className="absolute left-[7%] top-1/2 z-10 w-[86%] max-w-[660px] -translate-y-[38%] text-[#fffaf1] sm:left-[41%] sm:w-[52%] sm:-translate-y-[46%] lg:left-[40%]">
        <h1 className="font-hand text-[clamp(2.8rem,4.8vw,4.9rem)] font-normal leading-[1.03] tracking-[-0.035em] text-[#fff5e6] [text-shadow:0_3px_18px_rgba(36,21,16,.65)]">
          Same thought.<br />Different lens.
        </h1>
        <p className="mt-5 max-w-[360px] text-[13px] font-medium leading-6 text-[#fff7eb]/90 [text-shadow:0_2px_10px_rgba(35,21,16,.72)] sm:text-sm">
          Share what&apos;s on your mind and hear it reflected through different perspectives.
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link href="/vent" className="inline-flex h-11 items-center gap-2 rounded-full bg-[#9e88bf] px-5 text-sm font-semibold text-white shadow-[0_9px_24px_rgba(54,35,69,.28)] transition hover:-translate-y-0.5 hover:bg-[#8f78b2]">
            Start reflecting <ArrowRight size={15} />
          </Link>
          <Link href="/personalities" className="inline-flex h-11 items-center rounded-full border border-white/30 bg-[#4a3328]/16 px-5 text-sm font-medium text-white/88 backdrop-blur-[4px] transition hover:bg-white/15">
            Meet the personalities
          </Link>
        </div>

        <p className="mt-4 inline-flex items-center gap-2 text-[11px] leading-5 text-white/68 [text-shadow:0_1px_6px_rgba(35,21,16,.5)]">
          <LockKeyhole size={12} /> No sign-up. No history. Everything stays with you.
        </p>
      </div>

      <span className="absolute right-[29%] top-[18%] h-2.5 w-2.5 rotate-45 rounded-[3px] bg-[#efb5ae]/75" />
      <span className="absolute right-[22%] top-[33%] h-2 w-2 rotate-12 rounded-full bg-[#f4d2b8]/80" />
      <span className="absolute bottom-[18%] left-[48%] h-2.5 w-2 rotate-45 rounded-[3px] bg-[#edaeaa]/70" />
    </section>
  )
}
