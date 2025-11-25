import { supabase } from '../lib/supabase';
import { Presupuesto, SolicitudDescuento, User } from '../types/database.types';

interface EmailTemplate {
  subject: string;
  html: string;
}

export class EmailService {
  private static async sendEmail(to: string, subject: string, html: string, tipo?: string): Promise<void> {
    try {
      const { data, error } = await supabase.functions.invoke('send-email-notification', {
        body: { to, subject, html, tipo },
      });

      if (error) {
        console.error('Error sending email:', error);
      }
    } catch (error) {
      console.error('Email service error:', error);
    }
  }

  private static getBaseTemplate(content: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            background: #ffffff;
            padding: 30px;
            border: 1px solid #e5e7eb;
            border-top: none;
          }
          .footer {
            background: #f9fafb;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
            border-radius: 0 0 8px 8px;
            border: 1px solid #e5e7eb;
            border-top: none;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background: #3b82f6;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
          }
          .info-box {
            background: #f0f9ff;
            border-left: 4px solid #3b82f6;
            padding: 16px;
            margin: 20px 0;
          }
          .warning-box {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 16px;
            margin: 20px 0;
          }
          .success-box {
            background: #d1fae5;
            border-left: 4px solid #10b981;
            padding: 16px;
            margin: 20px 0;
          }
          .error-box {
            background: #fee2e2;
            border-left: 4px solid #ef4444;
            padding: 16px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>HDM - Sistema de Presupuestos</h1>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p>Este es un mensaje automático, por favor no respondas a este correo.</p>
          <p>&copy; ${new Date().getFullYear()} HDM. Todos los derechos reservados.</p>
        </div>
      </body>
      </html>
    `;
  }

  static async notifyNewDiscountRequest(
    solicitud: SolicitudDescuento,
    presupuesto: Presupuesto,
    vendedor: User,
    admins: User[]
  ): Promise<void> {
    const content = `
      <h2>Nueva Solicitud de Descuento</h2>
      <p>Hola,</p>
      <p>El vendedor <strong>${vendedor.full_name}</strong> ha creado una nueva solicitud de descuento que requiere tu aprobación.</p>

      <div class="info-box">
        <h3>Detalles de la Solicitud</h3>
        <p><strong>Presupuesto:</strong> ${presupuesto.codigo}</p>
        <p><strong>Cliente:</strong> ${presupuesto.cliente_nombre}</p>
        <p><strong>Tipo de Descuento:</strong> ${solicitud.tipo}</p>
        <p><strong>Valor Solicitado:</strong> ${solicitud.tipo === 'PORCENTAJE' ? `${solicitud.valor_propuesto}%` : `${solicitud.valor_propuesto}`}</p>
        <p><strong>Alcance:</strong> ${solicitud.aplica_a === 'GLOBAL' ? 'Global' : 'Por Ítem'}</p>
        <p><strong>Motivo:</strong> ${solicitud.motivo}</p>
      </div>

      <p>Por favor, revisa y aprueba esta solicitud lo antes posible.</p>

      <a href="${window.location.origin}" class="button">
        Ver Solicitud
      </a>
    `;

    const html = this.getBaseTemplate(content);

    for (const admin of admins) {
      await this.sendEmail(
        admin.email,
        `Nueva Solicitud de Descuento - ${presupuesto.codigo}`,
        html,
        'NUEVA_SOLICITUD_DESCUENTO'
      );
    }
  }

  static async notifyDiscountApproved(
    solicitud: SolicitudDescuento,
    presupuesto: Presupuesto,
    vendedor: User,
    admin: User
  ): Promise<void> {
    const content = `
      <h2>Solicitud de Descuento Aprobada</h2>
      <p>Hola ${vendedor.full_name},</p>
      <p>Tu solicitud de descuento ha sido <strong>aprobada</strong> por ${admin.full_name}.</p>

      <div class="success-box">
        <h3>Detalles de la Aprobación</h3>
        <p><strong>Presupuesto:</strong> ${presupuesto.codigo}</p>
        <p><strong>Cliente:</strong> ${presupuesto.cliente_nombre}</p>
        <p><strong>Descuento Aprobado:</strong> ${solicitud.tipo === 'PORCENTAJE' ? `${solicitud.valor_aprobado}%` : `${solicitud.valor_aprobado}`}</p>
        ${solicitud.comentario_admin ? `<p><strong>Comentario:</strong> ${solicitud.comentario_admin}</p>` : ''}
      </div>

      <p>El descuento ha sido aplicado automáticamente al presupuesto.</p>

      <a href="${window.location.origin}" class="button">
        Ver Presupuesto
      </a>
    `;

    const html = this.getBaseTemplate(content);

    await this.sendEmail(
      vendedor.email,
      `Descuento Aprobado - ${presupuesto.codigo}`,
      html,
      'SOLICITUD_APROBADA'
    );
  }

  static async notifyDiscountApprovedWithModification(
    solicitud: SolicitudDescuento,
    presupuesto: Presupuesto,
    vendedor: User,
    admin: User
  ): Promise<void> {
    const content = `
      <h2>Solicitud de Descuento Aprobada con Modificación</h2>
      <p>Hola ${vendedor.full_name},</p>
      <p>Tu solicitud de descuento ha sido <strong>aprobada con modificaciones</strong> por ${admin.full_name}.</p>

      <div class="warning-box">
        <h3>Detalles de la Aprobación</h3>
        <p><strong>Presupuesto:</strong> ${presupuesto.codigo}</p>
        <p><strong>Cliente:</strong> ${presupuesto.cliente_nombre}</p>
        <p><strong>Descuento Solicitado:</strong> ${solicitud.tipo === 'PORCENTAJE' ? `${solicitud.valor_propuesto}%` : `${solicitud.valor_propuesto}`}</p>
        <p><strong>Descuento Aprobado:</strong> ${solicitud.tipo === 'PORCENTAJE' ? `${solicitud.valor_aprobado}%` : `${solicitud.valor_aprobado}`}</p>
        ${solicitud.comentario_admin ? `<p><strong>Comentario:</strong> ${solicitud.comentario_admin}</p>` : ''}
      </div>

      <p>El descuento modificado ha sido aplicado al presupuesto.</p>

      <a href="${window.location.origin}" class="button">
        Ver Presupuesto
      </a>
    `;

    const html = this.getBaseTemplate(content);

    await this.sendEmail(
      vendedor.email,
      `Descuento Aprobado con Modificación - ${presupuesto.codigo}`,
      html,
      'SOLICITUD_APROBADA_MODIFICADA'
    );
  }

  static async notifyDiscountRejected(
    solicitud: SolicitudDescuento,
    presupuesto: Presupuesto,
    vendedor: User,
    admin: User
  ): Promise<void> {
    const content = `
      <h2>Solicitud de Descuento Rechazada</h2>
      <p>Hola ${vendedor.full_name},</p>
      <p>Lamentamos informarte que tu solicitud de descuento ha sido <strong>rechazada</strong> por ${admin.full_name}.</p>

      <div class="error-box">
        <h3>Detalles</h3>
        <p><strong>Presupuesto:</strong> ${presupuesto.codigo}</p>
        <p><strong>Cliente:</strong> ${presupuesto.cliente_nombre}</p>
        <p><strong>Descuento Solicitado:</strong> ${solicitud.tipo === 'PORCENTAJE' ? `${solicitud.valor_propuesto}%` : `${solicitud.valor_propuesto}`}</p>
        ${solicitud.comentario_admin ? `<p><strong>Motivo del Rechazo:</strong> ${solicitud.comentario_admin}</p>` : ''}
      </div>

      <p>Si tienes dudas o deseas discutir esta decisión, por favor contacta directamente con ${admin.full_name}.</p>
    `;

    const html = this.getBaseTemplate(content);

    await this.sendEmail(
      vendedor.email,
      `Descuento Rechazado - ${presupuesto.codigo}`,
      html,
      'SOLICITUD_RECHAZADA'
    );
  }

  static async notifyPendingReminders(
    admin: User,
    pendingCount: number,
    solicitudes: Array<{ presupuesto: string; vendedor: string; dias: number }>
  ): Promise<void> {
    const solicitudesList = solicitudes
      .map(
        (s) =>
          `<li><strong>${s.presupuesto}</strong> - ${s.vendedor} (${s.dias} días pendiente)</li>`
      )
      .join('');

    const content = `
      <h2>Recordatorio: Solicitudes de Descuento Pendientes</h2>
      <p>Hola ${admin.full_name},</p>
      <p>Tienes <strong>${pendingCount} solicitudes de descuento</strong> esperando aprobación.</p>

      <div class="warning-box">
        <h3>Solicitudes Pendientes</h3>
        <ul>
          ${solicitudesList}
        </ul>
      </div>

      <p>Por favor, revisa estas solicitudes para mantener un flujo de trabajo eficiente.</p>

      <a href="${window.location.origin}" class="button">
        Ver Solicitudes Pendientes
      </a>
    `;

    const html = this.getBaseTemplate(content);

    await this.sendEmail(
      admin.email,
      `Recordatorio: ${pendingCount} Solicitudes Pendientes`,
      html,
      'RECORDATORIO_SOLICITUDES_PENDIENTES'
    );
  }

  static async notifyPresupuestoStatusChange(
    presupuesto: Presupuesto,
    oldStatus: string,
    newStatus: string,
    vendedor: User
  ): Promise<void> {
    const statusLabels: Record<string, string> = {
      CLONADO: 'Clonado',
      PRESENTADO: 'Presentado',
      ACEPTADO: 'Aceptado',
      FACTURADO: 'Facturado',
      ANULADO: 'Anulado',
    };

    const content = `
      <h2>Cambio de Estado de Presupuesto</h2>
      <p>Hola ${vendedor.full_name},</p>
      <p>El estado de tu presupuesto ha cambiado.</p>

      <div class="info-box">
        <h3>Detalles del Cambio</h3>
        <p><strong>Presupuesto:</strong> ${presupuesto.codigo}</p>
        <p><strong>Cliente:</strong> ${presupuesto.cliente_nombre}</p>
        <p><strong>Estado Anterior:</strong> ${statusLabels[oldStatus] || oldStatus}</p>
        <p><strong>Nuevo Estado:</strong> ${statusLabels[newStatus] || newStatus}</p>
        ${presupuesto.observaciones ? `<p><strong>Observaciones:</strong> ${presupuesto.observaciones}</p>` : ''}
      </div>

      <a href="${window.location.origin}" class="button">
        Ver Presupuesto
      </a>
    `;

    const html = this.getBaseTemplate(content);

    await this.sendEmail(
      vendedor.email,
      `Cambio de Estado - ${presupuesto.codigo}`,
      html,
      'CAMBIO_ESTADO_PRESUPUESTO'
    );
  }
}
