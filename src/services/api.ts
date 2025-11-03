import { supabase } from '../lib/supabase';
import {
  Presupuesto,
  PresupuestoItem,
  SolicitudDescuento,
  User,
  Notificacion,
  Auditoria,
} from '../types/database.types';
import {
  CreateDiscountRequestDTO,
  CreatePresupuestoDTO,
  UpdatePresupuestoDTO,
  FilterOptions,
  PaginationOptions,
  PaginatedResponse,
  AuditPayload,
  NotificationPayload,
} from '../types/api.types';
import { BudgetCalculator } from './budgetCalculator';

export class PresupuestoService {
  static async create(
    data: CreatePresupuestoDTO,
    vendedor_id: string
  ): Promise<Presupuesto> {
    const items = data.items.map((item, index) => ({
      ...item,
      subtotal: BudgetCalculator.calculateItemSubtotal(
        item.cantidad,
        item.precio_unitario
      ),
      orden: index,
      descuento_aplicado: 0,
    }));

    const total_bruto = BudgetCalculator.calculateBrutoTotal(
      items as any[]
    );

    const presupuestoData = {
      codigo: data.codigo,
      cliente_nombre: data.cliente_nombre,
      cliente_email: data.cliente_email,
      cliente_telefono: data.cliente_telefono,
      cliente_documento: data.cliente_documento,
      vendedor_id,
      moneda: data.moneda,
      tipo_cambio: data.tipo_cambio || 1,
      tasa_impuesto: data.tasa_impuesto || 10,
      tasa_comision: data.tasa_comision || 5,
      total_bruto,
      total_descuento: 0,
      total_neto: total_bruto,
      total_impuestos: (total_bruto * (data.tasa_impuesto || 10)) / 100,
      total_comisiones: (total_bruto * (data.tasa_comision || 5)) / 100,
      estado: 'BORRADOR' as const,
      observaciones: data.observaciones,
    };

    const { data: presupuesto, error: presupuestoError } = await supabase
      .from('presupuestos')
      .insert(presupuestoData)
      .select()
      .single();

    if (presupuestoError) throw presupuestoError;

    const itemsWithPresupuestoId = items.map((item) => ({
      ...item,
      presupuesto_id: presupuesto.id,
    }));

    const { error: itemsError } = await supabase
      .from('presupuesto_items')
      .insert(itemsWithPresupuestoId);

    if (itemsError) throw itemsError;

    await AuditService.log({
      accion: 'CREAR_PRESUPUESTO',
      entidad: 'presupuestos',
      entidad_id: presupuesto.id,
      usuario_id: vendedor_id,
      cambios: { after: presupuesto },
    });

    return presupuesto;
  }

  static async getById(id: string): Promise<Presupuesto | null> {
    const { data, error } = await supabase
      .from('presupuestos')
      .select(
        `
        *,
        vendedor:users!presupuestos_vendedor_id_fkey(*),
        items:presupuesto_items(*),
        solicitudes_descuento(
          *,
          vendedor:users!solicitudes_descuento_vendedor_id_fkey(*),
          aprobador:users!solicitudes_descuento_aprobado_por_fkey(*),
          item:presupuesto_items(*)
        )
      `
      )
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async list(
    filters: FilterOptions = {},
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResponse<Presupuesto>> {
    const { page = 1, limit = 20, order_by = 'created_at', order_direction = 'desc' } = pagination;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('presupuestos')
      .select(
        `
        *,
        vendedor:users!presupuestos_vendedor_id_fkey(*),
        solicitudes_descuento(count)
      `,
        { count: 'exact' }
      )
      .is('deleted_at', null);

    if (filters.vendedor_id) {
      query = query.eq('vendedor_id', filters.vendedor_id);
    }

    if (filters.search) {
      query = query.or(
        `codigo.ilike.%${filters.search}%,cliente_nombre.ilike.%${filters.search}%`
      );
    }

    const { data, error, count } = await query
      .order(order_by, { ascending: order_direction === 'asc' })
      .range(from, to);

    if (error) throw error;

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit),
    };
  }

