'use client';

import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="window max-w-lg w-full">
        <div className="title-bar">
          <div className="title-bar-text">CEDEAR.AI - Automated Hedge Fund</div>
          <div className="title-bar-controls">
            <button aria-label="Minimize" />
            <button aria-label="Maximize" />
            <button aria-label="Close" />
          </div>
        </div>
        <div className="window-body">
          <h1 className="text-2xl font-bold mb-2">CEDEAR.AI</h1>
          <p className="mb-6 text-sm">
            Automated Hedge Fund Management System powered by Artificial Intelligence.
          </p>
          <div className="field-row justify-end">
            <button className="default" type="button" onClick={() => router.push('/trading')}>
              Enter Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
