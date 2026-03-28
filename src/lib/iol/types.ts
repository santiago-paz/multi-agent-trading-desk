export interface IOLToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  '.issued': string;
  '.expires': string;
  '.refreshexpires'?: string;
}

export interface PortfolioTitulo {
  simbolo: string;
  descripcion: string;
  pais: string;
  mercado: string;
  tipo: string;
  plazo: string;
  moneda: string;
}

export interface PortfolioAsset {
  cantidad: number;
  comprometido: number;
  puntosVariacion: number;
  variacionDiaria: number;
  ultimoPrecio: number;
  ppc: number;
  gananciaPorcentaje: number;
  gananciaDinero: number;
  valorizado: number;
  titulo: PortfolioTitulo;
  parking: number | null;
}

export interface PortfolioResponse {
  pais: string;
  activos: PortfolioAsset[];
}

export interface Puntas {
  cantidadCompra: number;
  precioCompra: number;
  precioVenta: number;
  cantidadVenta: number;
}

export interface CotizacionResponse {
  ultimoPrecio: number;
  variacion: number;
  apertura: number;
  maximo: number;
  minimo: number;
  fechaHora: string;
  tendencia: string;
  cierreAnterior: number;
  montoOperado: number;
  volumenNominal: number;
  precioPromedio: number;
  moneda: string;
  precioAjuste: number;
  interesesAbiertos: number;
  puntas: Puntas[];
  cantidadOperaciones: number;
  descripcionTitulo: string;
  plazo: string;
  laminaMinima: number;
  lote: number;
}

/** @deprecated Use CotizacionResponse for individual quote endpoint. Kept for mock/simulation compatibility. */
export interface Quote {
  simbolo: string;
  ultimoPrecio: number;
  variacionPorcentual: number;
  apertura: number;
  maximo: number;
  minimo: number;
  cierreAnterior: number;
  volumen: number;
  cantidadOperaciones: number;
  fecha: string;
  mercado: string;
  moneda: string;
}

export interface PanelQuote {
  simbolo: string;
  puntas?: Puntas;
  ultimoPrecio: number;
  variacionPorcentual: number;
  apertura: number;
  maximo: number;
  minimo: number;
  ultimoCierre: number;
  volumen: number;
  cantidadOperaciones: number;
  fecha: string;
  tipoOpcion: string | null;
  precioEjercicio: number | null;
  fechaVencimiento: string | null;
  mercado: string;
  moneda: string;
  descripcion: string;
  plazo: string;
  laminaMinima?: number;
  lote?: number;
}

export interface PanelResponse {
  titulos: PanelQuote[];
}

export interface OrderResponse {
  ok: boolean;
  messages: { title: string; description: string }[];
}

export interface OrderRequest {
  mercado: string;
  simbolo: string;
  cantidad: number;
  precio: number;
  plazo: 't0' | 't1' | 't2'; // t0 = CI, t1 = 24hs, t2 = 48hs
  validez: string; // ISO date-time
  tipoOrden?: 'precioLimite' | 'precioMercado';
  monto?: number;
  side: 'buy' | 'sell'; // internal — stripped before sending to API
}

export interface Operation {
  numero: number;
  fechaOrden: string;
  tipo: string;
  estado: string;
  mercado: string;
  simbolo: string;
  cantidad: number;
  monto: number;
  modalidad: string;
  precio: number;
  fechaOperada?: string | null;
  cantidadOperada?: number | null;
  precioOperado?: number | null;
  montoOperado?: number | null;
  plazo?: string;
}

export interface OperationDetail {
  numero: number;
  mercado: string;
  simbolo: string;
  moneda: string;
  tipo: string;
  fechaAlta: string;
  validez: string;
  fechaOperado: string;
  estadoActual: string;
  estados: { detalle: string; fecha: string }[];
  aranceles: { tipo: string; neto: number; iva: number; moneda: string }[];
  operaciones: { fecha: string; cantidad: number; precio: number }[];
  precio: number;
  cantidad: number;
  monto: number;
  fondosParaOperacion: number;
  montoOperacion: number;
  modalidad: string;
  arancelesARS: number;
  arancelesUSD: number;
  plazo: string;
}

export interface DatosPerfil {
  nombre: string;
  apellido: string;
  numeroCuenta: string;
  dni?: string;
  cuitCuil?: string;
  sexo?: string;
  perfilInversor: string;
  actualizarDDJJ?: boolean;
  actualizarTestInversor?: boolean;
  esBajaArrepentimiento?: boolean;
  email: string;
  cuentaAbierta?: boolean;
  actualizarTyC?: boolean;
  actualizarTyCApp?: boolean;
}

export interface SaldoLiquidacion {
  liquidacion: string; // "inmediato", "hrs24", "hrs48", "hrs72", "masHrs72"
  saldo: number;
  comprometido: number;
  disponible: number;
  disponibleOperar: number;
}

export interface EstadoCuentaCuenta {
  numero: string;
  tipo: string;
  moneda: string;
  disponible: number;
  comprometido: number;
  saldo: number;
  titulosValorizados: number;
  total: number;
  margenDescubierto: number;
  saldos: SaldoLiquidacion[];
  estado: string;
}

export interface EstadoCuentaEstadistica {
  descripcion: string;
  cantidad: number;
  volumen: number;
}

export interface EstadoCuenta {
  cuentas: EstadoCuentaCuenta[];
  estadisticas: EstadoCuentaEstadistica[];
  totalEnPesos: number;
}
