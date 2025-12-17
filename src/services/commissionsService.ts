import { supabase } from '../lib/supabase';

export interface CommissionTier {
  id: string;
  nombre: string;
  descripcion?: string;
  min_amount: number;
  max_amount?: number;
  tasa_comision: number;
  moneda: 'PYG' | 'USD';
  activo: boolean;
}

export interface VendedorObjective {
  id: string;
  vendedor_id: string;
  periodo_anio: number;
  periodo_mes: number;
  objetivo_monto: number;
  moneda: 'PYG' | 'USD';
}

export interface CommissionCalculation {
  id: string;
  vendedor_id: string;
  periodo_anio: number;
  periodo_mes: number;
  monto_vendido: number;
  objetivo_monto?: number;
  porcentaje_cumplimiento?: number;
  tier_aplicado_id?: string;
  tasa_comision_aplicada: number;
  monto_comision: number;
  moneda: 'PYG' | 'USD';
  presupuestos_incluidos?: any;
  pagado: boolean;
  calculado_at: string;
}

export class CommissionsService {
  static async getTiers(moneda?: 'PYG' | 'USD'): Promise<CommissionTier[]> {
    let query = supabase
      .from('commission_tiers')
      .select('*')
      .eq('activo', true)
      .order('min_amount', { ascending: true });

    if (moneda) {
      query = query.eq('moneda', moneda);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  static async calculateTier(
    montoVendido: number,
    moneda: 'PYG' | 'USD'
  ): Promise<CommissionTier | null> {
    const tiers = await this.getTiers(moneda);

    for (const tier of tiers) {
      if (montoVendido >= tier.min_amount) {
        if (!tier.max_amount || montoVendido <= tier.max_amount) {
          return tier;
        }
      }
    }

    return tiers.length > 0 ? tiers[tiers.length - 1] : null;
  }

  static async getVendedorObjective(
    vendedorId: string,
    anio: number,
    mes: number
  ): Promise<VendedorObjective | null> {
    const { data, error } = await supabase
      .from('vendedor_objectives')
      .select('*')
      .eq('vendedor_id', vendedorId)
      .eq('periodo_anio', anio)
      .eq('periodo_mes', mes)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async setVendedorObjective(
    vendedorId: string,
    anio: number,
    mes: number,
    objetivoMonto: number,
    moneda: 'PYG' | 'USD' = 'PYG'
  ): Promise<VendedorObjective> {
    const { data, error } = await supabase
      .from('vendedor_objectives')
      .upsert(
        {
          vendedor_id: vendedorId,
          periodo_anio: anio,
          periodo_mes: mes,
          objetivo_monto: objetivoMonto,
          moneda,
        },
        { onConflict: 'vendedor_id,periodo_anio,periodo_mes' }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async calculateMonthlyCommission(
    vendedorId: string,
    anio: number,
    mes: number
  ): Promise<CommissionCalculation> {
    const startDate = new Date(anio, mes - 1, 1);
    const endDate = new Date(anio, mes, 0, 23, 59, 59);

    const { data: presupuestos, error: presupuestosError } = await supabase
      .from('presupuestos')
      .select('id, total_neto, total_impuestos, moneda, codigo')
      .eq('vendedor_id', vendedorId)
      .in('estado', ['ACEPTADO', 'EN_EJECUCION', 'FACTURADO'])
      .gte('ultima_actualizacion_estado', startDate.toISOString())
      .lte('ultima_actualizacion_estado', endDate.toISOString())
      .is('deleted_at', null);

    if (presupuestosError) throw presupuestosError;

    const presupuestosPYG = presupuestos?.filter((p) => p.moneda === 'PYG') || [];
    const presupuestosUSD = presupuestos?.filter((p) => p.moneda === 'USD') || [];

    const montoVendidoPYG = presupuestosPYG.reduce(
      (sum, p) => sum + p.total_neto + p.total_impuestos,
      0
    );
    const montoVendidoUSD = presupuestosUSD.reduce(
      (sum, p) => sum + p.total_neto + p.total_impuestos,
      0
    );

    const monedaPrincipal = montoVendidoPYG >= montoVendidoUSD ? 'PYG' : 'USD';
    const montoVendido =
      monedaPrincipal === 'PYG' ? montoVendidoPYG : montoVendidoUSD;

    // Usar sales_targets en lugar de vendedor_objectives
    const { data: salesTarget } = await supabase
      .from('sales_targets')
      .select('objetivo')
      .eq('user_id', vendedorId)
      .eq('año', anio)
      .eq('mes', mes)
      .maybeSingle();

    const objetivoMonto = salesTarget?.objetivo || 0;
    const tier = await this.calculateTier(montoVendido, monedaPrincipal);

    const tasaComision = tier?.tasa_comision || 3.0;
    const montoComision = (montoVendido * tasaComision) / 100;

    const porcentajeCumplimiento = objetivoMonto > 0
      ? Math.round((montoVendido / objetivoMonto) * 100)
      : undefined;

    const calculationData = {
      vendedor_id: vendedorId,
      periodo_anio: anio,
      periodo_mes: mes,
      monto_vendido: montoVendido,
      objetivo_monto: objetivoMonto || null,
      porcentaje_cumplimiento: porcentajeCumplimiento,
      tier_aplicado_id: tier?.id,
      tasa_comision_aplicada: tasaComision,
      monto_comision: montoComision,
      moneda: monedaPrincipal,
      presupuestos_incluidos: presupuestos?.map((p) => ({
        id: p.id,
        codigo: p.codigo,
        monto: p.total_neto + p.total_impuestos,
        moneda: p.moneda,
      })),
      pagado: false,
    };

    const { data, error } = await supabase
      .from('commission_calculations')
      .upsert(calculationData, {
        onConflict: 'vendedor_id,periodo_anio,periodo_mes',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getVendedorCommissions(
    vendedorId: string,
    limit: number = 12
  ): Promise<CommissionCalculation[]> {
    const { data, error } = await supabase
      .from('commission_calculations')
      .select('*')
      .eq('vendedor_id', vendedorId)
      .order('periodo_anio', { ascending: false })
      .order('periodo_mes', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  static async markAsPaid(
    calculationId: string,
    paidAt?: Date
  ): Promise<CommissionCalculation> {
    const { data, error } = await supabase
      .from('commission_calculations')
      .update({
        pagado: true,
        pagado_at: (paidAt || new Date()).toISOString(),
      })
      .eq('id', calculationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getAllCommissions(
    anio?: number,
    mes?: number,
    pagado?: boolean
  ): Promise<CommissionCalculation[]> {
    let query = supabase
      .from('commission_calculations')
      .select('*')
      .order('periodo_anio', { ascending: false })
      .order('periodo_mes', { ascending: false });

    if (anio) query = query.eq('periodo_anio', anio);
    if (mes) query = query.eq('periodo_mes', mes);
    if (pagado !== undefined) query = query.eq('pagado', pagado);

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  static getPeriodoLabel(anio: number, mes: number): string {
    const meses = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];
    return `${meses[mes - 1]} ${anio}`;
  }

  static formatCurrency(amount: number, moneda: 'PYG' | 'USD'): string {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: moneda === 'PYG' ? 'PYG' : 'USD',
      minimumFractionDigits: moneda === 'PYG' ? 0 : 2,
    }).format(amount);
  }
}
