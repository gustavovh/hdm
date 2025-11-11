import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

    const supabaseClient = await import("npm:@supabase/supabase-js").then(
      (mod) => mod.createClient(supabaseUrl, supabaseServiceKey)
    );

    // Calcular 24 horas atrás desde ahora
    const veintecuatroHorasAtras = new Date();
    veintecuatroHorasAtras.setHours(veintecuatroHorasAtras.getHours() - 24);

    // Buscar presupuestos en estado ABIERTO o EN_EJECUCION que recibieron notificación
    // y no han sido actualizados en 24 horas desde la notificación
    const { data: presupuestosAbiertos, error: errorAbiertos } = await supabaseClient
      .from("presupuestos")
      .select(`
        id,
        codigo,
        cliente_nombre,
        estado,
        vendedor_id,
        ultima_actualizacion_estado,
        dias_notificacion_enviada,
        vendedor:users!presupuestos_vendedor_id_fkey(email, full_name)
      `)
      .eq("estado", "ABIERTO")
      .eq("dias_notificacion_enviada", true)
      .lte("ultima_actualizacion_estado", veintecuatroHorasAtras.toISOString())
      .is("deleted_at", null);

    const { data: presupuestosEnEjecucion, error: errorEnEjecucion } = await supabaseClient
      .from("presupuestos")
      .select(`
        id,
        codigo,
        cliente_nombre,
        estado,
        vendedor_id,
        ultima_actualizacion_estado,
        semanas_notificacion_enviada,
        vendedor:users!presupuestos_vendedor_id_fkey(email, full_name)
      `)
      .eq("estado", "EN_EJECUCION")
      .eq("semanas_notificacion_enviada", true)
      .lte("ultima_actualizacion_estado", veintecuatroHorasAtras.toISOString())
      .is("deleted_at", null);

    if (errorAbiertos) {
      console.error("Error obteniendo presupuestos ABIERTO:", errorAbiertos);
    }

    if (errorEnEjecucion) {
      console.error("Error obteniendo presupuestos EN_EJECUCION:", errorEnEjecucion);
    }

    const presupuestosAnulados = [];

    // Procesar presupuestos ABIERTO
    if (presupuestosAbiertos && presupuestosAbiertos.length > 0) {
      for (const presupuesto of presupuestosAbiertos) {
        const vendedor = presupuesto.vendedor as any;

        // Anular el presupuesto
        const { error: updateError } = await supabaseClient
          .from("presupuestos")
          .update({
            estado: "ANULADO",
            ultima_actualizacion_estado: new Date().toISOString()
          })
          .eq("id", presupuesto.id);

        if (updateError) {
          console.error(`Error anulando presupuesto ${presupuesto.codigo}:`, updateError);
          continue;
        }

        // Buscar administrativos
        const { data: administrativos } = await supabaseClient
          .from("users")
          .select("id, email, full_name")
          .in("role", ["administrativo", "admin"])
          .is("deleted_at", null);

        // Notificar al vendedor
        const notifVendedor = {
          user_id: presupuesto.vendedor_id,
          tipo: "error",
          titulo: "Presupuesto anulado automáticamente",
          mensaje: `El presupuesto ${presupuesto.codigo} (${presupuesto.cliente_nombre}) fue anulado automáticamente por no cargar gestión en 24 horas desde la notificación.`,
          relacionado_id: presupuesto.id,
          relacionado_tipo: "presupuesto",
        };

        await supabaseClient.from("notificaciones").insert(notifVendedor);

        // Notificar a administrativos
        if (administrativos) {
          for (const admin of administrativos) {
            const notifAdmin = {
              user_id: admin.id,
              tipo: "info",
              titulo: "Presupuesto anulado automáticamente",
              mensaje: `El presupuesto ${presupuesto.codigo} del vendedor ${vendedor.full_name} fue anulado automáticamente por falta de gestión.`,
              relacionado_id: presupuesto.id,
              relacionado_tipo: "presupuesto",
            };

            await supabaseClient.from("notificaciones").insert(notifAdmin);
          }
        }

        presupuestosAnulados.push({
          codigo: presupuesto.codigo,
          vendedor: vendedor.full_name,
          estado_anterior: "ABIERTO"
        });
      }
    }

    // Procesar presupuestos EN_EJECUCION
    if (presupuestosEnEjecucion && presupuestosEnEjecucion.length > 0) {
      for (const presupuesto of presupuestosEnEjecucion) {
        const vendedor = presupuesto.vendedor as any;

        // Anular el presupuesto
        const { error: updateError } = await supabaseClient
          .from("presupuestos")
          .update({
            estado: "ANULADO",
            ultima_actualizacion_estado: new Date().toISOString()
          })
          .eq("id", presupuesto.id);

        if (updateError) {
          console.error(`Error anulando presupuesto ${presupuesto.codigo}:`, updateError);
          continue;
        }

        // Buscar administrativos
        const { data: administrativos } = await supabaseClient
          .from("users")
          .select("id, email, full_name")
          .in("role", ["administrativo", "admin"])
          .is("deleted_at", null);

        // Notificar al vendedor
        const notifVendedor = {
          user_id: presupuesto.vendedor_id,
          tipo: "error",
          titulo: "Presupuesto anulado automáticamente",
          mensaje: `El presupuesto ${presupuesto.codigo} (${presupuesto.cliente_nombre}) fue anulado automáticamente por no cargar gestión en 24 horas desde la notificación.`,
          relacionado_id: presupuesto.id,
          relacionado_tipo: "presupuesto",
        };

        await supabaseClient.from("notificaciones").insert(notifVendedor);

        // Notificar a administrativos
        if (administrativos) {
          for (const admin of administrativos) {
            const notifAdmin = {
              user_id: admin.id,
              tipo: "info",
              titulo: "Presupuesto anulado automáticamente",
              mensaje: `El presupuesto ${presupuesto.codigo} del vendedor ${vendedor.full_name} fue anulado automáticamente por falta de gestión.`,
              relacionado_id: presupuesto.id,
              relacionado_tipo: "presupuesto",
            };

            await supabaseClient.from("notificaciones").insert(notifAdmin);
          }
        }

        presupuestosAnulados.push({
          codigo: presupuesto.codigo,
          vendedor: vendedor.full_name,
          estado_anterior: "EN_EJECUCION"
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Proceso de auto-anulación completado",
        total_anulados: presupuestosAnulados.length,
        presupuestos_anulados: presupuestosAnulados,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("Error en auto-anular-sin-gestion:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Error procesando auto-anulación",
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