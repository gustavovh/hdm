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
  fecha_presentacion: string;
  vendedor_id: string;
  estado: string;
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

    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);
    const fecha30Dias = hace30Dias.toISOString();

    const { data: presupuestos, error: fetchError } = await fetch(
      `${supabaseUrl}/rest/v1/presupuestos?estado=eq.PRESENTADO&fecha_presentacion=lt.${fecha30Dias}&select=id,codigo,cliente_nombre,fecha_presentacion,vendedor_id,estado`,
      {
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
      }
    ).then((res) => res.json());

    if (fetchError) {
      throw new Error(`Error fetching presupuestos: ${fetchError}`);
    }

    const presupuestosArray = presupuestos as Presupuesto[];
    const anulados: string[] = [];

    for (const presupuesto of presupuestosArray) {
      const { error: updateError } = await fetch(
        `${supabaseUrl}/rest/v1/presupuestos?id=eq.${presupuesto.id}`,
        {
          method: "PATCH",
          headers: {
            apikey: supabaseServiceKey,
            Authorization: `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            estado: "ANULADO",
            updated_at: new Date().toISOString(),
          }),
        }
      ).then((res) => res.json());

      if (updateError) {
        console.error(`Error updating presupuesto ${presupuesto.id}:`, updateError);
        continue;
      }

      await fetch(`${supabaseUrl}/rest/v1/auditorias`, {
        method: "POST",
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          accion: "AUTO_ANULAR_PRESENTADO",
          entidad: "presupuestos",
          entidad_id: presupuesto.id,
          usuario_id: null,
          cambios: {
            motivo: "Presupuesto presentado sin respuesta por más de 30 días",
            before: { estado: "PRESENTADO" },
            after: { estado: "ANULADO" },
          },
        }),
      });

      await fetch(`${supabaseUrl}/rest/v1/notificaciones`, {
        method: "POST",
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          usuario_id: presupuesto.vendedor_id,
          tipo: "AUTO_ANULACION",
          titulo: "Presupuesto Anulado Automáticamente",
          mensaje: `El presupuesto ${presupuesto.codigo} para ${presupuesto.cliente_nombre} ha sido anulado automáticamente por inactividad (30 días sin respuesta).`,
          entidad: "presupuestos",
          entidad_id: presupuesto.id,
          leida: false,
        }),
      });

      anulados.push(presupuesto.codigo);
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
  } catch (error) {
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