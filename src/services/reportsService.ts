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
  static async getDashboardStats(period: '7d' | '30d' | '90d' = '30d'): Promise<DashboardStats> {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString();

    const previousStartDate = new Date();
    previousStartDate.setDate(previousStartDate.getDate() - (days * 2));
    const previousStartDateStr = previousStartDate.toISOString();

    const { data: presupuestos } = await supabase
      .from('presupuestos')
      .select('id, total_neto, total_impuestos, created_at, estado, vendedor_id')
      .gte('created_at', startDateStr)
      .is('deleted_at', null);

    const { data: presupuestosPrevious } = await supabase
      .from('presupuestos')
      .select('id')
      .gte('created_at', previousStartDateStr)
      .lt('created_at', startDateStr)
      .is('deleted_at', null);

    const { data: solicitudes } = await supabase
      .from('solicitudes_descuento')
      .select('id, estado')
      .gte('created_at', startDateStr)
      .is('deleted_at', null);

    const { data: presupuestosPresentados } = await supabase
      .from('presupuestos')
      .select('id, estado')
      .in('estado', ['PRESENTADO', 'ACEPTADO', 'FACTURADO'])
      .gte('created_at', startDateStr)
      .is('deleted_at', null);

    const { data: presupuestosAceptados } = await supabase
      .from('presupuestos')
      .select('id, estado')
      .in('estado', ['ACEPTADO', 'FACTURADO'])
      .gte('created_at', startDateStr)
      .is('deleted_at', null);

    const { data: presupuestosFacturados } = await supabase
      .from('presupuestos')
      .select('id')
      .eq('estado', 'FACTURADO')
      .gte('created_at', startDateStr)
      .is('deleted_at', null);

    const { data: topVendedores } = await supabase
      .from('presupuestos')
      .select(`
        vendedor_id,
        total_neto,
        total_impuestos,
        vendedor:users!presupuestos_vendedor_id_fkey(full_name)
      `)
      .gte('created_at', startDateStr)
      .is('deleted_at', null);

    const presupuestosTotal = presupuestos?.length || 0;
    const presupuestosPreviousTotal = presupuestosPrevious?.length || 0;
    const presupuestosChange = presupuestosPreviousTotal > 0
      ? Math.round(((presupuestosTotal - presupuestosPreviousTotal) / presupuestosPreviousTotal) * 100)
      : 0;

    const montoTotal = presupuestos?.reduce(
      (sum, p) => sum + (p.total_neto + p.total_impuestos),
      0
    ) || 0;

    const solicitudesPendientes = solicitudes?.filter(s => s.estado === 'PENDIENTE').length || 0;
    const solicitudesAprobadas = solicitudes?.filter(s => s.estado === 'APROBADO').length || 0;
    const solicitudesModificadas = solicitudes?.filter(s => s.estado === 'APROBADO_MODIFICADO').length || 0;
    const solicitudesRechazadas = solicitudes?.filter(s => s.estado === 'RECHAZADO').length || 0;

    const vendedoresActivos = new Set(presupuestos?.map(p => p.vendedor_id)).size;

    const presentadosTotal = presupuestosPresentados?.length || 0;
    const aceptadosTotal = presupuestosAceptados?.length || 0;
    const facturadosTotal = presupuestosFacturados?.length || 0;

    const tasaPresentadoAceptado = presentadosTotal > 0
      ? Math.round((aceptadosTotal / presentadosTotal) * 100)
      : 0;
    const tasaAceptadoFacturado = aceptadosTotal > 0
      ? Math.round((facturadosTotal / aceptadosTotal) * 100)
      : 0;
    const tasaDescuentosAprobados = (solicitudes?.length || 0) > 0
      ? Math.round(((solicitudesAprobadas + solicitudesModificadas) / solicitudes!.length) * 100)
      : 0;

    const vendedoresMap = new Map<string, { id: string; nombre: string; presupuestos: number; monto_total: number }>();

    topVendedores?.forEach((p: any) => {
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
