'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="es">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-amber-50 px-4 text-center">
        <div className="rounded-full bg-red-100 p-4">
          <AlertTriangle className="size-10 text-red-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Error inesperado</h2>
          <p className="mt-1 text-sm text-gray-500">
            {error.message || 'La aplicación encontró un problema.'}
          </p>
        </div>
        <button
          onClick={reset}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Intentar de nuevo
        </button>
      </body>
    </html>
  );
}
