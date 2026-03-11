'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-mono p-8">
      <h1 className="text-6xl font-bold mb-8 text-center uppercase tracking-tighter border-b-8 border-white pb-4">
        CEDEAR<span className="text-neon-green">.AI</span>
      </h1>
      <p className="text-xl mb-12 text-gray-400 max-w-2xl text-center">
        Automated Hedge Fund Management System powered by Artificial Intelligence.
      </p>
      
      <Link 
        href="/trading"
        className="px-12 py-6 text-2xl font-bold uppercase tracking-widest border-4 border-white bg-neon-green text-black hover:bg-white transition-all transform hover:scale-105"
      >
        Enter Dashboard
      </Link>

      <style jsx global>{`
        .bg-neon-green { background-color: #ccff00; }
        .text-neon-green { color: #ccff00; }
      `}</style>
    </div>
  );
}
