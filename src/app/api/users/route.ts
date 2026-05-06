import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    // Verify the requester is an authenticated admin
    const serverSupabase = await createServerClient();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: profile } = await serverSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return Response.json({ error: 'Sin permisos de administrador' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { email, password, full_name, role } = body as {
      email: string;
      password: string;
      full_name: string;
      role: string;
    };

    if (!email || !password || !full_name || !role) {
      return Response.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return Response.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    if (!['admin', 'cajera'].includes(role)) {
      return Response.json({ error: 'Rol no válido' }, { status: 400 });
    }

    // Create user with Supabase Admin client (service role)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: newUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
          role,
        },
      });

    if (authError) {
      // Handle duplicate email
      if (authError.message?.includes('already been registered')) {
        return Response.json(
          { error: 'Ya existe un usuario con este correo' },
          { status: 409 }
        );
      }
      throw authError;
    }

    if (!newUser.user) {
      throw new Error('No se pudo crear el usuario');
    }

    // Upsert profile in profiles table
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: newUser.user.id,
        email,
        full_name,
        role,
        is_active: true,
      });

    if (profileError) {
      // Clean up: delete the auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw profileError;
    }

    return Response.json(
      { message: 'Usuario creado exitosamente', userId: newUser.user.id },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno del servidor';
    console.error('Error creating user:', err);
    return Response.json({ error: message }, { status: 500 });
  }
}
