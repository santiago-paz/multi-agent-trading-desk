export interface IOLToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  issued: string;
  expires: string;
}

export interface PortfolioAsset {
  simbolo: string;
  descripcion: string;
  cantidad: number;
  ultimoPrecio: number;
  valorizado: number;
  moneda: string;
}

export interface PortfolioResponse {
  pais: string;
  activos: PortfolioAsset[];
}

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

export interface OrderResponse {
  numeroOperacion: number;
  mensaje: string;
}

export interface OrderRequest {
  simbolo: string;
  cantidad: number;
  precio?: number;
  plazo: 't0' | 't1' | 't2'; // t0 = CI, t1 = 24hs, t2 = 48hs
  tipo: 'limit' | 'market';
  validez?: string;
  side: 'buy' | 'sell'; // added for internal logic
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
}

export interface DatosPerfil {
  numeroCuenta: string;
  email: string;
  nombre: string;
  apellido: string;
  tipoInversor: string;
  perfilInversor: string;
}

export interface EstadoCuentaItem {
  fecha: string;
  tipoOperacion: string;
  descripcion: string;
  monto: number;
  saldo: number;
}

export interface EstadoCuenta {
  moneda: string;
  cuentas: {
    numero: string;
    tipo: string;
    moneda: string;
    saldoDisponible: number;
    saldoAliquidar: number;
  }[];
  movimientos: EstadoCuentaItem[];
}
