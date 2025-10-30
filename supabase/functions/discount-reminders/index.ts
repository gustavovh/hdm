import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PendingRequest {
  id: string;
  presupuesto_id: string;
  vendedor_id: string;
  created_at: string;
  presupuesto: {
    codigo: string;
    cliente_nombre: string;
  };
  vendedor: {
    full_name: string;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const reminderHours = 48;
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - reminderHours);

    const { data: pendingRequests, error: fetchError } = await supabase
      .from("solicitudes_descuento")
      .select(`
        id,
        presupuesto_id,
        vendedor_id,
        created_at,
        presupuesto:presupuestos(codigo, cliente_nombre),
        vendedor:users!solicitudes_descuento_vendedor_id_fkey(full_name)
      `)
      .eq("estado", "PENDIENTE")
      .is("deleted_at", null)
      .lt("created_at", cutoffDate.toISOString());

    if (fetchError) {
      throw fetchError;
    }

    const requests = (pendingRequests || []) as unknown as PendingRequest[];

    if (requests.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No hay solicitudes pendientes para recordar",
          count: 0,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data: admins, error: adminsError } = await supabase
      .from("users")
      .select("id, email, full_name")
      .eq("role", "admin")
      .eq("active", true);

    if (adminsError) {
      throw adminsError;
    }

    if (!admins || admins.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No hay administradores activos para notificar",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const notifications = admins.map((admin) => ({
      usuario_id: admin.id,
      tipo: "RECORDATORIO_SOLICITUDES_PENDIENTES",
      titulo: `${requests.length} solicitudes de descuento pendientes`,
      mensaje: `Tienes ${requests.length} solicitudes de descuento esperando aprobación desde hace más de ${reminderHours} horas`,
      entidad: "solicitudes_descuento",
      leida: false,
    }));

    const { error: notifError } = await supabase
      .from("notificaciones")
      .insert(notifications);

    if (notifError) {
      throw notifError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Recordatorios enviados a ${admins.length} administradores`,
        pending_requests: requests.length,
        notified_admins: admins.length,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error en discount-reminders:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});