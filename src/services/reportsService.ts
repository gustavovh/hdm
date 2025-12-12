import { supabase } from '../lib/supabase';

export interface DashboardStats {
  presupuestos: {
    total: number;
    change: number;
  };
  monto_total: {
    total: number;
    change: number;
  };
  solicitudes_descuento: {
    total: number;
    pendientes: number;
    aprobadas: number;
    modificadas: number;
    rechazadas: number;
  };
  presupuestos_por_estado: {
    clonado: number;
    presentado: number;
    aceptado: number;
    facturado: number;
    anulado: number;
  };
  vendedores_activos: number;
  tasas_conversion: {
    presentado_aceptado: number;
    aceptado_facturado: number;
    descuentos_aprobados: number;
  };
  top_vendedores: Array<{
    id: string;
    nombre: string;
    presupuestos: number;
    monto_total: number;
  }>;
}

export class ReportsService {
  static async getDashboardStats(
    period: '7d' | '30d' | '90d' = '30d',
    customDateFrom?: string,
    customDateTo?: string
  ): Promise<DashboardStats> {
    let startDateStr: string;
    let previousStartDateStr: string;

    if (customDateFrom && customDateTo) {
      // Usar rango de fechas personalizado
      startDateStr = new Date(customDateFrom).toISOString();
      const endDate = new Date(customDateTo);
      endDate.setHours(23, 59, 59, 999);

      // Para el período anterior, calcular la misma cantidad de días
      const daysDiff = Math.ceil((endDate.getTime() - new Date(customDateFrom).getTime()) / (1000 * 60 * 60 * 24));
      const previousStartDate = new Date(customDateFrom);
      previousStartDate.setDate(previousStartDate.getDate() - daysDiff);
      previousStartDateStr = previousStartDate.toISOString();
    } else {
      // Usar período predefinido
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDateStr = startDate.toISOString();

      const previousStartDate = new Date();
      previousStartDate.setDate(previousStartDate.getDate() - (days * 2));
      previousStartDateStr = previousStartDate.toISOString();
    }

    // Construir query base
    let presupuestosQuery = supabase
      .from('presupuestos')
      .select('id, total_neto, total_impuestos, created_at, estado, vendedor_id')
      .gte('created_at', startDateStr)
      .is('deleted_at', null);

    // Si hay rango personalizado, agregar límite superior
    if (customDateFrom && customDateTo) {
      const endDate = new Date(customDateTo);
      endDate.setHours(23, 59, 59, 999);
      presupuestosQuery = presupuestosQuery.lte('created_at', endDate.toISOString());
    }

    const { data: presupuestos } = await presupuestosQuery;

    const { data: presupuestosPrevious } = await supabase
      .from('presupuestos')
      .select('id')
      .gte('created_at', previousStartDateStr)
      .lt('created_at', startDateStr)
      .is('deleted_at', null);

    // Helper para agregar límite de fecha superior si es necesario
    const applyDateLimit = (query: any) => {
      if (customDateFrom && customDateTo) {
        const endDate = new Date(customDateTo);
        endDate.setHours(23, 59, 59, 999);
        return query.lte('created_at', endDate.toISOString());
      }
      return query;
    };

    let solicitudesQuery = supabase
      .from('solicitudes_descuento')
      .select('id, estado')
      .gte('created_at', startDateStr)
      .is('deleted_at', null);
    const { data: solicitudes } = await applyDateLimit(solicitudesQuery);

    let presentadosQuery = supabase
      .from('presupuestos')
      .select('id, estado')
      .in('estado', ['PRESENTADO', 'ACEPTADO', 'FACTURADO'])
      .gte('created_at', startDateStr)
      .is('deleted_at', null);
    const { data: presupuestosPresentados } = await applyDateLimit(presentadosQuery);

    let aceptadosQuery = supabase
      .from('presupuestos')
      .select('id, estado')
      .in('estado', ['ACEPTADO', 'FACTURADO'])
      .gte('created_at', startDateStr)
      .is('deleted_at', null);
    const { data: presupuestosAceptados } = await applyDateLimit(aceptadosQuery);

    let facturadosQuery = supabase
      .from('presupuestos')
      .select('id')
      .eq('estado', 'FACTURADO')
      .gte('created_at', startDateStr)
      .is('deleted_at', null);
    const { data: presupuestosFacturados } = await applyDateLimit(facturadosQuery);

    // Top vendedores: solo vendedores activos y presupuestos FACTURADOS, ACEPTADOS y EN_EJECUCION
    let topVendedoresQuery = supabase
      .from('presupuestos')
      .select(`
        vendedor_id,
        total_neto,
        total_impuestos,
        estado,
        vendedor:users!presupuestos_vendedor_id_fkey(id, full_name, active)
      `)
      .in('estado', ['FACTURADO', 'ACEPTADO', 'EN_EJECUCION'])
      .gte('created_at', startDateStr)
      .is('deleted_at', null);
    const { data: topVendedores } = await applyDateLimit(topVendedoresQuery);

    const presupuestosTotal = presupuestos?.length || 0;
    const presupuestosPreviousTotal = presupuestosPrevious?.length || 0;
    const presupuestosChange = presupuestosPreviousTotal > 0
      ? Math.round(((presupuestosTotal - presupuestosPreviousTotal) / presupuestosPreviousTotal) * 100)
      : 0;

    // Monto total solo de presupuestos ACEPTADOS y FACTURADOS
    const montoTotal = presupuestos?.reduce(
      (sum, p) => {
        if (p.estado === 'ACEPTADO' || p.estado === 'FACTURADO') {
          return sum + (p.total_neto + p.total_impuestos);
        }
        return sum;
      },
      0
    ) || 0;

    const solicitudesPendientes = solicitudes?.filter(s => s.estado === 'PENDIENTE').length || 0;
    const solicitudesAprobadas = solicitudes?.filter(s => s.estado === 'APROBADO').length || 0;
    const solicitudesModificadas = solicitudes?.filter(s => s.estado === 'APROBADO_MODIFICADO').length || 0;
    const solicitudesRechazadas = solicitudes?.filter(s => s.estado === 'RECHAZADO').length || 0;

    // Vendedores activos: solo contar vendedores con presupuestos en estados FACTURADO, ACEPTADO o EN_EJECUCION
    const vendedoresActivos = new Set(
      presupuestos
        ?.filter(p => p.estado === 'FACTURADO' || p.estado === 'ACEPTADO' || p.estado === 'EN_EJECUCION')
        ?.map(p => p.vendedor_id)
    ).size;

    // Calcular tasas de conversión con los presupuestos filtrados
    const presentadosTotal = presupuestosPresentados?.filter(p => p.estado === 'PRESENTADO').length || 0;
    const aceptadosYFacturadosTotal = presupuestosPresentados?.filter(p => p.estado === 'ACEPTADO' || p.estado === 'FACTURADO').length || 0;
    const aceptadosTotal = presupuestosAceptados?.filter(p => p.estado === 'ACEPTADO').length || 0;
    const facturadosTotal = presupuestosFacturados?.length || 0;

    // Presentados → Aceptados (incluye aceptados y facturados)
    const tasaPresentadoAceptado = presentadosTotal > 0
      ? Math.round((aceptadosYFacturadosTotal / presentadosTotal) * 100)
      : 0;
    // Aceptados → Facturados: facturados / (aceptados + facturados)
    // No puede ser mayor a 100%
    const aceptadosYFacturadosTotalBase = aceptadosTotal + facturadosTotal;
    const tasaAceptadoFacturado = aceptadosYFacturadosTotalBase > 0
      ? Math.round((facturadosTotal / aceptadosYFacturadosTotalBase) * 100)
      : 0;
    const tasaDescuentosAprobados = (solicitudes?.length || 0) > 0
      ? Math.round(((solicitudesAprobadas + solicitudesModificadas) / solicitudes!.length) * 100)
      : 0;

    const vendedoresMap = new Map<string, { id: string; nombre: string; presupuestos: number; monto_total: number }>();

    topVendedores?.forEach((p: any) => {
      // Filtrar solo vendedores activos
      if (!p.vendedor?.active) {
        return;
      }

      const vendedorId = p.vendedor_id;
      const vendedorNombre = p.vendedor?.full_name || 'Desconocido';
      const monto = p.total_neto + p.total_impuestos;

      if (!vendedoresMap.has(vendedorId)) {
        vendedoresMap.set(vendedorId, {
          id: vendedorId,
          nombre: vendedorNombre,
          presupuestos: 0,
          monto_total: 0,
        });
      }

      const vendedor = vendedoresMap.get(vendedorId)!;
      vendedor.presupuestos++;
      vendedor.monto_total += monto;
    });

    const topVendedoresArray = Array.from(vendedoresMap.values())
      .sort((a, b) => b.monto_total - a.monto_total);

    const clonadoCount = presupuestos?.filter(p => p.estado === 'CLONADO').length || 0;
    const presentadoCount = presupuestos?.filter(p => p.estado === 'PRESENTADO').length || 0;
    const aceptadoCount = presupuestos?.filter(p => p.estado === 'ACEPTADO').length || 0;
    const facturadoCount = presupuestos?.filter(p => p.estado === 'FACTURADO').length || 0;
    const anuladoCount = presupuestos?.filter(p => p.estado === 'ANULADO').length || 0;

    return {
      presupuestos: {
        total: presupuestosTotal,
        change: presupuestosChange,
      },
      monto_total: {
        total: montoTotal,
        change: 0,
      },
      solicitudes_descuento: {
        total: solicitudes?.length || 0,
        pendientes: solicitudesPendientes,
        aprobadas: solicitudesAprobadas,
        modificadas: solicitudesModificadas,
        rechazadas: solicitudesRechazadas,
      },
      presupuestos_por_estado: {
        clonado: clonadoCount,
        presentado: presentadoCount,
        aceptado: aceptadoCount,
        facturado: facturadoCount,
        anulado: anuladoCount,
      },
      vendedores_activos: vendedoresActivos,
      tasas_conversion: {
        presentado_aceptado: tasaPresentadoAceptado,
        aceptado_facturado: tasaAceptadoFacturado,
        descuentos_aprobados: tasaDescuentosAprobados,
      },
      top_vendedores: topVendedoresArray,
    };
  }
}
