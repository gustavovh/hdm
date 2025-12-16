import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Seguimiento {
  id: string;
  presupuesto_id: string;
  user_id: string;
  accion: string;
  proxima_accion: string | null;
  fecha_proxima_accion: string;
  presupuesto: {
    codigo: string;
    cliente_nombre: string;
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

    const ahora = new Date();
    const ahora_iso = ahora.toISOString();

    console.log(`[ALARMAS] Buscando alarmas vencidas hasta: ${ahora_iso}`);

    const { data: alarmasVencidas, error: fetchError } = await supabase
      .from("presupuesto_seguimiento")
      .select(`
        id,
        presupuesto_id,
        user_id,
        accion,
        proxima_accion,
        fecha_proxima_accion,
        presupuesto:presupuestos(codigo, cliente_nombre)
      `)
      .lte("fecha_proxima_accion", ahora_iso)
      .eq("alarma_notificada", false)
      .not("fecha_proxima_accion", "is", null);

    if (fetchError) {
      console.error("[ALARMAS] Error al buscar alarmas:", fetchError);
      throw fetchError;
    }

    const alarmas = (alarmasVencidas || []) as unknown as Seguimiento[];

    console.log(`[ALARMAS] Encontradas ${alarmas.length} alarmas vencidas`);

    if (alarmas.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No hay alarmas vencidas pendientes de notificar",
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

    const notificaciones = alarmas.map((alarma) => {
      const presupuesto = Array.isArray(alarma.presupuesto) 
        ? alarma.presupuesto[0] 
        : alarma.presupuesto;

      const titulo = `Alarma: ${alarma.proxima_accion || 'Seguimiento pendiente'}`;
      const mensaje = `Presupuesto ${presupuesto?.codigo || 'N/A'} - ${presupuesto?.cliente_nombre || 'Cliente'}: ${alarma.proxima_accion || 'Acción de seguimiento programada'}`;

      return {
        usuario_id: alarma.user_id,
        tipo: "warning",
        titulo: titulo,
        mensaje: mensaje,
        entidad: "presupuesto_seguimiento",
        entidad_id: alarma.presupuesto_id,
        leida: false,
      };
    });

    const { error: notifError } = await supabase
      .from("notificaciones")
      .insert(notificaciones);

    if (notifError) {
      console.error("[ALARMAS] Error al crear notificaciones:", notifError);
      throw notifError;
    }

    console.log(`[ALARMAS] Creadas ${notificaciones.length} notificaciones`);

    const alarmaIds = alarmas.map((a) => a.id);
    const { error: updateError } = await supabase
      .from("presupuesto_seguimiento")
      .update({
        alarma_notificada: true,
        alarma_notificada_at: ahora_iso,
      })
      .in("id", alarmaIds);

    if (updateError) {
      console.error("[ALARMAS] Error al marcar alarmas como notificadas:", updateError);
      throw updateError;
    }

    console.log(`[ALARMAS] Marcadas ${alarmaIds.length} alarmas como notificadas`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Procesadas ${alarmas.length} alarmas vencidas`,
        alarmas_procesadas: alarmas.length,
        notificaciones_enviadas: notificaciones.length,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("[ALARMAS] Error general:", error);

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