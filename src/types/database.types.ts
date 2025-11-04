export type UserRole = 'admin' | 'vendedor';

export type CurrencyType = 'PYG' | 'USD';

export type BudgetStatus =
  | 'BORRADOR'
  | 'PRESENTADO'
  | 'ACEPTADO'
  | 'FACTURADO'
  | 'ANULADO';

export type DiscountType = 'PORCENTAJE' | 'MONTO';

export type DiscountRequestStatus =
  | 'PENDIENTE'
  | 'APROBADO'
  | 'RECHAZADO'
  | 'APROBADO_MODIFICADO';

export type DiscountScope = 'GLOBAL' | 'ITEM';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Presupuesto {
  id: string;
  codigo: string;
  concepto: string;
  cliente_nombre: string;
  cliente_email?: string;
  cliente_telefono?: string;
  cliente_documento?: string;
  vendedor_id: string;
  moneda: CurrencyType;
  tipo_cambio: number;
  total_bruto: number;
  total_descuento: number;
  total_neto: number;
  total_impuestos: number;
  total_comisiones: number;
  tasa_impuesto: number;
  tasa_comision: number;
  estado: BudgetStatus;
  fecha_presentacion?: string;
  fecha_aceptacion?: string;
  fecha_facturacion?: string;
  numero_factura?: string;
  monto_factura?: number;
  condicion_pago?: string;
  medio_pago?: string;
  enlace_comprobante?: string;
  observaciones?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  vendedor?: User;
  items?: PresupuestoItem[];
  solicitudes_descuento?: SolicitudDescuento[];
  cliente_ruc?: string;
  descripcion?: string;
  dias_validez?: number;
  total_final?: number;
}

export interface PresupuestoItem {
  id: string;
  presupuesto_id: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  descuento_aplicado: number;
  orden: number;
  created_at: string;
}

export interface SolicitudDescuento {
  id: string;
  presupuesto_id: string;
  vendedor_id: string;
  tipo: DiscountType;
  valor_propuesto: number;
  motivo: string;
  estado: DiscountRequestStatus;
  valor_aprobado?: number;
  aprobado_por?: string;
  comentario_admin?: string;
  aplica_a: DiscountScope;
  item_id?: string;
  applied_at?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  vendedor?: User;
  aprobador?: User;
  presupuesto?: Presupuesto;
  item?: PresupuestoItem;
}

export interface Auditoria {
  id: string;
  accion: string;
  entidad: string;
  entidad_id: string;
  usuario_id?: string;
  cambios?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  usuario?: User;
}

export interface Notificacion {
  id: string;
  usuario_id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  entidad?: string;
  entidad_id?: string;
  leida: boolean;
  leida_at?: string;
  created_at: string;
}

export interface Configuracion {
  id: string;
  clave: string;
  valor: any;
  descripcion?: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at'>>;
      };
      presupuestos: {
        Row: Presupuesto;
        Insert: Omit<Presupuesto, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Presupuesto, 'id' | 'created_at'>>;
      };
      presupuesto_items: {
        Row: PresupuestoItem;
        Insert: Omit<PresupuestoItem, 'id' | 'created_at'>;
        Update: Partial<Omit<PresupuestoItem, 'id' | 'created_at'>>;
      };
      solicitudes_descuento: {
        Row: SolicitudDescuento;
        Insert: Omit<SolicitudDescuento, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<SolicitudDescuento, 'id' | 'created_at'>>;
      };
      auditorias: {
        Row: Auditoria;
        Insert: Omit<Auditoria, 'id' | 'created_at'>;
        Update: never;
      };
      notificaciones: {
        Row: Notificacion;
        Insert: Omit<Notificacion, 'id' | 'created_at'>;
        Update: Partial<Omit<Notificacion, 'id' | 'created_at'>>;
      };
      configuracion: {
        Row: Configuracion;
        Insert: Omit<Configuracion, 'id' | 'updated_at'>;
        Update: Partial<Omit<Configuracion, 'id'>>;
      };
    };
  };
}
