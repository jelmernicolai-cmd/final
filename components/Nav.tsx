'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

function toLocalePath(pathname: string, target: 'nl'|'en'){
  if(!pathname) return target === 'en' ? '/en' : '/'
  const isEn = pathname.startsWith('/en')
  if(target === 'en'){
    return isEn ? pathname : '/en' + (pathname === '/' ? '' : pathname)
  } else {
    return isEn ? (pathname.replace('/en','') || '/') : pathname
  }
}

export default function Nav(){
  const pathname = usePathname() || '/'
  const isEn = pathname.startsWith('/en')
  const base = isEn ? '/en' : ''
  return (
    <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
      <nav className="container px-4 py-3 flex items-center gap-4 justify-between">
        <Link href={isEn?'/en':'/'} className="font-semibold text-lg flex items-center gap-2">
          <img src="/images/logo.svg" alt="PharmaGtN" className="h-6 w-6" />
          PharmaGtN
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <Link href={base + '/features'} className="hover:underline">Features</Link>
          <Link href={base + '/pricing'} className="hover:underline">Pricing</Link>
          <Link href={base + '/about'} className="hover:underline">{isEn?'About':'Over ons'}</Link>
          <Link href={base + '/contact'} className="hover:underline">Contact</Link>
          <Link href={toLocalePath(pathname, isEn?'nl':'en')} className="ml-2 rounded-xl px-3 py-1.5 border bg-white hover:bg-slate-50">{isEn?'NL':'EN'}</Link>
        </div>
      </nav>
    </header>
  )
}
