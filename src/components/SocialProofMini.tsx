import { useEffect, useState } from 'react';

// Función para obtener el nombre del mes dinámico
const getDynamicMonth = () => {
    const now = new Date();
    const day = now.getDate();
    const monthIndex = day >= 27 ? now.getMonth() : now.getMonth() - 1;
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const index = (monthIndex + 12) % 12;
    return meses[index];
};

// Nueva función para generar un número aleatorio entre 1.0 y 5.5
const getRandomStats = () => {
    // Genera un número como 2.1, 3.5, 5.2, etc.
    const num = (Math.random() * (5.5 - 1.0) + 1.0).toFixed(1);
    return `${num}k+`;
};

const mockStats = {
    recent: [
        { name: "Andrés", from: "Zelle", to: "Banesco", time: "2m ago" },
        { name: "Mariana", from: "Venmo", to: "Pago Móvil", time: "5m ago" },
        { name: "Roberto", from: "CashApp", to: "Mercantil", time: "9m ago" },
        { name: "Elena", from: "PayPal", to: "USDT", time: "14m ago" },
        { name: "Carlos", from: "Depósito", to: "Provincial", time: "20m ago" },
        { name: "Yusneidy", from: "Zelle", to: "Pago Móvil", time: "26m ago" },
        { name: "Javier", from: "CashApp", to: "Bancamiga", time: "32m ago" },
        { name: "Sofía", from: "Venmo", to: "Banesco", time: "41m ago" },
        { name: "Luis", from: "Zelle", to: "USDT", time: "45m ago" },
        { name: "Mónica", from: "PayPal", to: "BDV", time: "53m ago" },
        { name: "Ricardo", from: "Zelle", to: "Banesco", time: "1h ago" },
        { name: "Beatriz", from: "Zelle", to: "Mercantil", time: "1h ago" },
        { name: "Gustavo", from: "CashApp", to: "Banesco", time: "1h ago" },
        { name: "Valeria", from: "Venmo", to: "Banesco Panamá", time: "2h ago" },
        { name: "Daniel", from: "Zelle", to: "Bancamiga", time: "2h ago" },
        { name: "Patricia", from: "PayPal", to: "Pago Móvil", time: "2h ago" },
        { name: "Franklin", from: "Depósito", to: "BDV", time: "3h ago" },
        { name: "Isabel", from: "Zelle", to: "Banesco", time: "3h ago" },
        { name: "Marcos", from: "CashApp", to: "USDT", time: "3h ago" },
        { name: "Gabriela", from: "Venmo", to: "Provincial", time: "4h ago" },
        { name: "Leonardo", from: "Zelle", to: "Bancaribe", time: "4h ago" },
        { name: "Raquel", from: "PayPal", to: "Pago Móvil", time: "5h ago" },
        { name: "Héctor", from: "Zelle", to: "Banplus", time: "5h ago" },
        { name: "Lorena", from: "CashApp", to: "Mercantil", time: "6h ago" },
        { name: "Osvaldo", from: "Venmo", to: "BNC", time: "6h ago" },
        { name: "Karina", from: "Zelle", to: "Banesco", time: "7h ago" },
        { name: "Fernando", from: "Depósito", to: "Pago Móvil", time: "7h ago" },
        { name: "Alicia", from: "PayPal", to: "USDT", time: "8h ago" },
        { name: "Manuel", from: "Deposito", to: "Mercantil", time: "8h ago" },
        { name: "Oriana", from: "Zelle", to: "Banesco", time: "9h ago" }
    ],
    // Ahora el número cambia cada vez que se recarga la página
    totals: `${getRandomStats()} Transferencias en ${getDynamicMonth()}`,
    rating: "4.9/5 Estrellas"
};

const SocialProofMini: React.FC = () => {
    const [current, setCurrent] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    const ROTATION_TIME = 5000;

    const slides = [
        ...mockStats.recent.map(r => ({
            icon: "💸",
            text: (
                <div className="text-[11px] leading-tight text-gray-700">
                    <div className="flex justify-between items-start">
                        <b>{r.name}</b> 
                        <span className="text-[9px] text-gray-400 font-normal uppercase ml-2">{r.time}</span>
                    </div>
                    envió desde <span className="text-purple-700 font-bold">{r.from}</span> <br/>
                    a <span className="text-blue-600 font-bold">{r.to}</span>
                </div>
            )
        })),
        { 
            icon: "✅", 
            text: <p className="text-[11px] font-bold text-gray-800 pt-1">{mockStats.totals}</p> 
        },
        { 
            icon: "⭐", 
            text: <p className="text-[11px] font-bold text-gray-800 pt-1">{mockStats.rating}</p> 
        }
    ];

    useEffect(() => {
        const showTimer = setTimeout(() => setIsVisible(true), 1500);
        const interval = setInterval(() => {
            setCurrent(prev => (prev + 1) % slides.length);
        }, ROTATION_TIME);

        return () => {
            clearTimeout(showTimer);
            clearInterval(interval);
        };
    }, [slides.length]);

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 left-4 z-[10000] bg-white/95 backdrop-blur-md border border-purple-100 p-2.5 rounded-lg shadow-2xl max-w-[210px] animate-in slide-in-from-left-8 duration-700">
            <div className="flex items-start gap-2.5">
                <div className="flex-shrink-0 bg-purple-50 w-7 h-7 rounded-full flex items-center justify-center text-xs">
                    {slides[current].icon}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                    {slides[current].text}
                </div>
                <button 
                    onClick={() => setIsVisible(false)} 
                    className="flex-shrink-0 text-gray-300 hover:text-gray-500 transition-colors"
                >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            
            <div className="w-full bg-gray-100 h-[2px] mt-2 rounded-full overflow-hidden">
                <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-full transition-all linear" 
                    style={{ 
                        width: '100%', 
                        transitionDuration: `${ROTATION_TIME}ms` 
                    }} 
                    key={current}
                ></div>
            </div>
        </div>
    );
};

export default SocialProofMini;