import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  role: 'admin' | 'vendedor';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user: currentUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !currentUser) {
      throw new Error('Unauthorized');
    }

    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', currentUser.id)
      .maybeSingle();

    if (userError || !userData || userData.role !== 'admin') {
      throw new Error('Only admins can create users');
    }

    const requestBody: CreateUserRequest = await req.json();

    const { email, password, full_name, role } = requestBody;

    if (!email || !password || !full_name || !role) {
      throw new Error('Missing required fields');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // Verificar si el usuario ya existe
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUsers?.users.some(u => u.email === email);

    if (userExists) {
      throw new Error('El usuario ya existe');
    }

    // Crear usuario con contraseña directamente establecida
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role,
      },
      app_metadata: {
        provider: 'email',
        providers: ['email'],
      },
    });

    if (createError) throw createError;
    if (!authData.user) throw new Error('Failed to create user');

    // IMPORTANTE: Actualizar el usuario para asegurar que la contraseña funcione
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      authData.user.id,
      {
        password: password,
        email_confirm: true,
      }
    );

    if (updateError) {
      console.error('Error updating user password:', updateError);
      // No lanzar error aquí, el usuario ya fue creado
    }

    const { data: newUser, error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        full_name,
        role,
        active: true,
      })
      .select()
      .single();

    if (insertError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw insertError;
    }

    return new Response(
      JSON.stringify({ success: true, user: newUser }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error creating user:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});