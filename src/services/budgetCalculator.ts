import {
  Presupuesto,
  PresupuestoItem,
  DiscountType,
  DiscountScope,
} from '../types/database.types';
import {
  BudgetCalculationResult,
  DiscountCalculationInput,
} from '../types/api.types';

export class BudgetCalculator {
  static calculateItemSubtotal(
    cantidad: number,
    precio_unitario: number
  ): number {
    return cantidad * precio_unitario;
  }

  static calculateBrutoTotal(items: PresupuestoItem[]): number {
    return items.reduce((sum, item) => sum + item.subtotal, 0);
  }

  static applyDiscountToValue(
    value: number,
    tipo: DiscountType,
    discountValue: number
  ): number {
    if (tipo === 'PORCENTAJE') {
      return (value * discountValue) / 100;
    }
    return discountValue;
  }

  static applyDiscount(
    presupuesto: Presupuesto,
    tipo: DiscountType,
    valor: number,
    scope: DiscountScope,
    item_id?: string
  ): Presupuesto {
    const updatedPresupuesto = { ...presupuesto };
    const items = [...(presupuesto.items || [])];

    if (scope === 'ITEM' && item_id) {
      const itemIndex = items.findIndex((item) => item.id === item_id);
      if (itemIndex === -1) {
        throw new Error('Item no encontrado');
      }

      const item = items[itemIndex];
      const discountAmount = this.applyDiscountToValue(
        item.subtotal,
        tipo,
        valor
      );

      if (discountAmount > item.subtotal) {
        throw new Error('El descuento no puede ser mayor al subtotal del ítem');
      }

      items[itemIndex] = {
        ...item,
        descuento_aplicado: discountAmount,
      };

      updatedPresupuesto.items = items;
      updatedPresupuesto.total_descuento = 0;
    } else {
      const totalBruto = this.calculateBrutoTotal(items);
      const discountAmount = this.applyDiscountToValue(
        totalBruto,
        tipo,
        valor
      );

      if (discountAmount > totalBruto) {
        throw new Error(
          'El descuento no puede ser mayor al total bruto del presupuesto'
        );
      }

      items.forEach(item => {
        item.descuento_aplicado = 0;
      });

      updatedPresupuesto.items = items;
      updatedPresupuesto.total_descuento = discountAmount;
    }

    return this.recalculateTotals(updatedPresupuesto);
  }

  static recalculateTotals(
    presupuesto: Presupuesto
  ): Presupuesto & BudgetCalculationResult {
    const items = presupuesto.items || [];

    const total_bruto = this.calculateBrutoTotal(items);

    const itemDiscounts = items.reduce(
      (sum, item) => sum + (item.descuento_aplicado || 0),
      0
    );

    const total_descuento = itemDiscounts > 0
      ? itemDiscounts
      : (presupuesto.total_descuento || 0);

    const total_neto = Math.max(0, total_bruto - total_descuento);

    const tasa_impuesto = presupuesto.tasa_impuesto || 0;
    const total_impuestos = (total_neto * tasa_impuesto) / 100;

    const tasa_comision = presupuesto.tasa_comision || 0;
    const total_comisiones = this.calculateCommissions(
      total_neto + total_impuestos,
      tasa_comision
    );

    return {
      ...presupuesto,
      total_bruto,
      total_descuento,
      total_neto,
      total_impuestos,
      total_comisiones,
    };
  }

  static calculateCommissions(
    total_neto: number,
    tasa_comision: number
  ): number {
    return (total_neto * tasa_comision) / 100;
  }

  static async calculateCommissionsWithTiers(
    total_neto: number,
    moneda: 'PYG' | 'USD',
    total_impuestos: number = 0
  ): Promise<{ tasa: number; monto: number }> {
    const baseAmount = total_neto + total_impuestos;
    try {
      const { CommissionsService } = await import('./commissionsService');
      const tier = await CommissionsService.calculateTier(baseAmount, moneda);
      const tasa = tier?.tasa_comision || 3.0;
      const monto = (baseAmount * tasa) / 100;
      return { tasa, monto };
    } catch (error) {
      const tasa = 3.0;
      const monto = (baseAmount * tasa) / 100;
      return { tasa, monto };
    }
  }

  static validateDiscountValue(
    tipo: DiscountType,
    valor: number,
    maxPercentage: number = 100
  ): boolean {
    if (valor < 0) {
      throw new Error('El valor del descuento no puede ser negativo');
    }

    if (tipo === 'PORCENTAJE' && valor > maxPercentage) {
      throw new Error(
        `El descuento porcentual no puede exceder ${maxPercentage}%`
      );
    }

    return true;
  }

  static calculateDiscountImpact(
    input: DiscountCalculationInput,
    presupuesto: Presupuesto
  ): BudgetCalculationResult {
    this.validateDiscountValue(input.tipo, input.valor);

    const updatedPresupuesto = this.applyDiscount(
      presupuesto,
      input.tipo,
      input.valor,
      input.aplica_a,
      input.item_id
    );

    return {
      total_bruto: updatedPresupuesto.total_bruto,
      total_descuento: updatedPresupuesto.total_descuento,
      total_neto: updatedPresupuesto.total_neto,
      total_impuestos: updatedPresupuesto.total_impuestos,
      total_comisiones: updatedPresupuesto.total_comisiones,
    };
  }

  static convertCurrency(
    amount: number,
    fromCurrency: 'PYG' | 'USD',
    toCurrency: 'PYG' | 'USD',
    exchangeRate: number
  ): number {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    if (fromCurrency === 'USD' && toCurrency === 'PYG') {
      return amount * exchangeRate;
    }

    if (fromCurrency === 'PYG' && toCurrency === 'USD') {
      return amount / exchangeRate;
    }

    return amount;
  }

  static formatCurrency(
    amount: number,
    currency: 'PYG' | 'USD',
    locale: string = 'es-PY'
  ): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency === 'PYG' ? 'PYG' : 'USD',
      minimumFractionDigits: currency === 'PYG' ? 0 : 2,
      maximumFractionDigits: currency === 'PYG' ? 0 : 2,
    }).format(amount);
  }
}
