import { Loader2 } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-screen bg-amber-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="size-8 animate-spin text-amber-700" />
        <p className="text-sm text-amber-800">Cargando...</p>
      </div>
    </div>
  );
}
