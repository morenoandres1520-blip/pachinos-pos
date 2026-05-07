'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function DashboardError({
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
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="rounded-full bg-destructive/10 p-4">
        <AlertTriangle className="size-10 text-destructive" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">Algo salió mal</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {error.message || 'Ocurrió un error inesperado.'}
        </p>
      </div>
      <Button variant="outline" onClick={reset}>
        Intentar de nuevo
      </Button>
    </div>
  );
}
