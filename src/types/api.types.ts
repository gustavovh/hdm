import {
  DiscountType,
  DiscountScope,
  DiscountRequestStatus,
  BudgetStatus,
  CurrencyType,
} from './database.types';

export interface CreateDiscountRequestDTO {
  presupuesto_id: string;
  tipo: DiscountType;
  valor_propuesto: number;
  motivo: string;
  aplica_a: DiscountScope;
  item_id?: string;
}

export interface ApproveDiscountRequestDTO {
  solicitud_id: string;
  comentario_admin?: string;
}

export interface ApproveWithModificationDTO {
  solicitud_id: string;
  valor_aprobado: number;
  comentario_admin?: string;
}

export interface RejectDiscountRequestDTO {
  solicitud_id: string;
  comentario_admin: string;
}

export interface CancelDiscountRequestDTO {
  solicitud_id: string;
}

export interface BudgetCalculationResult {
  total_bruto: number;
  total_descuento: number;
  total_neto: number;
  total_impuestos: number;
  total_comisiones: number;
}

export interface DiscountCalculationInput {
  presupuesto_id: string;
  tipo: DiscountType;
  valor: number;
  aplica_a: DiscountScope;
  item_id?: string;
}

export interface CreatePresupuestoDTO {
  codigo: string;
  cliente_nombre: string;
  cliente_email?: string;
  cliente_telefono?: string;
  cliente_documento?: string;
  moneda: CurrencyType;
  tipo_cambio?: number;
  tasa_impuesto?: number;
  tasa_comision?: number;
  observaciones?: string;
  items: CreatePresupuestoItemDTO[];
}

export interface CreatePresupuestoItemDTO {
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
}

export interface UpdatePresupuestoDTO {
  codigo?: string;
  cliente_nombre?: string;
  cliente_email?: string;
  cliente_telefono?: string;
  cliente_documento?: string;
  moneda?: CurrencyType;
  tipo_cambio?: number;
  tasa_impuesto?: number;
  tasa_comision?: number;
  estado?: BudgetStatus;
  observaciones?: string;
  total_bruto?: number;
  total_descuento?: number;
  total_neto?: number;
  total_impuestos?: number;
  total_comisiones?: number;
}

export interface FilterOptions {
  estado?: DiscountRequestStatus | DiscountRequestStatus[];
  vendedor_id?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  search?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  order_by?: string;
  order_direction?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface NotificationPayload {
  tipo: string;
  titulo: string;
  mensaje: string;
  entidad?: string;
  entidad_id?: string;
  usuario_ids: string[];
}

export interface AuditPayload {
  accion: string;
  entidad: string;
  entidad_id: string;
  usuario_id?: string;
  cambios?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  ip_address?: string;
  user_agent?: string;
}

export interface SystemConfig {
  discount_reminder_hours: number;
  default_tax_rate: number;
  default_commission_rate: number;
  max_discount_percentage: number;
  exchange_rate_pyg_usd: number;
}
