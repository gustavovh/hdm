export type UserRole = 'admin' | 'vendedor' | 'administrativo';

export type CurrencyType = 'PYG' | 'USD';

export type BudgetStatus =
  | 'CLONADO'
  | 'ABIERTO'
  | 'PRESENTADO'
  | 'ACEPTADO'
  | 'EN_EJECUCION'
  | 'FACTURADO'
  | 'RECHAZADO'
  | 'CANCELADO'
  | 'ANULADO';

export type DiscountType = 'PORCENTAJE' | 'MONTO';

export type DiscountRequestStatus =
  | 'PENDIENTE'
  | 'APROBADO'
  | 'RECHAZADO'
  | 'APROBADO_MODIFICADO';

export type DiscountScope = 'GLOBAL' | 'ITEM';

export interface Categoria {
  id: string;
  nombre: string;
  descripcion?: string;
  activa: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
}

export interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoria_id?: string;
  categoria?: Categoria;
  precio_base: number;
  precio_usd?: number;
  unidad_medida: string;
  stock_disponible?: number;
  stock_minimo?: number;
  activo: boolean;
  imagen_url?: string;
  notas?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  signature_url?: string;
  phone?: string;
  razon_social?: string;
  ruc?: string;
  direccion_facturacion?: string;
  ciudad_facturacion?: string;
  telefono_facturacion?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Presupuesto {
  id: string;
  codigo: string;
  concepto: string;
  cliente_nombre: string;
  nombre_fantasia?: string;
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
  factura_pdf_url?: string;
  factura_timbrado?: string;
  observaciones?: string;
  ultima_actualizacion_estado?: string;
  dias_notificacion_enviada?: boolean;
  semanas_notificacion_enviada?: boolean;
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

export interface PresupuestoImagen {
  id: string;
  presupuesto_id: string;
  url: string;
  nombre_archivo: string;
  tipo_mime: string;
  tamanio: number;
  orden: number;
  descripcion?: string;
  created_at: string;
  created_by: string;
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
  numero_descuento: number;
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

export interface SalesTarget {
  id: string;
  user_id: string;
  mes: number;
  año: number;
  objetivo: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface PresupuestoSeguimiento {
  id: string;
  presupuesto_id: string;
  user_id: string;
  user?: User;
  fecha: string;
  accion: string;
  status_comentario?: string;
  proxima_accion?: string;
  fecha_proxima_accion?: string;
  created_at: string;
  updated_at: string;
}

export interface RegistroGestion {
  id: string;
  presupuesto_id: string;
  vendedor_id: string;
  comentario: string;
  estado_momento: string;
  tipo_notificacion: string;
  created_at: string;
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
      sales_targets: {
        Row: SalesTarget;
        Insert: Omit<SalesTarget, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<SalesTarget, 'id' | 'created_at'>>;
      };
    };
  };
}
