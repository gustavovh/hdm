import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Presupuesto {
  id: string;
  codigo: string;
  cliente_nombre: string;
  estado: string;
  vendedor_id: string;
  vendedor_email: string;
  vendedor_nombre: string;
  dias_sin_actualizar: number;
  semanas_sin_actualizar: number;
  dias_notificacion_enviada: boolean;
  semanas_notificacion_enviada: boolean;
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

    const supabaseClient = await import("npm:@supabase/supabase-js").then(
      (mod) => mod.createClient(supabaseUrl, supabaseServiceKey)
    );

    // Buscar presupuestos en estado ABIERTO con 5 días sin actualizar
    const cincodiasAtras = new Date();
    cincodiasAtras.setDate(cincodiasAtras.getDate() - 5);

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
      .eq("dias_notificacion_enviada", false)
      .lte("ultima_actualizacion_estado", cincodiasAtras.toISOString())
      .is("deleted_at", null);

    if (errorAbiertos) {
      console.error("Error obteniendo presupuestos ABIERTO:", errorAbiertos);
    }

    // Buscar presupuestos en estado EN_EJECUCION con 3 semanas sin actualizar
    const tresSemanasAtras = new Date();
    tresSemanasAtras.setDate(tresSemanasAtras.getDate() - 21);

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
      .eq("semanas_notificacion_enviada", false)
      .lte("ultima_actualizacion_estado", tresSemanasAtras.toISOString())
      .is("deleted_at", null);

    if (errorEnEjecucion) {
      console.error("Error obteniendo presupuestos EN_EJECUCION:", errorEnEjecucion);
    }

    const notificaciones = [];

    // Procesar presupuestos ABIERTO (5 días)
    if (presupuestosAbiertos && presupuestosAbiertos.length > 0) {
      for (const presupuesto of presupuestosAbiertos) {
        const vendedor = presupuesto.vendedor as any;

        // Buscar administrativos
        const { data: administrativos } = await supabaseClient
          .from("users")
          .select("id, email, full_name")
          .in("role", ["administrativo", "admin"])
          .is("deleted_at", null);

        // Crear notificación para vendedor
        const notifVendedor = {
          user_id: presupuesto.vendedor_id,
          tipo: "warning",
          titulo: "Presupuesto sin gestión - 5 días",
          mensaje: `El presupuesto ${presupuesto.codigo} (${presupuesto.cliente_nombre}) está en estado ABIERTO hace 5 días. Por favor, carga gestión o cambia el estado.`,
          relacionado_id: presupuesto.id,
          relacionado_tipo: "presupuesto",
          requiere_comentario: true,
        };

        await supabaseClient.from("notificaciones").insert(notifVendedor);
        notificaciones.push(`Vendedor: ${vendedor.email} - ${presupuesto.codigo}`);

        // Crear notificaciones para administrativos
        if (administrativos) {
          for (const admin of administrativos) {
            const notifAdmin = {
              user_id: admin.id,
              tipo: "info",
              titulo: "Presupuesto sin gestión - 5 días",
              mensaje: `El presupuesto ${presupuesto.codigo} del vendedor ${vendedor.full_name} está en estado ABIERTO hace 5 días.`,
              relacionado_id: presupuesto.id,
              relacionado_tipo: "presupuesto",
            };

            await supabaseClient.from("notificaciones").insert(notifAdmin);
            notificaciones.push(`Admin: ${admin.email} - ${presupuesto.codigo}`);
          }
        }

        // Marcar como notificado
        await supabaseClient
          .from("presupuestos")
          .update({ dias_notificacion_enviada: true })
          .eq("id", presupuesto.id);
      }
    }

    // Procesar presupuestos EN_EJECUCION (3 semanas)
    if (presupuestosEnEjecucion && presupuestosEnEjecucion.length > 0) {
      for (const presupuesto of presupuestosEnEjecucion) {
        const vendedor = presupuesto.vendedor as any;

        // Buscar administrativos
        const { data: administrativos } = await supabaseClient
          .from("users")
          .select("id, email, full_name")
          .in("role", ["administrativo", "admin"])
          .is("deleted_at", null);

        // Crear notificación para vendedor
        const notifVendedor = {
          user_id: presupuesto.vendedor_id,
          tipo: "warning",
          titulo: "Presupuesto en ejecución - 3 semanas",
          mensaje: `El presupuesto ${presupuesto.codigo} (${presupuesto.cliente_nombre}) está EN EJECUCIÓN hace 3 semanas. Por favor, carga gestión o cambia el estado.`,
          relacionado_id: presupuesto.id,
          relacionado_tipo: "presupuesto",
          requiere_comentario: true,
        };

        await supabaseClient.from("notificaciones").insert(notifVendedor);
        notificaciones.push(`Vendedor: ${vendedor.email} - ${presupuesto.codigo}`);

        // Crear notificaciones para administrativos
        if (administrativos) {
          for (const admin of administrativos) {
            const notifAdmin = {
              user_id: admin.id,
              tipo: "info",
              titulo: "Presupuesto en ejecución - 3 semanas",
              mensaje: `El presupuesto ${presupuesto.codigo} del vendedor ${vendedor.full_name} está EN EJECUCIÓN hace 3 semanas.`,
              relacionado_id: presupuesto.id,
              relacionado_tipo: "presupuesto",
            };

            await supabaseClient.from("notificaciones").insert(notifAdmin);
            notificaciones.push(`Admin: ${admin.email} - ${presupuesto.codigo}`);
          }
        }

        // Marcar como notificado
        await supabaseClient
          .from("presupuestos")
          .update({ semanas_notificacion_enviada: true })
          .eq("id", presupuesto.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notificaciones procesadas",
        total_abiertos: presupuestosAbiertos?.length || 0,
        total_en_ejecucion: presupuestosEnEjecucion?.length || 0,
        notificaciones_enviadas: notificaciones.length,
        detalles: notificaciones,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("Error en notificaciones-estado-presupuesto:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Error procesando notificaciones",
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