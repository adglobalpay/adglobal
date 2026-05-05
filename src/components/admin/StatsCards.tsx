import React, { useEffect, useState, useRef } from 'react';
import { Users, Coins, TrendingUp, UserCheck, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const stats = [
  { label: 'Clientes totales', value: 156, suffix: '', change: '+12%', isPositive: true, icon: <Users size={20} className="text-blue-500" />, bgLight: 'bg-blue-50', bgIcon: 'bg-blue-100/50', color: 'text-blue-600' },
  { label: 'Transacciones hoy', value: 23, suffix: '', change: '+5%', isPositive: true, icon: <Coins size={20} className="text-emerald-500" />, bgLight: 'bg-emerald-50', bgIcon: 'bg-emerald-100/50', color: 'text-emerald-600' },
  { label: 'Volumen hoy', value: 4850, prefix: '$', suffix: '', change: '+8%', isPositive: true, icon: <TrendingUp size={20} className="text-indigo-500" />, bgLight: 'bg-indigo-50', bgIcon: 'bg-indigo-100/50', color: 'text-indigo-600' },
  { label: 'Pendientes KYC', value: 8, suffix: '', change: '-3%', isPositive: false, icon: <UserCheck size={20} className="text-amber-500" />, bgLight: 'bg-amber-50', bgIcon: 'bg-amber-100/50', color: 'text-amber-600' },
];

function AnimatedNumber({ value, prefix = '', suffix = '', duration = 1500 }: { value: number; prefix?: string; suffix?: string; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const startTime = performance.now();
          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            setDisplayValue(Math.round(value * easeOut));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value, duration, hasAnimated]);

  return (
    <span ref={ref}>
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  );
}

export default function StatsCards() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <div 
          key={index} 
          className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-200/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:border-slate-300/80 transition-all duration-500 group relative overflow-hidden card-hover"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${index * 80}ms`
          }}
        >
          {/* Decorative background circle */}
          <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full opacity-[0.04] pointer-events-none group-hover:scale-150 transition-transform duration-700 bg-current" style={{ color: stat.color }}></div>
          
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bgLight} ${stat.bgIcon} border border-white/50 backdrop-blur-sm shadow-inner transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
              {stat.icon}
            </div>
            
            <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg transition-all duration-300 ${stat.isPositive ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' : 'text-rose-600 bg-rose-50 border border-rose-100'} group-hover:shadow-sm`}>
              {stat.isPositive ? <ArrowUpRight size={12} strokeWidth={3} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /> : <ArrowDownRight size={12} strokeWidth={3} />}
              {stat.change}
            </div>
          </div>
          
          <div className="text-3xl font-extrabold text-slate-800 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            <AnimatedNumber value={stat.value} prefix={stat.prefix || ''} suffix={stat.suffix || ''} />
          </div>
          <div className="text-slate-500 text-xs font-semibold mt-1 uppercase tracking-wider">
            {stat.label}
          </div>
          
          {/* Bottom progress line */}
          <div className="mt-4 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ease-out ${stat.bgLight.replace('bg-', 'bg-').replace('50', '400')}`}
              style={{ 
                width: isVisible ? `${Math.min((stat.value / 200) * 100, 100)}%` : '0%',
                transitionDelay: `${index * 100 + 300}ms`
              }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  );
}
