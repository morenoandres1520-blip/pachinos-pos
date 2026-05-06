'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Profile, UserRole } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

interface UserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: Profile | null;
  onSuccess: () => void;
}

export function UserForm({ open, onOpenChange, user, onSuccess }: UserFormProps) {
  const supabase = createClient();
  const isEditing = !!user;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('cajera');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Reset form when user changes or sheet opens
  useEffect(() => {
    if (open) {
      if (user) {
        setFullName(user.full_name);
        setEmail(user.email);
        setPassword('');
        setRole(user.role);
        setIsActive(user.is_active);
      } else {
        setFullName('');
        setEmail('');
        setPassword('');
        setRole('cajera');
        setIsActive(true);
      }
    }
  }, [open, user]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error('El nombre completo es requerido');
      return;
    }

    if (!isEditing && !email.trim()) {
      toast.error('El correo es requerido');
      return;
    }

    if (!isEditing && password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setSaving(true);

    try {
      if (isEditing) {
        // Update profile in profiles table
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: fullName.trim(),
            role,
            is_active: isActive,
          })
          .eq('id', user.id);

        if (error) throw error;
        toast.success('Usuario actualizado');
      } else {
        // Create new user via API route
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            password,
            full_name: fullName.trim(),
            role,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Error al crear usuario');
        }

        toast.success('Usuario creado exitosamente');
      }

      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(isEditing ? 'Error al actualizar' : 'Error al crear usuario', {
        description: message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Modifica los datos del usuario.'
              : 'Completa los datos para registrar un nuevo usuario.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-1 flex-col gap-5">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="user-name">Nombre completo</Label>
            <Input
              id="user-name"
              placeholder="María García"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={saving}
              className="h-12"
              autoComplete="off"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="user-email">Correo electrónico</Label>
            <Input
              id="user-email"
              type="email"
              placeholder="correo@pachinos.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={saving || isEditing}
              className="h-12"
              autoComplete="off"
            />
            {isEditing && (
              <p className="text-xs text-muted-foreground">
                El correo no se puede modificar.
              </p>
            )}
          </div>

          {/* Password (only new users) */}
          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="user-password">Contraseña</Label>
              <Input
                id="user-password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={saving}
                className="h-12"
                autoComplete="new-password"
              />
            </div>
          )}

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="user-role">Rol</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)} disabled={saving}>
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cajera">Cajera</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Toggle (only editing) */}
          {isEditing && (
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label>Estado</Label>
                <p className="text-xs text-muted-foreground">
                  {isActive ? 'El usuario puede iniciar sesión' : 'Acceso deshabilitado'}
                </p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
                disabled={saving}
              />
            </div>
          )}

          {/* Actions */}
          <div className="mt-auto flex flex-col gap-2 pt-4">
            <Button
              type="submit"
              disabled={saving}
              className="h-12 w-full bg-amber-700 text-white hover:bg-amber-800 active:bg-amber-900"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {isEditing ? 'Guardando...' : 'Creando...'}
                </>
              ) : isEditing ? (
                'Guardar Cambios'
              ) : (
                'Crear Usuario'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="h-12 w-full"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
