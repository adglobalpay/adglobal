import { useState, useEffect } from 'react'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Variable para el año dinámico
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
  }, [isOpen]);

  const navLinks = [
    { name: 'Servicios', href: '#servicios' },
    { name: 'Reseñas', href: '#resenas' },
    { name: 'Nosotros', href: '#nosotros' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-[200] transition-all duration-300 ${
      scrolled ? 'bg-white shadow-md py-3' : 'bg-white py-5'
    }`}>
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#4B44E7]" />

      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center relative z-[210]">
        <a href="/" className="flex items-center gap-2">
          <img src="/img/logo.webp" alt="Logo" className="h-9 w-auto" />
          <span className="font-bold text-sm tracking-tight text-slate-900 uppercase">
            AD <span className="text-[#4B44E7]">GLOBAL PAY</span>
          </span>
        </a>
        
        <button 
          className="lg:hidden p-2 text-[#4B44E7] transition-transform active:scale-90" 
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <span className="text-3xl font-light">✕</span>
          ) : (
            <div className="w-6 h-4 flex flex-col justify-between">
              <span className="h-0.5 w-full bg-current rounded-full" />
              <span className="h-0.5 w-full bg-current rounded-full" />
              <span className="h-0.5 w-full bg-current rounded-full" />
            </div>
          )}
        </button>

        <div className="hidden lg:flex gap-8">
          {navLinks.map((link) => (
            <a key={link.name} href={link.href} className="text-xs font-bold text-slate-500 hover:text-[#4B44E7] uppercase tracking-widest">
              {link.name}
            </a>
          ))}
        </div>
      </div>

      {/* OVERLAY MÓVIL */}
      <div className={`lg:hidden fixed inset-0 bg-white transition-transform duration-500 ease-in-out ${
        isOpen ? 'translate-y-0' : '-translate-y-full'
      }`} style={{ zIndex: 100 }}>
        
        <div className="flex flex-col h-full pt-32 px-10">
          <div className="flex flex-col gap-8">
            {navLinks.map((link) => (
              <a 
                key={link.name}
                href={link.href} 
                onClick={() => setIsOpen(false)}
                className="text-xl font-bold text-slate-900 uppercase tracking-tight border-b border-slate-100 pb-4"
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Footer del Menú con Año Dinámico */}
          <div className="mt-auto pb-10 text-center">
            <p className="text-[#4B44E7] font-black text-xs tracking-[0.3em] uppercase mb-2">IN GOD WE TRUST</p>
            <p className="text-slate-400 text-[11px] font-medium uppercase tracking-tighter">
              © 2024 - {currentYear} AD Global Services
            </p>
          </div>
        </div>
      </div>
    </nav>
  )
}