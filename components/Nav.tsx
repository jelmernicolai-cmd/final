'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

function swapLocale(pathname: string){
  if(!pathname) return '/en'
  if(pathname === '/') return '/en'
  return pathname.startsWith('/en') ? (pathname.replace('/en','') || '/') : '/en' + pathname
}

export default function Nav(){
  const pathname = usePathname()
  const en = pathname?.startsWith('/en')
  return (
    <header className="border-b bg-white/80 backdrop-blur">
      <nav className="container px-4 py-3 flex items-center gap-4 justify-between">
        <Link href={en?'/en':'/'} className="font-semibold text-lg">PharmaGtN</Link>
        <div className="flex items-center gap-3 text-sm">
          <Link href={(en?'/en':'') + '/features'} className="hover:underline">Features</Link>
          <Link href={(en?'/en':'') + '/pricing'} className="hover:underline">Pricing</Link>
          <Link href={(en?'/en':'') + '/contact'} className="hover:underline">Contact</Link>
          <Link href={(en?'/en':'') + '/app'} className="rounded-xl px-3 py-1.5 border bg-blue-600 text-white hover:bg-blue-700">App</Link>
          <Link href={swapLocale(pathname || '/')} className="ml-2 rounded-xl px-3 py-1.5 border bg-white hover:bg-slate-50">{en?'NL':'EN'}</Link>
        </div>
      </nav>
    </header>
  )
}
