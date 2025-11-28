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

    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);
    const fecha30Dias = hace30Dias.toISOString();

    const { data: presupuestos, error: fetchError } = await supabaseClient
      .from("presupuestos")
      .select(`
        id,
        codigo,
        cliente_nombre,
        fecha_presentacion,
        vendedor_id,
        estado,
        vendedor:users!presupuestos_vendedor_id_fkey(email, full_name)
      `)
      .eq("estado", "PRESENTADO")
      .lte("fecha_presentacion", fecha30Dias)
      .is("deleted_at", null);

    if (fetchError) {
      throw new Error(`Error fetching presupuestos: ${fetchError.message}`);
    }

    const anulados: any[] = [];

    if (presupuestos && presupuestos.length > 0) {
      for (const presupuesto of presupuestos) {
        const vendedor = presupuesto.vendedor as any;

        // Anular el presupuesto
        const { error: updateError } = await supabaseClient
          .from("presupuestos")
          .update({
            estado: "ANULADO",
            ultima_actualizacion_estado: new Date().toISOString(),
          })
          .eq("id", presupuesto.id);

        if (updateError) {
          console.error(`Error updating presupuesto ${presupuesto.id}:`, updateError);
          continue;
        }

        // Crear auditoría
        await supabaseClient.from("auditorias").insert({
          accion: "AUTO_ANULAR_PRESENTADO",
          entidad: "presupuestos",
          entidad_id: presupuesto.id,
          usuario_id: null,
          cambios: {
            motivo: "Presupuesto presentado sin respuesta por más de 30 días",
            before: { estado: "PRESENTADO" },
            after: { estado: "ANULADO" },
          },
        });

        // Buscar administrativos
        const { data: administrativos } = await supabaseClient
          .from("users")
          .select("id, email, full_name")
          .in("role", ["administrativo", "admin"])
          .is("deleted_at", null);

        // Notificar al vendedor
        await supabaseClient.from("notificaciones").insert({
          usuario_id: presupuesto.vendedor_id,
          tipo: "AUTO_ANULACION",
          titulo: "Presupuesto Anulado Automáticamente",
          mensaje: `El presupuesto ${presupuesto.codigo} para ${presupuesto.cliente_nombre} ha sido anulado automáticamente por inactividad (30 días sin respuesta).`,
          entidad: "presupuestos",
          entidad_id: presupuesto.id,
          leida: false,
        });

        // Notificar a administrativos
        if (administrativos) {
          for (const admin of administrativos) {
            await supabaseClient.from("notificaciones").insert({
              usuario_id: admin.id,
              tipo: "info",
              titulo: "Presupuesto Anulado Automáticamente",
              mensaje: `El presupuesto ${presupuesto.codigo} del vendedor ${vendedor?.full_name || 'desconocido'} fue anulado automáticamente (30 días sin respuesta).`,
              entidad: "presupuestos",
              entidad_id: presupuesto.id,
              leida: false,
            });
          }
        }

        anulados.push({
          codigo: presupuesto.codigo,
          cliente: presupuesto.cliente_nombre,
          vendedor: vendedor?.full_name || 'desconocido',
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Proceso completado. ${anulados.length} presupuesto(s) anulado(s).`,
        anulados,
        fecha_limite: fecha30Dias,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("Error en auto-anulación:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
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