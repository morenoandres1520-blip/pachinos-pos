'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Por favor ingresa tu correo y contraseña');
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      toast.error('Error al iniciar sesión', {
        description: error.message === 'Invalid login credentials'
          ? 'Correo o contraseña incorrectos'
          : error.message,
      });
      return;
    }

    toast.success('Bienvenido a PaChinos');
    router.refresh();
    router.push('/pos');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-amber-50 to-orange-50 px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Branding */}
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-amber-900">
            PaChinos
          </h1>
          <p className="mt-2 text-sm text-amber-700">
            Punto de Venta
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4 rounded-xl bg-white p-6 shadow-lg shadow-amber-900/5 ring-1 ring-amber-900/10">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-amber-900">
                Correo electrónico
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="correo@pachinos.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="h-12 border-amber-200 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-amber-900">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="h-12 border-amber-200 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="h-12 w-full bg-amber-700 text-white hover:bg-amber-800 active:bg-amber-900"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Ingresando...
              </>
            ) : (
              'Iniciar sesión'
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-amber-600">
          PaChinos Calzado &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
