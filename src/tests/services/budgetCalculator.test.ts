import { describe, it, expect } from 'vitest';
import { BudgetCalculator } from '../../services/budgetCalculator';
import { Presupuesto, PresupuestoItem } from '../../types/database.types';

describe('BudgetCalculator', () => {
  describe('calculateItemSubtotal', () => {
    it('should calculate item subtotal correctly', () => {
      expect(BudgetCalculator.calculateItemSubtotal(5, 1000)).toBe(5000);
      expect(BudgetCalculator.calculateItemSubtotal(2.5, 1500)).toBe(3750);
      expect(BudgetCalculator.calculateItemSubtotal(0, 1000)).toBe(0);
    });
  });

  describe('calculateBrutoTotal', () => {
    it('should calculate total from items', () => {
      const items: PresupuestoItem[] = [
        {
          id: '1',
          presupuesto_id: 'p1',
          descripcion: 'Item 1',
          cantidad: 2,
          precio_unitario: 1000,
          subtotal: 2000,
          descuento_aplicado: 0,
          orden: 0,
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          presupuesto_id: 'p1',
          descripcion: 'Item 2',
          cantidad: 3,
          precio_unitario: 1500,
          subtotal: 4500,
          descuento_aplicado: 0,
          orden: 1,
          created_at: new Date().toISOString(),
        },
      ];

      expect(BudgetCalculator.calculateBrutoTotal(items)).toBe(6500);
    });

    it('should return 0 for empty items', () => {
      expect(BudgetCalculator.calculateBrutoTotal([])).toBe(0);
    });
  });

  describe('validateDiscountValue', () => {
    it('should validate percentage discounts', () => {
      expect(() =>
        BudgetCalculator.validateDiscountValue('PORCENTAJE', 50)
      ).not.toThrow();
      expect(() =>
        BudgetCalculator.validateDiscountValue('PORCENTAJE', 100)
      ).not.toThrow();
    });

    it('should throw error for percentage > 100', () => {
      expect(() =>
        BudgetCalculator.validateDiscountValue('PORCENTAJE', 150)
      ).toThrow('El descuento porcentual no puede exceder 100%');
    });

    it('should throw error for negative values', () => {
      expect(() =>
        BudgetCalculator.validateDiscountValue('PORCENTAJE', -10)
      ).toThrow('El valor del descuento no puede ser negativo');
      expect(() =>
        BudgetCalculator.validateDiscountValue('MONTO', -100)
      ).toThrow('El valor del descuento no puede ser negativo');
    });

    it('should validate monto discounts', () => {
      expect(() =>
        BudgetCalculator.validateDiscountValue('MONTO', 1000)
      ).not.toThrow();
      expect(() =>
        BudgetCalculator.validateDiscountValue('MONTO', 0)
      ).not.toThrow();
    });

    it('should respect custom max percentage', () => {
      expect(() =>
        BudgetCalculator.validateDiscountValue('PORCENTAJE', 40, 30)
      ).toThrow('El descuento porcentual no puede exceder 30%');
    });
  });

  describe('applyDiscountToValue', () => {
    it('should apply percentage discount correctly', () => {
      expect(BudgetCalculator.applyDiscountToValue(10000, 'PORCENTAJE', 10)).toBe(
        1000
      );
      expect(BudgetCalculator.applyDiscountToValue(5000, 'PORCENTAJE', 25)).toBe(
        1250
      );
      expect(BudgetCalculator.applyDiscountToValue(1000, 'PORCENTAJE', 100)).toBe(
        1000
      );
    });

    it('should apply monto discount correctly', () => {
      expect(BudgetCalculator.applyDiscountToValue(10000, 'MONTO', 1500)).toBe(
        1500
      );
      expect(BudgetCalculator.applyDiscountToValue(5000, 'MONTO', 500)).toBe(500);
    });
  });

  describe('calculateCommissions', () => {
    it('should calculate commissions correctly', () => {
      expect(BudgetCalculator.calculateCommissions(10000, 5)).toBe(500);
      expect(BudgetCalculator.calculateCommissions(20000, 10)).toBe(2000);
      expect(BudgetCalculator.calculateCommissions(15000, 0)).toBe(0);
    });
  });

  describe('applyDiscount - GLOBAL scope', () => {
    const mockPresupuesto: Presupuesto = {
      id: 'p1',
      codigo: 'PRE-001',
      cliente_nombre: 'Cliente Test',
      cliente_email: 'cliente@test.com',
      cliente_telefono: null,
      cliente_documento: null,
      vendedor_id: 'v1',
      moneda: 'PYG',
      tipo_cambio: 1,
      total_bruto: 10000,
      total_descuento: 0,
      total_neto: 10000,
      total_impuestos: 1000,
      total_comisiones: 500,
      tasa_impuesto: 10,
      tasa_comision: 5,
      estado: 'CLONADO',
      fecha_presentacion: null,
      fecha_aceptacion: null,
      fecha_facturacion: null,
      observaciones: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      items: [
        {
          id: 'i1',
          presupuesto_id: 'p1',
          descripcion: 'Item 1',
          cantidad: 2,
          precio_unitario: 5000,
          subtotal: 10000,
          descuento_aplicado: 0,
          orden: 0,
          created_at: new Date().toISOString(),
        },
      ],
    };

    it('should apply global percentage discount', () => {
      const result = BudgetCalculator.applyDiscount(
        mockPresupuesto,
        'PORCENTAJE',
        10,
        'GLOBAL'
      );

      expect(result.total_descuento).toBe(1000);
      expect(result.total_neto).toBe(9000);
      expect(result.total_impuestos).toBe(900);
      expect(result.total_comisiones).toBe(495);
    });

    it('should apply global monto discount', () => {
      const result = BudgetCalculator.applyDiscount(
        mockPresupuesto,
        'MONTO',
        1500,
        'GLOBAL'
      );

      expect(result.total_descuento).toBe(1500);
      expect(result.total_neto).toBe(8500);
      expect(result.total_impuestos).toBe(850);
      expect(result.total_comisiones).toBe(467.5);
    });

    it('should throw error if discount exceeds total', () => {
      expect(() =>
        BudgetCalculator.applyDiscount(mockPresupuesto, 'MONTO', 15000, 'GLOBAL')
      ).toThrow('El descuento no puede ser mayor al total bruto del presupuesto');
    });
  });

  describe('applyDiscount - ITEM scope', () => {
    const mockPresupuesto: Presupuesto = {
      id: 'p1',
      codigo: 'PRE-001',
      cliente_nombre: 'Cliente Test',
      cliente_email: 'cliente@test.com',
      cliente_telefono: null,
      cliente_documento: null,
      vendedor_id: 'v1',
      moneda: 'PYG',
      tipo_cambio: 1,
      total_bruto: 15000,
      total_descuento: 0,
      total_neto: 15000,
      total_impuestos: 1500,
      total_comisiones: 750,
      tasa_impuesto: 10,
      tasa_comision: 5,
      estado: 'CLONADO',
      fecha_presentacion: null,
      fecha_aceptacion: null,
      fecha_facturacion: null,
      observaciones: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      items: [
        {
          id: 'i1',
          presupuesto_id: 'p1',
          descripcion: 'Item 1',
          cantidad: 2,
          precio_unitario: 5000,
          subtotal: 10000,
          descuento_aplicado: 0,
          orden: 0,
          created_at: new Date().toISOString(),
        },
        {
          id: 'i2',
          presupuesto_id: 'p1',
          descripcion: 'Item 2',
          cantidad: 1,
          precio_unitario: 5000,
          subtotal: 5000,
          descuento_aplicado: 0,
          orden: 1,
          created_at: new Date().toISOString(),
        },
      ],
    };

    it('should apply item-level percentage discount', () => {
      const result = BudgetCalculator.applyDiscount(
        mockPresupuesto,
        'PORCENTAJE',
        20,
        'ITEM',
        'i1'
      );

      const item1 = result.items?.find((i) => i.id === 'i1');
      expect(item1?.descuento_aplicado).toBe(2000);
      expect(result.total_neto).toBe(13000);
    });

    it('should apply item-level monto discount', () => {
      const result = BudgetCalculator.applyDiscount(
        mockPresupuesto,
        'MONTO',
        1000,
        'ITEM',
        'i2'
      );

      const item2 = result.items?.find((i) => i.id === 'i2');
      expect(item2?.descuento_aplicado).toBe(1000);
      expect(result.total_neto).toBe(14000);
    });

    it('should throw error if item not found', () => {
      expect(() =>
        BudgetCalculator.applyDiscount(
          mockPresupuesto,
          'PORCENTAJE',
          10,
          'ITEM',
          'invalid-id'
        )
      ).toThrow('Item no encontrado');
    });

    it('should throw error if discount exceeds item subtotal', () => {
      expect(() =>
        BudgetCalculator.applyDiscount(mockPresupuesto, 'MONTO', 15000, 'ITEM', 'i1')
      ).toThrow('El descuento no puede ser mayor al subtotal del ítem');
    });
  });

  describe('recalculateTotals', () => {
    it('should recalculate all totals correctly', () => {
      const presupuesto: Presupuesto = {
        id: 'p1',
        codigo: 'PRE-001',
        cliente_nombre: 'Cliente Test',
        cliente_email: 'cliente@test.com',
        cliente_telefono: null,
        cliente_documento: null,
        vendedor_id: 'v1',
        moneda: 'PYG',
        tipo_cambio: 1,
        total_bruto: 0,
        total_descuento: 500,
        total_neto: 0,
        total_impuestos: 0,
        total_comisiones: 0,
        tasa_impuesto: 10,
        tasa_comision: 5,
        estado: 'CLONADO',
        fecha_presentacion: null,
        fecha_aceptacion: null,
        fecha_facturacion: null,
        observaciones: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        items: [
          {
            id: 'i1',
            presupuesto_id: 'p1',
            descripcion: 'Item 1',
            cantidad: 2,
            precio_unitario: 5000,
            subtotal: 10000,
            descuento_aplicado: 200,
            orden: 0,
            created_at: new Date().toISOString(),
          },
          {
            id: 'i2',
            presupuesto_id: 'p1',
            descripcion: 'Item 2',
            cantidad: 1,
            precio_unitario: 5000,
            subtotal: 5000,
            descuento_aplicado: 100,
            orden: 1,
            created_at: new Date().toISOString(),
          },
        ],
      };

      const result = BudgetCalculator.recalculateTotals(presupuesto);

      expect(result.total_bruto).toBe(15000);
      expect(result.total_descuento).toBe(300);
      expect(result.total_neto).toBe(14700);
      expect(result.total_impuestos).toBe(1470);
      expect(result.total_comisiones).toBe(808.5);
    });

    it('should handle zero totals', () => {
      const presupuesto: Presupuesto = {
        id: 'p1',
        codigo: 'PRE-001',
        cliente_nombre: 'Cliente Test',
        cliente_email: 'cliente@test.com',
        cliente_telefono: null,
        cliente_documento: null,
        vendedor_id: 'v1',
        moneda: 'PYG',
        tipo_cambio: 1,
        total_bruto: 0,
        total_descuento: 0,
        total_neto: 0,
        total_impuestos: 0,
        total_comisiones: 0,
        tasa_impuesto: 10,
        tasa_comision: 5,
        estado: 'CLONADO',
        fecha_presentacion: null,
        fecha_aceptacion: null,
        fecha_facturacion: null,
        observaciones: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        items: [],
      };

      const result = BudgetCalculator.recalculateTotals(presupuesto);

      expect(result.total_bruto).toBe(0);
      expect(result.total_descuento).toBe(0);
      expect(result.total_neto).toBe(0);
      expect(result.total_impuestos).toBe(0);
      expect(result.total_comisiones).toBe(0);
    });
  });

  describe('convertCurrency', () => {
    it('should convert PYG to USD', () => {
      expect(BudgetCalculator.convertCurrency(7300, 'PYG', 'USD', 7300)).toBe(1);
      expect(BudgetCalculator.convertCurrency(14600, 'PYG', 'USD', 7300)).toBe(2);
    });

    it('should convert USD to PYG', () => {
      expect(BudgetCalculator.convertCurrency(1, 'USD', 'PYG', 7300)).toBe(7300);
      expect(BudgetCalculator.convertCurrency(2, 'USD', 'PYG', 7300)).toBe(14600);
    });

    it('should return same value for same currency', () => {
      expect(BudgetCalculator.convertCurrency(1000, 'PYG', 'PYG', 7300)).toBe(
        1000
      );
      expect(BudgetCalculator.convertCurrency(1000, 'USD', 'USD', 7300)).toBe(
        1000
      );
    });
  });

  describe('formatCurrency', () => {
    it('should format PYG without decimals', () => {
      const formatted = BudgetCalculator.formatCurrency(123456, 'PYG');
      expect(formatted).toContain('123');
    });

    it('should format USD with decimals', () => {
      const formatted = BudgetCalculator.formatCurrency(123.45, 'USD');
      expect(formatted).toContain('123');
      expect(formatted).toContain('45');
    });
  });

  describe('Edge cases', () => {
    it('should handle 100% discount', () => {
      const presupuesto: Presupuesto = {
        id: 'p1',
        codigo: 'PRE-001',
        cliente_nombre: 'Cliente Test',
        cliente_email: 'cliente@test.com',
        cliente_telefono: null,
        cliente_documento: null,
        vendedor_id: 'v1',
        moneda: 'PYG',
        tipo_cambio: 1,
        total_bruto: 10000,
        total_descuento: 0,
        total_neto: 10000,
        total_impuestos: 1000,
        total_comisiones: 500,
        tasa_impuesto: 10,
        tasa_comision: 5,
        estado: 'CLONADO',
        fecha_presentacion: null,
        fecha_aceptacion: null,
        fecha_facturacion: null,
        observaciones: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        items: [
          {
            id: 'i1',
            presupuesto_id: 'p1',
            descripcion: 'Item 1',
            cantidad: 1,
            precio_unitario: 10000,
            subtotal: 10000,
            descuento_aplicado: 0,
            orden: 0,
            created_at: new Date().toISOString(),
          },
        ],
      };

      const result = BudgetCalculator.applyDiscount(
        presupuesto,
        'PORCENTAJE',
        100,
        'GLOBAL'
      );

      expect(result.total_descuento).toBe(10000);
      expect(result.total_neto).toBe(0);
      expect(result.total_impuestos).toBe(0);
      expect(result.total_comisiones).toBe(0);
    });

    it('should handle very small amounts', () => {
      const result = BudgetCalculator.calculateItemSubtotal(0.001, 0.001);
      expect(result).toBeCloseTo(0.000001, 6);
    });

    it('should handle very large amounts', () => {
      const result = BudgetCalculator.calculateItemSubtotal(
        1000000,
        1000000
      );
      expect(result).toBe(1000000000000);
    });
  });
});
