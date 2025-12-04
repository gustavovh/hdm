import { supabase } from '../lib/supabase';

export type BudgetStatus =
  | 'ABIERTO'
  | 'CLONADO'
  | 'PRESENTADO'
  | 'ACEPTADO'
  | 'EN_EJECUCION'
  | 'FACTURADO'
  | 'RECHAZADO'
  | 'CANCELADO'
  | 'INTERVENCION_ORDINARIA'
  | 'ANULADO'
  | 'BORRADOR';

export type EstadoSolicitud = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';

export interface SolicitudCambioEstado {
  id: string;
  presupuesto_id: string;
  estado_origen: BudgetStatus;
  estado_destino: BudgetStatus;
  justificacion: string;
  solicitante_id: string;
  estado_solicitud: EstadoSolicitud;
  created_at: string;
  updated_at: string;
  presupuestos?: {
    codigo: string;
    nombre_cliente: string;
  };
  users?: {
    full_name: string;
    email: string;
  };
}

export interface AprobacionCambioEstado {
  id: string;
  solicitud_id: string;
  aprobador_id: string;
  decision: 'APROBADA' | 'RECHAZADA';
  comentarios?: string;
  created_at: string;
  users?: {
    full_name: string;
    email: string;
  };
}

export interface ValidacionTransicion {
  permitido: boolean;
  requiere_aprobacion: boolean;
  mensaje: string;
}

export class EstadoWorkflowService {
  /**
   * Valida si una transición de estado es permitida
   */
  static async validarTransicion(
    estadoOrigen: BudgetStatus,
    estadoDestino: BudgetStatus
  ): Promise<ValidacionTransicion> {
    try {
      const { data, error } = await supabase.rpc('validar_transicion_estado', {
        p_estado_origen: estadoOrigen as string,
        p_estado_destino: estadoDestino as string,
      });

      if (error) throw error;

      return data as ValidacionTransicion;
    } catch (error) {
      console.error('Error validando transición:', error);
      throw error;
    }
  }

  /**
   * Crea una solicitud de cambio excepcional
   */
  static async crearSolicitud(
    presupuestoId: string,
    estadoDestino: BudgetStatus,
    justificacion: string
  ): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('crear_solicitud_cambio_estado', {
        p_presupuesto_id: presupuestoId,
        p_estado_destino: estadoDestino as string,
        p_justificacion: justificacion,
      });

      if (error) throw error;

