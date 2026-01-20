import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Presupuesto {
  codigo: string;
  created_at: string;
  cliente: string;
  nombre_fantasia: string | null;
  estado: string;
  subtotal: number;
  iva: number;
  total: number;
  observaciones: string | null;
  vendedor_nombre: string;
  vendedor_email: string;
}

function generateCSV(presupuestos: Presupuesto[]): string {
  const headers = [
    "Código",
    "Fecha Creación",
    "Cliente",
    "Nombre Fantasía",
    "Vendedor",
    "Email Vendedor",
    "Estado",
    "Subtotal",
    "IVA",
    "Total",
    "Observaciones"
  ];

  const rows = presupuestos.map(p => [
    p.codigo,
    new Date(p.created_at).toLocaleString('es-PY'),
    `"${p.cliente.replace(/"/g, '""')}"`,
    p.nombre_fantasia ? `"${p.nombre_fantasia.replace(/"/g, '""')}"` : '',
    `"${p.vendedor_nombre.replace(/"/g, '""')}"`,
    p.vendedor_email,
    p.estado,
    p.subtotal.toFixed(2),
    p.iva.toFixed(2),
    p.total.toFixed(2),
    p.observaciones ? `"${p.observaciones.replace(/"/g, '""')}"` : ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return csvContent;
}

function generateHTMLTable(presupuestos: Presupuesto[]): string {
  const rows = presupuestos.map(p => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px; font-weight: 600; color: #1f2937;">${p.codigo}</td>
      <td style="padding: 12px; color: #4b5563;">${new Date(p.created_at).toLocaleDateString('es-PY')}</td>
      <td style="padding: 12px; color: #4b5563;">${p.cliente}</td>
      <td style="padding: 12px; color: #4b5563;">${p.vendedor_nombre}</td>
      <td style="padding: 12px;">
        <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600;
          ${p.estado === 'aceptado' ? 'background-color: #d1fae5; color: #065f46;' :
            p.estado === 'rechazado' ? 'background-color: #fee2e2; color: #991b1b;' :
            p.estado === 'anulado' ? 'background-color: #f3f4f6; color: #374151;' :
            'background-color: #dbeafe; color: #1e40af;'}">
          ${p.estado.toUpperCase()}
        </span>
      </td>
      <td style="padding: 12px; text-align: right; font-weight: 600; color: #1f2937;">
        ${new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(p.total)}
      </td>
    </tr>
  `).join('');

  return `
    <table style="width: 100%; border-collapse: collapse; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <thead>
        <tr style="background-color: #f9fafb;">
          <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Código</th>
          <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Fecha</th>
          <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Cliente</th>
          <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Vendedor</th>
          <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Estado</th>
          <th style="padding: 12px; text-align: right; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function generateEmailHTML(presupuestos: Presupuesto[], fecha: string, totalGeneral: number): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">
              📊 Reporte Diario de Presupuestos
            </h1>
            <p style="margin: 10px 0 0 0; color: #dbeafe; font-size: 16px;">
              ${fecha}
            </p>
          </div>

          <!-- Content -->
          <div style="background-color: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin-bottom: 30px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <h3 style="margin: 0 0 5px 0; color: #1e40af; font-size: 18px;">Total de Presupuestos</h3>
                  <p style="margin: 0; color: #60a5fa; font-size: 32px; font-weight: 700;">${presupuestos.length}</p>
                </div>
                <div>
                  <h3 style="margin: 0 0 5px 0; color: #1e40af; font-size: 18px;">Monto Total</h3>
                  <p style="margin: 0; color: #60a5fa; font-size: 32px; font-weight: 700;">
                    ${new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(totalGeneral)}
                  </p>
                </div>
              </div>
            </div>

            ${presupuestos.length > 0 ? `
              <h2 style="color: #1f2937; font-size: 20px; margin: 0 0 20px 0;">Detalle de Presupuestos</h2>
              ${generateHTMLTable(presupuestos)}

              <div style="margin-top: 30px; padding: 20px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                  <strong>⚠️ REGISTRO DE RESPALDO:</strong> Este archivo CSV contiene un registro permanente de los códigos de presupuestos generados.
                  Conserve este archivo como respaldo en caso de cualquier problema con el sistema.
                </p>
              </div>
            ` : `
              <div style="text-align: center; padding: 40px 20px; background-color: #f9fafb; border-radius: 8px;">
                <p style="margin: 0; color: #6b7280; font-size: 18px;">
                  No se crearon presupuestos en esta fecha.
                </p>
              </div>
            `}
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin-top: 20px; padding: 20px; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0;">
              Sistema HDM de Gestión de Presupuestos
            </p>
            <p style="margin: 5px 0 0 0;">
              Este es un correo automático, por favor no responder.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey);

    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    ayer.setHours(0, 0, 0, 0);

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const { data: presupuestos, error } = await supabase
      .from('presupuestos')
      .select(`
        codigo,
        created_at,
        cliente,
        nombre_fantasia,
        estado,
        subtotal,
        iva,
        total,
        observaciones,
        vendedor:users!presupuestos_vendedor_id_fkey(
          nombre_completo,
          email
        )
      `)
      .gte('created_at', ayer.toISOString())
      .lt('created_at', hoy.toISOString())
      .is('deleted_at', null)
      .order('codigo', { ascending: true });

    if (error) {
      throw new Error(`Error obteniendo presupuestos: ${error.message}`);
    }

    const presupuestosFormateados: Presupuesto[] = (presupuestos || []).map((p: any) => ({
      codigo: p.codigo,
      created_at: p.created_at,
      cliente: p.cliente,
      nombre_fantasia: p.nombre_fantasia,
      estado: p.estado,
      subtotal: p.subtotal,
      iva: p.iva,
      total: p.total,
      observaciones: p.observaciones,
      vendedor_nombre: p.vendedor.nombre_completo,
      vendedor_email: p.vendedor.email,
    }));

    const totalGeneral = presupuestosFormateados.reduce((sum, p) => sum + p.total, 0);

    const csvContent = generateCSV(presupuestosFormateados);

    const fechaFormateada = ayer.toLocaleDateString('es-PY', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const { data: admins, error: adminsError } = await supabase
      .from('users')
      .select('email, nombre_completo')
      .eq('role', 'admin')
      .eq('activo', true)
      .is('deleted_at', null);

    if (adminsError) {
      throw new Error(`Error obteniendo administradores: ${adminsError.message}`);
    }

    if (!resendApiKey) {
      console.warn("RESEND_API_KEY no configurada. Reporte generado pero no enviado.");
      return new Response(
        JSON.stringify({
          success: true,
          message: "Reporte generado (email no configurado)",
          presupuestos: presupuestosFormateados.length,
          csvSize: csvContent.length,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const csvBase64 = btoa(unescape(encodeURIComponent(csvContent)));

    const emailsEnviados = [];
    for (const admin of admins || []) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "HDM Sistema <notificaciones@hdm.com>",
            to: [admin.email],
            subject: `📊 Reporte Diario de Presupuestos - ${fechaFormateada}`,
            html: generateEmailHTML(presupuestosFormateados, fechaFormateada, totalGeneral),
            attachments: [
              {
                filename: `presupuestos_${ayer.toISOString().split('T')[0]}.csv`,
                content: csvBase64,
              },
            ],
          }),
        });

        if (response.ok) {
          emailsEnviados.push(admin.email);
          console.log(`✅ Reporte enviado a: ${admin.email}`);
        } else {
          const errorText = await response.text();
          console.error(`❌ Error enviando a ${admin.email}:`, errorText);
        }
      } catch (emailError) {
        console.error(`❌ Error enviando email a ${admin.email}:`, emailError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Reporte generado y enviado",
        presupuestos: presupuestosFormateados.length,
        totalGeneral: totalGeneral,
        emailsEnviados: emailsEnviados.length,
        destinatarios: emailsEnviados,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("❌ Error en reporte diario:", error);

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
