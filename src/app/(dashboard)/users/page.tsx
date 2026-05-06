'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Users, ShieldCheck, UserCog } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { usePermissions } from '@/hooks/use-permissions';
import type { Profile } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { UserForm } from '@/components/settings/user-form';

export default function UsersPage() {
  const { isAdmin, loading: permLoading } = usePermissions();
  const supabase = createClient();

  const [users, setUsers] = useState<Profile[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoadingData(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');
      if (error) throw error;
      if (data) setUsers(data);
    } catch {
      toast.error('Error al cargar usuarios');
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin, fetchUsers]);

  const handleToggleActive = async (user: Profile) => {
    setTogglingId(user.id);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !user.is_active })
        .eq('id', user.id);
      if (error) throw error;
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, is_active: !u.is_active } : u
        )
      );
      toast.success(
        `Usuario ${!user.is_active ? 'activado' : 'desactivado'}`
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      toast.error('Error al actualizar usuario', { description: message });
    } finally {
      setTogglingId(null);
    }
  };

  const handleOpenNew = () => {
    setEditingUser(null);
    setSheetOpen(true);
  };

  const handleOpenEdit = (user: Profile) => {
    setEditingUser(user);
    setSheetOpen(true);
  };

  const handleFormSuccess = () => {
    setSheetOpen(false);
    setEditingUser(null);
    fetchUsers();
  };

  // ------ Permission check ------

  if (permLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-amber-700" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 px-4 text-center">
        <Users className="size-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-foreground">Sin acceso</h2>
        <p className="text-sm text-muted-foreground">
          No tienes permisos para gestionar usuarios.
        </p>
      </div>
    );
  }

  if (loadingData) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-amber-700" />
          <p className="text-sm text-amber-800">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-amber-900">Usuarios</h2>
          <p className="text-sm text-muted-foreground">
            {users.length} usuario{users.length !== 1 ? 's' : ''} registrado
            {users.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          onClick={handleOpenNew}
          className="h-12 bg-amber-700 text-white hover:bg-amber-800 active:bg-amber-900"
        >
          <Plus className="size-4" />
          Agregar Usuario
        </Button>
      </div>

      {/* User Cards */}
      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <Users className="size-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No hay usuarios registrados
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {users.map((user) => (
            <Card key={user.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  {/* User info */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                      {user.role === 'admin' ? (
                        <ShieldCheck className="size-5" />
                      ) : (
                        <UserCog className="size-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {user.full_name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge
                          variant={
                            user.role === 'admin' ? 'default' : 'secondary'
                          }
                          className={
                            user.role === 'admin'
                              ? 'bg-amber-700 text-white'
                              : ''
                          }
                        >
                          {user.role === 'admin' ? 'Administrador' : 'Cajera'}
                        </Badge>
                        <Badge
                          variant={user.is_active ? 'success' : 'destructive'}
                        >
                          {user.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleOpenEdit(user)}
                      className="text-amber-700 hover:bg-amber-100"
                      aria-label={`Editar ${user.full_name}`}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Switch
                      checked={user.is_active}
                      onCheckedChange={() => handleToggleActive(user)}
                      disabled={togglingId === user.id}
                      aria-label={`${user.is_active ? 'Desactivar' : 'Activar'} ${user.full_name}`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* User Form Sheet */}
      <UserForm
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        user={editingUser}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
