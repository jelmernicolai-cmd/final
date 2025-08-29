import Link from 'next/link';
import LanguageSwitch from '@/components/LanguageSwitch';

export default function Nav() {
  return (
    <header className="border-b">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2">
          <img src="/images/logo.svg" alt="PharmaGtN" className="h-7 w-auto" />
          <span className="font-semibold">PharmaGtN</span>
        </Link>
<nav className="ml-auto flex items-center gap-5 text-sm">
  <Link href="/features" className="hover:underline">Functionaliteit</Link>
  <Link href="/pricing" className="hover:underline">Prijzen</Link>
  <Link href="/about" className="hover:underline">Over</Link>
  <Link href="/contact" className="hover:underline">Contact</Link>
  <Link href="/app" className="hover:underline">App</Link>
  <LanguageSwitch />
</nav>
      </div>
    </header>
  );
}
