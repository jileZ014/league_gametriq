'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CoachPage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/coach/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-400">Redirecting to Coach Dashboard...</p>
      </div>
    </div>
  );
}