      return data as string;
    } catch (error: any) {
      console.error('Error creando solicitud:', error);
      throw new Error(error.message || 'Error al crear la solicitud');
    }
  }

  /**
   * Obtiene todas las solicitudes pendientes (para admin)
   */
  static async getSolicitudesPendientes(): Promise<SolicitudCambioEstado[]> {
    try {
      const { data, error } = await supabase
        .from('solicitudes_cambio_estado')
        .select(`
          *,
          presupuestos!inner(codigo, nombre_cliente),
          users!solicitudes_cambio_estado_solicitante_id_fkey(full_name, email)
        `)
        .eq('estado_solicitud', 'PENDIENTE')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error obteniendo solicitudes pendientes:', error);
      throw error;
    }
  }

  /**
   * Obtiene todas las solicitudes (para admin)
   */
  static async getAllSolicitudes(): Promise<SolicitudCambioEstado[]> {
    try {
      const { data, error } = await supabase
        .from('solicitudes_cambio_estado')
        .select(`
          *,
          presupuestos!inner(codigo, nombre_cliente),
          users!solicitudes_cambio_estado_solicitante_id_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error obteniendo solicitudes:', error);
      throw error;
    }
  }

  /**
   * Obtiene las solicitudes de un usuario específico
   */
  static async getSolicitudesUsuario(userId: string): Promise<SolicitudCambioEstado[]> {
    try {
      const { data, error } = await supabase
        .from('solicitudes_cambio_estado')
        .select(`
          *,
          presupuestos!inner(codigo, nombre_cliente),
          users!solicitudes_cambio_estado_solicitante_id_fkey(full_name, email)
        `)
        .eq('solicitante_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error obteniendo solicitudes del usuario:', error);
      throw error;
    }
  }

  /**
   * Obtiene las solicitudes de un presupuesto específico
   */
  static async getSolicitudesPresupuesto(
    presupuestoId: string
  ): Promise<SolicitudCambioEstado[]> {
    try {
      const { data, error } = await supabase
        .from('solicitudes_cambio_estado')
        .select(`
          *,
          presupuestos!inner(codigo, nombre_cliente),
          users!solicitudes_cambio_estado_solicitante_id_fkey(full_name, email)
        `)
        .eq('presupuesto_id', presupuestoId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error obteniendo solicitudes del presupuesto:', error);
      throw error;
    }
  }

  /**
   * Aprueba o rechaza una solicitud (solo admin)
   */
  static async procesarSolicitud(
    solicitudId: string,
    decision: 'APROBADA' | 'RECHAZADA',
    comentarios?: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('procesar_solicitud_cambio_estado', {
        p_solicitud_id: solicitudId,
        p_decision: decision,
        p_comentarios: comentarios || null,
      });

      if (error) throw error;

      return data as boolean;
    } catch (error: any) {
      console.error('Error procesando solicitud:', error);
      throw new Error(error.message || 'Error al procesar la solicitud');
    }
  }

  /**
   * Obtiene las aprobaciones de una solicitud
   */
  static async getAprobacionesSolicitud(
    solicitudId: string
  ): Promise<AprobacionCambioEstado[]> {
    try {
      const { data, error } = await supabase
        .from('aprobaciones_cambio_estado')
        .select(`
          *,
          users!aprobaciones_cambio_estado_aprobador_id_fkey(full_name, email)
        `)
        .eq('solicitud_id', solicitudId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error obteniendo aprobaciones:', error);
      throw error;
    }
  }

  /**
   * Cambia el estado de un presupuesto (solo si no requiere aprobación)
   */
  static async cambiarEstadoDirecto(
    presupuestoId: string,
    nuevoEstado: BudgetStatus
  ): Promise<void> {
    try {
      // Primero obtener el estado actual
      const { data: presupuesto, error: fetchError } = await supabase
        .from('presupuestos')
        .select('estado')
        .eq('id', presupuestoId)
        .single();

      if (fetchError) throw fetchError;

      // Validar la transición
      const validacion = await this.validarTransicion(
        presupuesto.estado as BudgetStatus,
        nuevoEstado
      );

      if (!validacion.permitido) {
        throw new Error(validacion.mensaje);
      }

      if (validacion.requiere_aprobacion) {
        throw new Error(
          'Este cambio requiere aprobación administrativa. Por favor, cree una solicitud de cambio.'
        );
      }

      // Realizar el cambio
      const { error: updateError } = await supabase
        .from('presupuestos')
        .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
        .eq('id', presupuestoId);

      if (updateError) throw updateError;
    } catch (error: any) {
      console.error('Error cambiando estado:', error);
      throw new Error(error.message || 'Error al cambiar el estado');
    }
  }

  /**
   * Obtiene los estados válidos siguientes desde un estado dado
   */
  static getEstadosSiguientes(estadoActual: BudgetStatus): BudgetStatus[] {
    const flujoNormal: Record<BudgetStatus, BudgetStatus[]> = {
      ABIERTO: ['PRESENTADO'],
      CLONADO: ['PRESENTADO'],
      PRESENTADO: ['ACEPTADO'],
      ACEPTADO: ['EN_EJECUCION'],
      EN_EJECUCION: ['FACTURADO'],
      FACTURADO: [],
      RECHAZADO: [],
      CANCELADO: [],
      INTERVENCION_ORDINARIA: [],
      ANULADO: [],
      BORRADOR: ['PRESENTADO'],
    };

    return flujoNormal[estadoActual] || [];
  }

  /**
   * Obtiene los estados excepcionales posibles desde un estado dado
   */
  static getEstadosExcepcionales(estadoActual: BudgetStatus): BudgetStatus[] {
    // Todos los estados posibles
    const todosLosEstados: BudgetStatus[] = [
      'ABIERTO',
      'CLONADO',
      'PRESENTADO',
      'ACEPTADO',
      'EN_EJECUCION',
      'FACTURADO',
      'RECHAZADO',
      'CANCELADO',
      'INTERVENCION_ORDINARIA',
      'ANULADO',
      'BORRADOR',
    ];

    // Obtener transiciones normales
    const estadosNormales = this.getEstadosSiguientes(estadoActual);

    // Retornar todos los estados EXCEPTO el actual y los normales
    return todosLosEstados.filter(
      (estado) => estado !== estadoActual && !estadosNormales.includes(estado)
    );
  }

  /**
   * Obtiene un label legible para cada estado
   */
  static getEstadoLabel(estado: BudgetStatus): string {
    const labels: Record<BudgetStatus, string> = {
      ABIERTO: 'Abierto',
      CLONADO: 'Clonado',
      PRESENTADO: 'Presentado',
      ACEPTADO: 'Aceptado',
      EN_EJECUCION: 'En Ejecución',
      FACTURADO: 'Facturado',
      RECHAZADO: 'Rechazado',
      CANCELADO: 'Cancelado',
      INTERVENCION_ORDINARIA: 'Intervención Ordinaria',
      ANULADO: 'Anulado',
      BORRADOR: 'Borrador',
    };

    return labels[estado] || estado;
  }

  /**
   * Obtiene el color para cada estado
   */
  static getEstadoColor(estado: BudgetStatus): string {
    const colors: Record<BudgetStatus, string> = {
      ABIERTO: 'bg-blue-100 text-blue-800',
      CLONADO: 'bg-gray-100 text-gray-800',
      PRESENTADO: 'bg-yellow-100 text-yellow-800',
      ACEPTADO: 'bg-green-100 text-green-800',
      EN_EJECUCION: 'bg-purple-100 text-purple-800',
      FACTURADO: 'bg-emerald-100 text-emerald-800',
      RECHAZADO: 'bg-red-100 text-red-800',
      CANCELADO: 'bg-orange-100 text-orange-800',
      INTERVENCION_ORDINARIA: 'bg-indigo-100 text-indigo-800',
      ANULADO: 'bg-gray-100 text-gray-800',
      BORRADOR: 'bg-gray-100 text-gray-800',
    };

    return colors[estado] || 'bg-gray-100 text-gray-800';
  }
}
