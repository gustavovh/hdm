import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

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

    // Get email and password from request body
    const body = await req.json();
    const email = body.email || 'admin@hdm.com';
    const password = body.password || 'Admin123456!';
    const role = body.role || 'admin';

    // Verificar si el usuario ya existe
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(u => u.email === email);

    if (existingUser) {
      // Si existe, actualizar su contraseña
      const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        {
          password: password,
          email_confirm: true,
        }
      );

      if (updateError) {
        throw updateError;
      }

      // Asegurar que tenga el rol correcto
      await supabaseAdmin
        .from('users')
        .update({ role: role, active: true })
        .eq('id', existingUser.id);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Admin user password reset successfully',
          user: updatedUser.user
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Si no existe, crearlo
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
    });

    if (authError) {
      throw authError;
    }

    // El trigger handle_new_user se encargará de crear el usuario en public.users
    // Pero necesitamos asegurar que tenga el rol correcto
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ role: role })
      .eq('id', authData.user.id);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Admin user created successfully',
        user: authData.user
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
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