  static async update(
    id: string,
    updates: UpdatePresupuestoDTO
  ): Promise<Presupuesto> {
    const { data: before } = await supabase
      .from('presupuestos')
      .select()
      .eq('id', id)
      .single();

    const { data, error } = await supabase
      .from('presupuestos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await AuditService.log({
        accion: 'ACTUALIZAR_PRESUPUESTO',
        entidad: 'presupuestos',
        entidad_id: id,
        usuario_id: user.id,
        cambios: { before, after: data },
      });
    }

    return data;
  }

  static async getAll(): Promise<Presupuesto[]> {
    const { data, error } = await supabase
      .from('presupuestos')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}

export class PresupuestoItemService {
  static async create(data: Omit<PresupuestoItem, 'id' | 'created_at' | 'updated_at'>): Promise<PresupuestoItem> {
    const { data: item, error } = await supabase
      .from('presupuesto_items')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return item;
  }

  static async getByPresupuesto(presupuestoId: string): Promise<PresupuestoItem[]> {
    const { data, error } = await supabase
      .from('presupuesto_items')
      .select('*')
      .eq('presupuesto_id', presupuestoId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('presupuesto_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}

export class DiscountRequestService {
  static async create(
    data: CreateDiscountRequestDTO,
    vendedor_id: string
  ): Promise<SolicitudDescuento> {
    const presupuesto = await PresupuestoService.getById(
      data.presupuesto_id
    );

    if (!presupuesto) {
      throw new Error('Presupuesto no encontrado');
    }

    if (presupuesto.vendedor_id !== vendedor_id) {
      throw new Error('No tienes permiso para solicitar descuentos en este presupuesto');
    }

    BudgetCalculator.validateDiscountValue(data.tipo, data.valor_propuesto);

    const requestData = {
      presupuesto_id: data.presupuesto_id,
      vendedor_id,
      tipo: data.tipo,
      valor_propuesto: data.valor_propuesto,
      motivo: data.motivo,
      aplica_a: data.aplica_a,
      item_id: data.item_id,
      estado: 'PENDIENTE' as const,
    };

    const { data: solicitud, error } = await supabase
      .from('solicitudes_descuento')
      .insert(requestData)
      .select()
      .single();

    if (error) throw error;

    await AuditService.log({
      accion: 'CREAR_SOLICITUD_DESCUENTO',
      entidad: 'solicitudes_descuento',
      entidad_id: solicitud.id,
      usuario_id: vendedor_id,
      cambios: { after: solicitud },
    });

    const { data: admins } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin');

    if (admins && admins.length > 0) {
      await NotificationService.create({
        tipo: 'NUEVA_SOLICITUD_DESCUENTO',
        titulo: 'Nueva solicitud de descuento',
        mensaje: `${presupuesto.vendedor?.full_name} solicitó un descuento en el presupuesto ${presupuesto.codigo}`,
        entidad: 'solicitudes_descuento',
        entidad_id: solicitud.id,
        usuario_ids: admins.map((a) => a.id),
      });
    }

    return solicitud;
  }

  static async getById(id: string): Promise<SolicitudDescuento | null> {
    const { data, error } = await supabase
      .from('solicitudes_descuento')
      .select(
        `
        *,
        vendedor:users!solicitudes_descuento_vendedor_id_fkey(*),
        aprobador:users!solicitudes_descuento_aprobado_por_fkey(*),
        presupuesto:presupuestos(*),
        item:presupuesto_items(*)
      `
      )
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async list(
    filters: FilterOptions = {},
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResponse<SolicitudDescuento>> {
    const { page = 1, limit = 20, order_by = 'created_at', order_direction = 'desc' } = pagination;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('solicitudes_descuento')
      .select(
        `
        *,
        vendedor:users!solicitudes_descuento_vendedor_id_fkey(*),
        aprobador:users!solicitudes_descuento_aprobado_por_fkey(*),
        presupuesto:presupuestos(*)
      `,
        { count: 'exact' }
      )
      .is('deleted_at', null);

    if (filters.estado) {
      if (Array.isArray(filters.estado)) {
        query = query.in('estado', filters.estado);
      } else {
        query = query.eq('estado', filters.estado);
      }
    }

    if (filters.vendedor_id) {
      query = query.eq('vendedor_id', filters.vendedor_id);
    }

    if (filters.fecha_desde) {
      query = query.gte('created_at', filters.fecha_desde);
    }

    if (filters.fecha_hasta) {
      query = query.lte('created_at', filters.fecha_hasta);
    }

    const { data, error, count } = await query
      .order(order_by, { ascending: order_direction === 'asc' })
      .range(from, to);

    if (error) throw error;

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit),
    };
  }

  static async approve(
    id: string,
    admin_id: string,
    comentario_admin?: string
  ): Promise<SolicitudDescuento> {
    const solicitud = await this.getById(id);
    if (!solicitud) throw new Error('Solicitud no encontrada');

    if (solicitud.estado !== 'PENDIENTE') {
      throw new Error('Solo se pueden aprobar solicitudes pendientes');
    }

    const presupuesto = await PresupuestoService.getById(
      solicitud.presupuesto_id
    );
    if (!presupuesto) throw new Error('Presupuesto no encontrado');

    const updatedPresupuesto = BudgetCalculator.applyDiscount(
      presupuesto,
      solicitud.tipo,
      solicitud.valor_propuesto,
      solicitud.aplica_a,
      solicitud.item_id || undefined
    );

    await PresupuestoService.update(presupuesto.id, {
      total_bruto: updatedPresupuesto.total_bruto,
      total_descuento: updatedPresupuesto.total_descuento,
      total_neto: updatedPresupuesto.total_neto,
      total_impuestos: updatedPresupuesto.total_impuestos,
      total_comisiones: updatedPresupuesto.total_comisiones,
    });

    const { data, error } = await supabase
      .from('solicitudes_descuento')
      .update({
        estado: 'APROBADO',
        valor_aprobado: solicitud.valor_propuesto,
        aprobado_por: admin_id,
        comentario_admin,
        applied_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await AuditService.log({
      accion: 'APROBAR_SOLICITUD_DESCUENTO',
      entidad: 'solicitudes_descuento',
      entidad_id: id,
      usuario_id: admin_id,
      cambios: { before: solicitud, after: data },
    });

    await NotificationService.create({
      tipo: 'SOLICITUD_APROBADA',
      titulo: 'Solicitud de descuento aprobada',
      mensaje: `Tu solicitud de descuento para el presupuesto ${presupuesto.codigo} ha sido aprobada`,
      entidad: 'solicitudes_descuento',
      entidad_id: id,
      usuario_ids: [solicitud.vendedor_id],
    });

    return data;
  }

  static async approveWithModification(
    id: string,
    admin_id: string,
    valor_aprobado: number,
    comentario_admin?: string
  ): Promise<SolicitudDescuento> {
    const solicitud = await this.getById(id);
    if (!solicitud) throw new Error('Solicitud no encontrada');

    if (solicitud.estado !== 'PENDIENTE') {
      throw new Error('Solo se pueden aprobar solicitudes pendientes');
    }

    BudgetCalculator.validateDiscountValue(solicitud.tipo, valor_aprobado);

    const presupuesto = await PresupuestoService.getById(
      solicitud.presupuesto_id
    );
    if (!presupuesto) throw new Error('Presupuesto no encontrado');

    const updatedPresupuesto = BudgetCalculator.applyDiscount(
      presupuesto,
      solicitud.tipo,
      valor_aprobado,
      solicitud.aplica_a,
      solicitud.item_id || undefined
    );

    await PresupuestoService.update(presupuesto.id, {
      total_bruto: updatedPresupuesto.total_bruto,
      total_descuento: updatedPresupuesto.total_descuento,
      total_neto: updatedPresupuesto.total_neto,
      total_impuestos: updatedPresupuesto.total_impuestos,
      total_comisiones: updatedPresupuesto.total_comisiones,
    });

    const { data, error } = await supabase
      .from('solicitudes_descuento')
      .update({
        estado: 'APROBADO_MODIFICADO',
        valor_aprobado,
        aprobado_por: admin_id,
        comentario_admin,
        applied_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await AuditService.log({
      accion: 'APROBAR_MODIFICADO_SOLICITUD_DESCUENTO',
      entidad: 'solicitudes_descuento',
      entidad_id: id,
      usuario_id: admin_id,
      cambios: { before: solicitud, after: data },
    });

    await NotificationService.create({
      tipo: 'SOLICITUD_APROBADA_MODIFICADA',
      titulo: 'Solicitud de descuento aprobada con modificación',
      mensaje: `Tu solicitud de descuento para el presupuesto ${presupuesto.codigo} ha sido aprobada con modificaciones`,
      entidad: 'solicitudes_descuento',
      entidad_id: id,
      usuario_ids: [solicitud.vendedor_id],
    });

    return data;
  }

  static async reject(
    id: string,
    admin_id: string,
    comentario_admin: string
  ): Promise<SolicitudDescuento> {
    const solicitud = await this.getById(id);
    if (!solicitud) throw new Error('Solicitud no encontrada');

    if (solicitud.estado !== 'PENDIENTE') {
      throw new Error('Solo se pueden rechazar solicitudes pendientes');
    }

    const { data, error } = await supabase
      .from('solicitudes_descuento')
      .update({
        estado: 'RECHAZADO',
        aprobado_por: admin_id,
        comentario_admin,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await AuditService.log({
      accion: 'RECHAZAR_SOLICITUD_DESCUENTO',
      entidad: 'solicitudes_descuento',
      entidad_id: id,
      usuario_id: admin_id,
      cambios: { before: solicitud, after: data },
    });

    const presupuesto = await PresupuestoService.getById(
      solicitud.presupuesto_id
    );

    await NotificationService.create({
      tipo: 'SOLICITUD_RECHAZADA',
      titulo: 'Solicitud de descuento rechazada',
      mensaje: `Tu solicitud de descuento para el presupuesto ${presupuesto?.codigo} ha sido rechazada`,
      entidad: 'solicitudes_descuento',
      entidad_id: id,
      usuario_ids: [solicitud.vendedor_id],
    });

    return data;
  }

  static async cancel(
    id: string,
    vendedor_id: string
  ): Promise<SolicitudDescuento> {
    const solicitud = await this.getById(id);
    if (!solicitud) throw new Error('Solicitud no encontrada');

    if (solicitud.vendedor_id !== vendedor_id) {
      throw new Error('No tienes permiso para cancelar esta solicitud');
    }

    if (solicitud.estado !== 'PENDIENTE') {
      throw new Error('Solo se pueden cancelar solicitudes pendientes');
    }

    const { data, error } = await supabase
      .from('solicitudes_descuento')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await AuditService.log({
      accion: 'CANCELAR_SOLICITUD_DESCUENTO',
      entidad: 'solicitudes_descuento',
      entidad_id: id,
      usuario_id: vendedor_id,
      cambios: { before: solicitud, after: data },
    });

    return data;
  }
}

export class NotificationService {
  static async create(payload: NotificationPayload): Promise<void> {
    const notifications = payload.usuario_ids.map((usuario_id) => ({
      usuario_id,
      tipo: payload.tipo,
      titulo: payload.titulo,
      mensaje: payload.mensaje,
      entidad: payload.entidad,
      entidad_id: payload.entidad_id,
      leida: false,
    }));

    const { error } = await supabase
      .from('notificaciones')
      .insert(notifications);

    if (error) throw error;
  }

  static async getUnreadCount(usuario_id: string): Promise<number> {
    const { count, error } = await supabase
      .from('notificaciones')
      .select('*', { count: 'exact', head: true })
      .eq('usuario_id', usuario_id)
      .eq('leida', false);

    if (error) throw error;
    return count || 0;
  }

  static async markAsRead(id: string): Promise<void> {
    const { error } = await supabase
      .from('notificaciones')
      .update({ leida: true, leida_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  static async list(
    usuario_id: string,
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResponse<Notificacion>> {
    const { page = 1, limit = 20 } = pagination;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from('notificaciones')
      .select('*', { count: 'exact' })
      .eq('usuario_id', usuario_id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit),
    };
  }
}

export class AuditService {
  static async log(payload: AuditPayload): Promise<void> {
    const { error } = await supabase.from('auditorias').insert({
      accion: payload.accion,
      entidad: payload.entidad,
      entidad_id: payload.entidad_id,
      usuario_id: payload.usuario_id,
      cambios: payload.cambios,
      ip_address: payload.ip_address,
      user_agent: payload.user_agent,
    });

    if (error) throw error;
  }

  static async getByEntity(
    entidad: string,
    entidad_id: string
  ): Promise<Auditoria[]> {
    const { data, error } = await supabase
      .from('auditorias')
      .select(
        `
        *,
        usuario:users(*)
      `
      )
      .eq('entidad', entidad)
      .eq('entidad_id', entidad_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}

export class UserService {
  static async getCurrentUser(): Promise<User | null> {
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) return null;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async getById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }
}
