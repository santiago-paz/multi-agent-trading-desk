# InvertirOnline API (v2) Documentation

This document contains the available API endpoints for the InvertirOnline (IOL) API, extracted from the official Swagger documentation.

## Authentication

The authentication method used by this platform is digital tokens. They are Bearer tokens that must be sent in the `Authorization: Bearer <token>` header of every request.

The bearer token is valid for 15 minutes. To renew it, a refresh token is used.

## Base URL

`https://api.invertironline.com/api/v2`

## Sandbox

A sandbox environment is available for testing. It allows simulated buy/sell operations and cancellation requests. The sandbox account is completely separate from the production account.

---

## Common Enums

These enum values are reused across many endpoints:

### Mercado
`"bCBA"` | `"nYSE"` | `"nASDAQ"` | `"aMEX"` | `"bCS"` | `"rOFX"`

### Pais
`"estados_Unidos"` | `"argentina"`

### Moneda
`"peso_Argentino"` | `"dolar_Estadounidense"` | `"real"` | `"peso_Mexicano"` | `"peso_Chileno"` | `"yen"` | `"libra"` | `"euro"` | `"peso_Peruano"` | `"peso_Colombiano"` | `"peso_Uruguayo"`

### Moneda (extended, used in OperacionDetalleModel)
All of the above plus: `"dolar_BNA"` | `"dolar_Bolsa"`

### Plazo
`"t0"` | `"t1"` | `"t2"` | `"t3"`

### Plazo (response format in operations)
`"sinValor"` | `"a72horas"` | `"a24horas"` | `"inmediata"` | `"a48horas"`

### TipoOrden
`"precioLimite"` | `"precioMercado"`

### Modalidad (response)
`"precio_Limite"` | `"precio_Mercado"`

### Estado Operacion
`"iniciada"` | `"en_Proceso"` | `"parcialmente_Terminada"` | `"terminada"` | `"cancelada"` | `"pendiente_Cancelacion"` | `"cancelada_Por_Vencimiento_Validez"` | `"parcialmente_Terminada_Con_Pedido_Cancelacion"` | `"en_Modificacion"`

### Tipo Operacion
`"compra"` | `"venta"` | `"caucion"` | `"suscripcion"` | `"rescate"` | `"suscripcionPrimaria"` | `"suscripcionFCI"` | `"rescateFCI"`

### Tendencia
`"sube"` | `"baja"` | `"mantiene"`

### Tipo Titulo
`"oPCIONES"` | `"cEDEARS"` | `"titulosPublicos"` | `"aCCIONES"` | `"cUPONESPRIVADOS"` | `"fONDOSDEINVERSION"` | `"aDR"` | `"iNDICES"` | `"bOCON"` | `"bONEX"` | `"cERTIFICADOSPAR"` | `"oBLIGACIONESNEGOCIABLES"` | `"oBLIGACIONESPYME"` | `"cUPONESOBL"` | `"lETRASDEPRECADO"` | `"lETES"` | `"tITULOSDEUDA"` | `"cUPONESEXTRANJEROS"` | `"cUPONESTPI"` | `"bONOS"` | `"dIVISAS"` | `"fONDOSCOTIZANTES"` | `"cAUCIONESPESOS"` | `"cAUCIONESDOLARES"` | `"cERTIFICADOSCREDITOFISCAL"` | `"cEDRO"` | `"bODEN"` | `"fONDOSRENTAFIJA"` | `"fideicomiso"` | `"rENTAFIJA"` | `"cHEQUEPAGODIFERIDO"` | `"componenteDEEtf"` | `"componenteDEEtf_Viejo"` | `"futuros"` | `"soja"` | `"maiz"` | `"trigo"` | `"oro"` | `"petroleo"` | `"fideicomisoFinanciero"` | `"obligacionesNegociables"` | `"letraNota"` | `"fondoComundeInversion"` | `"titulosPublicosSuscribibles"` | `"accionesSuscribibles"` | `"incrementoCapital"` | `"letesSuscribibles"` | `"letras"` | `"fondosMutuosUSA"`

### Tipo Cuenta
`"inversion_Argentina_Pesos"` | `"inversion_Argentina_Dolares"` | `"inversion_Estados_Unidos_Dolares"` | `"administrada_Argentina_Pesos"` | `"administrada_Argentina_Dolares"` | `"administrada_Estados_Unidos_Dolares"`

### Estado Cuenta
`"operable"` | `"cerrada"` | `"bloqueada"`

### Liquidacion
`"inmediato"` | `"hrs24"` | `"hrs48"` | `"hrs72"` | `"otro"` | `"masHrs72"`

### Instrumento (for cotizaciones queries)
`"opciones"` | `"cedears"` | `"acciones"` | `"aDRs"` | `"titulosPublicos"` | `"cauciones"` | `"cHPD"` | `"futuros"` | `"obligacionesNegociables"` | `"letras"`

### Instrumento (for panel cotizaciones queries)
`"acciones"` | `"bonos"` | `"opciones"` | `"monedas"` | `"cauciones"` | `"cHPD"` | `"futuros"` | `"aDRs"` | `"obligacionesNegociables"` | `"letras"`

### Filtro Estado (for operations list)
`"todas"` | `"pendientes"` | `"terminadas"` | `"canceladas"`

### Ajustada (for historical series)
`"ajustada"` | `"sinAjustar"`

### Tipo Fondo FCI
`"plazo_fijo_pesos"` | `"plazo_fijo_dolares"` | `"renta_fija_pesos"` | `"renta_fija_dolares"` | `"renta_mixta_pesos"` | `"renta_mixta_dolares"` | `"renta_variable_pesos"` | `"renta_variable_dolares"`

### Tipo Administradora FCI
`"cONVEXITY"` | `"sUPERVIELLE"` | `"aLLARIA"` | `"aLLIANCE_BERNSTEIN"` | `"dRACMA"` | `"bULLMARKET"`

---

## Common Response Models

### ResponseModel
Used by most POST/DELETE operations.
```json
{
  "ok": true,              // boolean
  "messages": [            // Array[DetalleMensaje]
    {
      "title": "string",
      "description": "string"
    }
  ]
}
```

### PuntasModel
```json
{
  "cantidadCompra": 0,   // number
  "precioCompra": 0,      // number
  "precioVenta": 0,       // number
  "cantidadVenta": 0      // number
}
```

### TituloModel
```json
{
  "simbolo": "string",
  "descripcion": "string",
  "pais": "estados_Unidos",       // Pais enum
  "mercado": "bCBA",              // Mercado enum
  "tipo": "oPCIONES",             // Tipo Titulo enum
  "plazo": "t0",                  // Plazo enum
  "moneda": "peso_Argentino"      // Moneda enum
}
```

---

## Endpoints

---

## Asesores

### `POST /api/v2/Asesor/Movimientos`
Historical movements for advisor clients.

**Request Body** (`MovementBindingModel`):
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `clientes` | `Array[integer]` | No | Client IDs |
| `from` | `string` (date-time) | **Yes** | Start date |
| `to` | `string` (date-time) | **Yes** | End date |
| `dateType` | `string` | **Yes** | |
| `status` | `string` | **Yes** | |
| `type` | `string` | No | |
| `country` | `string` | **Yes** | |
| `currency` | `string` | No | |
| `cuentaComitente` | `string` | No | |

**Response (200):** `{}` (empty object)

---

### `POST /api/v2/asesores/operar/VenderEspecieD`
Sell operation with "Especie D" for advisor clients.

**Request Body** (`AsesorVenderEspecieDBindingModel`):
| Field | Type | Required | Enum/Constraints |
|-------|------|----------|------------------|
| `idClienteAsesorado` | `integer` | No | |
| `fondosParaOperacion` | `number` | No | Max: 99999999 |
| `mercado` | `string` | **Yes** | Mercado enum |
| `simbolo` | `string` | **Yes** | e.g. "ALUA" |
| `cantidad` | `number` | **Yes** | |
| `precio` | `number` | **Yes** | |
| `validez` | `string` (date-time) | **Yes** | |
| `idCuentaBancaria` | `integer` | **Yes** | |
| `tipoOrden` | `string` | No | `"precioLimite"` \| `"precioMercado"` |
| `plazo` | `string` | No | Plazo enum |
| `idFuente` | `integer` | No | |

**Response (200):** `ResponseModel`

---

## Asesores Test Inversor

### `GET /api/v2/asesores/test-inversor`
Get investor test questions.

**Response (200):** `PreguntasAsesoresTestInversorResponseModel`
```json
{
  "instrumentosInvertidosAnteriormente": {
    "instrumentos": [{ "id": 0, "nombre": "string" }],
    "pregunta": "string",
    "order": 0
  },
  "nivelesConocimientoInstrumentos": {
    "niveles": [{
      "id": 0, "nombre": "string", "opcionElegida": 0,
      "opciones": [{ "id": 0, "nombre": "string" }]
    }],
    "pregunta": "string",
    "order": 0
  },
  "plazosInversion": { "plazos": [{ "id": 0, "nombre": "string" }], "pregunta": "string", "order": 0 },
  "edadesPosibles": { "edades": [{ "id": 0, "nombre": "string" }], "pregunta": "string", "order": 0 },
  "objetivosInversion": { "objetivos": [{ "id": 0, "nombre": "string" }], "pregunta": "string", "order": 0 },
  "polizasSeguro": { "polizas": [{ "id": 0, "nombre": "string" }], "pregunta": "string", "order": 0 },
  "capacidadesAhorro": { "capacidadesAhorro": [{ "id": 0, "nombre": "string" }], "pregunta": "string", "order": 0 },
  "porcentajesPatrimonioDedicado": { "porcentajesPatrimonioDedicado": [{ "id": 0, "nombre": "string" }], "pregunta": "string", "order": 0 }
}
```

---

### `POST /api/v2/asesores/test-inversor`
Calculate investor profile without saving.

**Request Body** (`RespuestasAsesorTestInversorBindingModel`):
| Field | Type | Required |
|-------|------|----------|
| `enviarEmailCliente` | `boolean` | No |
| `instrumentosInvertidosAnteriormente` | `Array[integer]` | No |
| `nivelesConocimientoInstrumentos` | `Array[integer]` | No |
| `idPlazoElegido` | `integer` | **Yes** |
| `idEdadElegida` | `integer` | **Yes** |
| `idObjetivoInversionElegida` | `integer` | **Yes** |
| `idPolizaElegida` | `integer` | **Yes** |
| `idCapacidadAhorroElegida` | `integer` | **Yes** |
| `idPorcentajePatrimonioDedicado` | `integer` | **Yes** |

**Response (200):** `PerfilCalculadoResponseModel`
```json
{
  "perfilSugerido": {                    // read only
    "nombre": "string",
    "detalle": "string",
    "perfilComposiciones": [{ "nombre": "string", "porcentaje": 0 }]
  },
  "ok": true,
  "messages": [{ "title": "string", "description": "string" }]
}
```

---

### `POST /api/v2/asesores/test-inversor/{idClienteAsesorado}`
Calculate and save investor profile for advised client.

**Parameters:**
| Field | In | Type | Required |
|-------|-----|------|----------|
| `idClienteAsesorado` | path | `integer` | **Yes** |

**Request Body:** Same as `POST /api/v2/asesores/test-inversor`

**Response (200):** Same `PerfilCalculadoResponseModel`

---

## Mi Cuenta

### `GET /api/v2/estadocuenta`
Get account statement.

**Response (200):** `EstadoCuentaModel`
```json
{
  "cuentas": [
    {
      "numero": "string",
      "tipo": "inversion_Argentina_Pesos",    // Tipo Cuenta enum
      "moneda": "peso_Argentino",              // Moneda enum
      "disponible": 0,
      "comprometido": 0,
      "saldo": 0,
      "titulosValorizados": 0,
      "total": 0,
      "margenDescubierto": 0,
      "saldos": [
        {
          "liquidacion": "inmediato",          // Liquidacion enum
          "saldo": 0,
          "comprometido": 0,
          "disponible": 0,
          "disponibleOperar": 0
        }
      ],
      "estado": "operable"                    // Estado Cuenta enum
    }
  ],
  "estadisticas": [
    {
      "descripcion": "string",
      "cantidad": 0,        // integer
      "volumen": 0           // number
    }
  ],
  "totalEnPesos": 0
}
```

---

### `GET /api/v2/portafolio/{pais}`
Get portfolio for a given country.

**Parameters:**
| Field | In | Type | Required | Values |
|-------|-----|------|----------|--------|
| `pais` | path | `string` | **Yes** | `"estados_Unidos"` \| `"argentina"` |

**Response (200):** `PortafolioModel`
```json
{
  "pais": "estados_Unidos",
  "activos": [
    {
      "cantidad": 0,
      "comprometido": 0,
      "puntosVariacion": 0,
      "variacionDiaria": 0,
      "ultimoPrecio": 0,
      "ppc": 0,                       // precio promedio de compra
      "gananciaPorcentaje": 0,
      "gananciaDinero": 0,
      "valorizado": 0,
      "titulo": {
        "simbolo": "string",
        "descripcion": "string",
        "pais": "estados_Unidos",
        "mercado": "bCBA",
        "tipo": "oPCIONES",
        "plazo": "t0",
        "moneda": "peso_Argentino"
      },
      "parking": {
        "disponibleInmediato": 0      // integer
      }
    }
  ]
}
```

---

### `GET /api/v2/operaciones/{numero}`
Get operation details by number.

**Parameters:**
| Field | In | Type | Required |
|-------|-----|------|----------|
| `numero` | path | `integer` | **Yes** |

**Response (200):** `OperacionDetalleModel`
```json
{
  "numero": 0,
  "mercado": "bCBA",                  // Mercado enum
  "simbolo": "string",
  "moneda": "peso_Argentino",         // Moneda extended enum (includes dolar_BNA, dolar_Bolsa)
  "tipo": "compra",                   // Tipo Operacion enum
  "fechaAlta": "2026-03-23T17:29:07.408Z",
  "validez": "2026-03-23T17:29:07.408Z",
  "fechaOperado": "2026-03-23T17:29:07.408Z",
  "estadoActual": "iniciada",         // Estado Operacion enum
  "estados": [
    { "detalle": "string", "fecha": "2026-03-23T17:29:07.408Z" }
  ],
  "aranceles": [
    { "tipo": "string", "neto": 0, "iva": 0, "moneda": "string" }
  ],
  "operaciones": [
    { "fecha": "2026-03-23T17:29:07.408Z", "cantidad": 0, "precio": 0 }
  ],
  "precio": 0,
  "cantidad": 0,
  "monto": 0,
  "fondosParaOperacion": 0,
  "montoOperacion": 0,
  "modalidad": "precio_Limite",       // "precio_Limite" | "precio_Mercado"
  "arancelesARS": 0,                  // read only
  "arancelesUSD": 0,                  // read only
  "plazo": "sinValor"                 // "sinValor" | "a72horas" | "a24horas" | "inmediata" | "a48horas"
}
```

---

### `DELETE /api/v2/operaciones/{numero}`
Cancel an operation by number.

**Parameters:**
| Field | In | Type | Required |
|-------|-----|------|----------|
| `numero` | path | `integer` | **Yes** |

**Response (200):** `ResponseModel`

---

### `GET /api/v2/operaciones`
List operations with optional filters.

**Parameters:**
| Field | In | Type | Required | Description |
|-------|-----|------|----------|-------------|
| `filtro.numero` | query | `integer` | No | e.g. `0`, `11122` |
| `filtro.estado` | query | `string` | No | `"todas"` \| `"pendientes"` \| `"terminadas"` \| `"canceladas"` |
| `filtro.fechaDesde` | query | `date-time` | No | e.g. `2016-08-01` |
| `filtro.fechaHasta` | query | `date-time` | No | e.g. `2016-10-15 23:00:00` |
| `filtro.pais` | query | `string` | No | `"estados_Unidos"` \| `"argentina"` |

**Response (200):** `Array[OperacionListModel]`
```json
[
  {
    "numero": 0,                       // integer
    "fechaOrden": "2026-03-23T17:29:07.411Z",
    "tipo": "string",
    "estado": "iniciada",              // Estado Operacion enum
    "mercado": "string",
    "simbolo": "string",
    "cantidad": 0,
    "monto": 0,
    "modalidad": "precio_Limite",      // Modalidad enum
    "precio": 0,
    "fechaOperada": "2026-03-23T17:29:07.411Z",
    "cantidadOperada": 0,
    "precioOperado": 0,
    "montoOperado": 0,
    "plazo": "sinValor"                // Plazo response enum
  }
]
```

---

## Notificacion

### `GET /api/v2/Notificacion`
Get notifications.

**Response (200):** `NotificacionModel`
```json
{
  "titulo": "string",
  "mensaje": "string",
  "link": "string"
}
```

---

## Operar

### `GET /api/v2/operar/CPD/PuedeOperar`
Check if user can operate with Cheque de Pago Diferido.

**Response (200):**
```json
{ "operatoriaHabilitada": true }
```

---

### `GET /api/v2/operar/CPD/{estado}/{segmento}`
Get Cheque de Pago Diferido listings.

**Parameters:**
| Field | In | Type | Required |
|-------|-----|------|----------|
| `estado` | path | `string` | **Yes** |
| `segmento` | path | `string` | **Yes** |

**Response (200):** `CPDModel`
```json
{
  "fechaActualizacion": "string",
  "subasta": [
    {
      "subasta": "string",
      "segmento": "string",
      "inicio": "string",
      "cierre": "string",
      "fechaPago": "2026-03-23T17:29:07.416Z",
      "duracion": "string",
      "tasaCompra": "string",
      "tasaVenta": "string",
      "monto": "string",
      "cheques": "string",
      "concertacion": "string",
      "estado": "string",
      "sgr": "string",
      "librador": "string",
      "almacenadora": "string",
      "montoInvertir": "string"
    }
  ]
}
```

---

### `GET /api/v2/operar/CPD/Comisiones/{importe}/{plazo}/{tasa}`
Calculate CPD commissions.

**Parameters:**
| Field | In | Type | Required |
|-------|-----|------|----------|
| `importe` | path | `double` | **Yes** |
| `plazo` | path | `integer` | **Yes** |
| `tasa` | path | `double` | **Yes** |

**Response (200):** `ComisionCPDDTO`
```json
{
  "moneda": "string",
  "montoInversion": "string",
  "comision": "string",
  "derechoMercado": "string",
  "ivaComision": "string",
  "ivaDerechoMercado": "string",
  "montoTotalInversion": "string"
}
```

---

### `POST /api/v2/operar/CPD`
Place a CPD order.

**Request Body** (`CPDBindingModel`):
| Field | Type | Required | Enum |
|-------|------|----------|------|
| `idSubasta` | `integer` | **Yes** | |
| `tasa` | `number` | **Yes** | |
| `fuente` | `string` | **Yes** | `"compra_Venta_Por_Web"` \| `"compra_Venta_Por_Celular"` \| `"asesores_IOL"` \| `"compra_Venta_Por_Web_V6"` \| `"compra_Venta_Por_Mobile"` \| `"asesores_IOL_Mobile"` \| `"quick_Trade_Dock"` \| `"asesores_Quick_Trade_Dock"` \| `"aPI"` \| `"nUEVA_WEB"` \| (and more) |

**Response (200):**
```json
{ "idTransaccion": 0 }
```

---

### `POST /api/v2/operar/Token`
Generate a DDJJ token for trading.

**Request Body** (`RequestTokenDDJJDTO`):
| Field | Type | Required | Enum |
|-------|------|----------|------|
| `mercado` | `string` | No | Mercado enum |
| `simbolo` | `string` | No | |
| `cantidad` | `number` | No | |
| `monto` | `number` | No | |

**Response (200):** `JWTResultDTO`
```json
{
  "token": "string",
  "expiration": "2026-03-23T17:29:07.421Z"
}
```

---

### `POST /api/v2/operar/Vender`
Place a sell order.

**Request Body** (`VenderBindingModel`):
| Field | Type | Required | Enum |
|-------|------|----------|------|
| `mercado` | `string` | **Yes** | Mercado enum |
| `simbolo` | `string` | **Yes** | |
| `cantidad` | `number` | **Yes** | |
| `precio` | `number` | **Yes** | |
| `validez` | `string` (date-time) | **Yes** | |
| `tipoOrden` | `string` | No | `"precioLimite"` \| `"precioMercado"` |
| `plazo` | `string` | No | Plazo enum |
| `idFuente` | `integer` | No | |

**Response (200):** `ResponseModel`

---

### `POST /api/v2/operar/Comprar`
Place a buy order.

**Request Body** (`ComprarBindingModel`):
| Field | Type | Required | Enum |
|-------|------|----------|------|
| `mercado` | `string` | **Yes** | Mercado enum |
| `simbolo` | `string` | **Yes** | |
| `cantidad` | `number` | No | |
| `precio` | `number` | **Yes** | |
| `plazo` | `string` | **Yes** | Plazo enum |
| `validez` | `string` (date-time) | **Yes** | |
| `tipoOrden` | `string` | No | `"precioLimite"` \| `"precioMercado"` |
| `monto` | `number` | No | |
| `idFuente` | `integer` | No | |

**Response (200):** `ResponseModel`

---

### `POST /api/v2/operar/rescate/fci`
Redeem FCI (mutual fund) shares.

**Request Body** (`RescateFCIBindingModel`):
| Field | Type | Required |
|-------|------|----------|
| `simbolo` | `string` | No |
| `cantidad` | `number` | No |
| `soloValidar` | `boolean` | No |

**Response (200):** `ResponseModel`

---

### `POST /api/v2/operar/VenderEspecieD`
Sell with "Especie D" settlement (for dollar-denominated securities).

**Request Body** (`VenderDBindingModel`):
| Field | Type | Required | Enum |
|-------|------|----------|------|
| `mercado` | `string` | **Yes** | Mercado enum |
| `simbolo` | `string` | **Yes** | |
| `cantidad` | `number` | **Yes** | |
| `precio` | `number` | **Yes** | |
| `validez` | `string` (date-time) | **Yes** | |
| `idCuentaBancaria` | `integer` | **Yes** | |
| `tipoOrden` | `string` | No | `"precioLimite"` \| `"precioMercado"` |
| `plazo` | `string` | No | Plazo enum |
| `idFuente` | `integer` | No | |

**Response (200):** `ResponseModel`

---

### `POST /api/v2/operar/ComprarEspecieD`
Buy with "Especie D" settlement.

**Request Body** (`ComprarBindingModel`): Same as `POST /api/v2/operar/Comprar`.

**Response (200):** `ResponseModel`

---

### `POST /api/v2/operar/suscripcion/fci`
Subscribe to an FCI (mutual fund).

**Request Body** (`SuscripcionFCIBindingModel`):
| Field | Type | Required |
|-------|------|----------|
| `simbolo` | `string` | No |
| `monto` | `number` | No |
| `soloValidar` | `boolean` | No |

**Response (200):** `ResponseModel`

---

## Operatoria Simplificada (Simplified Operations / Dolar MEP)

### `GET /api/v2/OperatoriaSimplificada/MontosEstimados/{monto}`
Get estimated amounts for simplified operations (dolar MEP buy).

**Parameters:**
| Field | In | Type | Required |
|-------|-----|------|----------|
| `monto` | path | `double` | **Yes** |

**Response (200):** `MontosEstimadosDTO`
```json
{
  "montoDolar": 0,
  "montoBrutoPesos": 0,
  "montoNetoPesos": 0,
  "comisionCompra": 0,
  "comisionVenta": 0,
  "comisionCompraIVA": 0,
  "comisionVentaIVA": 0,
  "derechoMercadoCompra": 0,
  "derechoMercadoVenta": 0
}
```

---

### `GET /api/v2/OperatoriaSimplificada/{idTipoOperatoria}/Parametros`
Get parameters for a simplified operation type.

**Parameters:**
| Field | In | Type | Required |
|-------|-----|------|----------|
| `idTipoOperatoria` | path | `integer` | **Yes** |

**Response (200):** `ParametrosMepSimpleDTO`
```json
{
  "horarioApertura": "2026-03-23T17:29:07.433Z",
  "horarioCierre": "2026-03-23T17:29:07.433Z",
  "esHorarioValido": true,
  "idTipoOperacion": "mEP",           // "mEP" | "cCL" | "mEP_Inverso" | "cCL_USD" | "venta_D" | "cCL_Inverso"
  "idProducto": "sin_Producto",        // large enum (see below)
  "nombre": "string",
  "descripcion": "string",
  "simboloTituloCompra": "string",
  "simboloTituloVenta": "string",
  "montoLimiteMinimo": 0,
  "montoLimiteMaximo": 0,
  "monedaMontoLimite": 0,             // integer
  "tiempoExpiracionPreOrden": 0,      // integer
  "idPlazoOperatoriaCompra": 0,       // integer
  "idPlazoOperatoriaVenta": 0,        // integer
  "fechaConcertacionDolarMep": "2026-03-23T17:29:07.433Z"
}
```

**idTipoOperacion values:** `"mEP"` | `"cCL"` | `"mEP_Inverso"` | `"cCL_USD"` | `"venta_D"` | `"cCL_Inverso"`

---

### `GET /api/v2/OperatoriaSimplificada/Validar/{monto}/{idTipoOperatoria}`
Validate a simplified operation.

**Parameters:**
| Field | In | Type | Required |
|-------|-----|------|----------|
| `monto` | path | `double` | **Yes** |
| `idTipoOperatoria` | path | `integer` | **Yes** |

**Response (200):** `ResponseModel`

---

### `GET /api/v2/OperatoriaSimplificada/VentaMepSimple/MontosEstimados/{monto}`
Get estimated amounts for MEP sell (reverse).

**Parameters:**
| Field | In | Type | Required |
|-------|-----|------|----------|
| `monto` | path | `double` | **Yes** |

**Response (200):** `MontosEstimadosVentaMepDTO`
```json
{
  "montoPesos": 0,
  "montoBrutoDolar": 0,
  "montoNetoDolar": 0,
  "comisionCompra": 0,
  "comisionVenta": 0,
  "comisionCompraIVA": 0,
  "comisionVentaIVA": 0,
  "derechoMercadoCompra": 0,
  "derechoMercadoVenta": 0
}
```

---

### `POST /api/v2/Cotizaciones/MEP`
Get MEP reference rate for a symbol.

**Request Body** (`CotizacionMepOperatoriaSimplificadaModel`):
| Field | Type | Required |
|-------|------|----------|
| `simbolo` | `string` | No |
| `idPlazoOperatoriaCompra` | `integer` | No |
| `idPlazoOperatoriaVenta` | `integer` | No |

**Response (200):** `double` (the MEP rate)

---

### `POST /api/v2/OperatoriaSimplificada/Comprar`
Execute a simplified buy operation (e.g. buy dolar MEP).

**Request Body** (`CompraOperatoriaSimplificadModel`):
| Field | Type | Required |
|-------|------|----------|
| `monto` | `number` | No |
| `idTipoOperatoriaSimplificada` | `integer` | No |
| `idCuentaBancaria` | `integer` | No |

**Response (200):** `ResponseModel`

---

## Perfil

### `GET /api/v2/datos-perfil`
Get user profile data.

**Response (200):** `PerfilClienteModel`
```json
{
  "nombre": "string",
  "apellido": "string",
  "numeroCuenta": "string",
  "dni": "string",
  "cuitCuil": "string",
  "sexo": "string",
  "perfilInversor": "string",
  "actualizarDDJJ": true,
  "actualizarTestInversor": true,
  "esBajaArrepentimiento": true,
  "email": "string",
  "cuentaAbierta": true,
  "actualizarTyC": true,
  "actualizarTyCApp": true
}
```

---

## Titulos

### `GET /api/v2/Titulos/FCI`
List all FCI (mutual fund) titles.

**Response (200):** `Array[TituloFCIModel]`
```json
[
  {
    "variacion": 0,
    "ultimoOperado": 0,
    "horizonteInversion": "string",
    "rescate": "t0",                              // Plazo enum
    "invierte": "string",
    "tipoFondo": "plazo_fijo_pesos",              // Tipo Fondo FCI enum
    "avisoHorarioEjecucion": "string",
    "tipoAdministradoraTituloFCI": "cONVEXITY",   // Tipo Administradora enum
    "fechaCorte": "2026-03-23T17:29:07.441Z",
    "codigoBloomberg": "string",
    "perfilInversor": "string",
    "informeMensual": "string",
    "reglamentoGestion": "string",
    "variacionMensual": 0,
    "variacionAnual": 0,
    "montoMinimo": 0,
    "simbolo": "string",
    "descripcion": "string",
    "pais": "estados_Unidos",
    "mercado": "bCBA",
    "tipo": "oPCIONES",
    "plazo": "t0",
    "moneda": "peso_Argentino"
  }
]
```

---

### `GET /api/v2/Titulos/FCI/{simbolo}`
Get details for a specific FCI title.

**Parameters:**
| Field | In | Type | Required |
|-------|-----|------|----------|
| `simbolo` | path | `string` | **Yes** |

**Response (200):** `TituloFCIModel` (same structure as above, single object)

---

### `GET /api/v2/Titulos/FCI/TipoFondos`
List available FCI fund types.

**Response (200):**
```json
[{ "identificador": "plazo_fijo_pesos", "nombre": "string" }]
```

---

### `GET /api/v2/Cotizaciones/MEP/{simbolo}`
Get MEP reference rate for a symbol.

**Parameters:**
| Field | In | Type | Required |
|-------|-----|------|----------|
| `simbolo` | path | `string` | **Yes** |

**Response (200):** `double`

---

### `GET /api/v2/Titulos/FCI/Administradoras`
List FCI administrators.

**Response (200):**
```json
[{ "identificador": "plazo_fijo_pesos", "nombre": "string" }]
```

---

### `GET /api/v2/{mercado}/Titulos/{simbolo}`
Get title details.

**Parameters:**
| Field | In | Type | Required | Values |
|-------|-----|------|----------|--------|
| `mercado` | path | `string` | **Yes** | Mercado enum |
| `simbolo` | path | `string` | **Yes** | |

**Response (200):** `TituloModel`

---

### `GET /api/v2/{mercado}/Titulos/{simbolo}/Opciones`
Get options for a title.

**Parameters:**
| Field | In | Type | Required | Values |
|-------|-----|------|----------|--------|
| `mercado` | path | `string` | **Yes** | Mercado enum |
| `simbolo` | path | `string` | **Yes** | |

**Response (200):** `Array[OpcionTituloModel]`
```json
[
  {
    "simboloSubyacente": "string",
    "fechaVencimiento": "2026-03-23T17:29:07.449Z",
    "tipoOpcion": "string",
    "simbolo": "string",
    "descripcion": "string",
    "pais": "estados_Unidos",
    "mercado": "bCBA",
    "tipo": "oPCIONES",
    "plazo": "t0",
    "moneda": "peso_Argentino"
  }
]
```

---

### `GET /api/v2/{pais}/Titulos/Cotizacion/Instrumentos`
List available instruments for a country.

**Parameters:**
| Field | In | Type | Required | Values |
|-------|-----|------|----------|--------|
| `pais` | path | `string` | **Yes** | Pais enum |

**Response (200):**
```json
[{ "instrumento": "string", "pais": "estados_Unidos" }]
```

---

### `GET /api/v2/Cotizaciones/{Instrumento}/{Pais}/Todos`
Get all quotes for an instrument in a country.

**Parameters:**
| Field | In | Type | Required | Values |
|-------|-----|------|----------|--------|
| `Instrumento` | path | `string` | **Yes** | |
| `Pais` | path | `string` | **Yes** | |
| `cotizacionInstrumentoModel.instrumento` | query | `string` | No | Instrumento enum |
| `cotizacionInstrumentoModel.pais` | query | `string` | No | Pais enum |

**Response (200):** `InstrumentoModel`
```json
{
  "titulos": [
    {
      "simbolo": "string",
      "puntas": {
        "cantidadCompra": 0,
        "precioCompra": 0,
        "precioVenta": 0,
        "cantidadVenta": 0
      },
      "ultimoPrecio": 0,
      "variacionPorcentual": 0,
      "apertura": 0,
      "maximo": 0,
      "minimo": 0,
      "ultimoCierre": 0,
      "volumen": 0,
      "cantidadOperaciones": 0,
      "fecha": "2026-03-23T17:29:07.452Z",
      "tipoOpcion": "string",
      "precioEjercicio": 0,
      "fechaVencimiento": "string",
      "mercado": "string",
      "moneda": "string",
      "descripcion": "string",
      "plazo": "string",
      "laminaMinima": 0,       // integer
      "lote": 0                 // integer
    }
  ]
}
```

---

### `GET /api/v2/Cotizaciones/{Instrumento}/{Panel}/{Pais}`
Get quotes for an instrument panel.

**Parameters:**
| Field | In | Type | Required | Values |
|-------|-----|------|----------|--------|
| `Instrumento` | path | `string` | **Yes** | |
| `Panel` | path | `string` | **Yes** | |
| `Pais` | path | `string` | **Yes** | |
| `panelCotizacion.instrumento` | query | `string` | No | Panel Instrumento enum |
| `panelCotizacion.panel` | query | `string` | No | |
| `panelCotizacion.pais` | query | `string` | No | Pais enum |

**Response (200):** `PanelModel`
```json
{
  "titulos": [
    {
      "simbolo": "string",
      "descripcion": "string",
      "puntas": { "cantidadCompra": 0, "precioCompra": 0, "precioVenta": 0, "cantidadVenta": 0 },
      "ultimoPrecio": 0,
      "variacionPorcentual": 0,
      "apertura": 0,
      "maximo": 0,
      "minimo": 0,
      "ultimoCierre": 0,
      "volumen": 0,
      "cantidadOperaciones": 0,
      "fecha": "2026-03-23T17:29:07.454Z",
      "tipoOpcion": "string",
      "precioEjercicio": 0,
      "fechaVencimiento": "string",
      "mercado": "string",
      "moneda": "string"
    }
  ]
}
```

---

### `GET /api/v2/{mercado}/Titulos/{simbolo}/CotizacionDetalle`
Get detailed quote for a specific title.

**Parameters:**
| Field | In | Type | Required | Values |
|-------|-----|------|----------|--------|
| `mercado` | path | `string` | **Yes** | Mercado enum |
| `simbolo` | path | `string` | **Yes** | |

**Response (200):** `CotizacionDetalleModel`
```json
{
  "ultimoPrecio": 0,
  "variacion": 0,
  "apertura": 0,
  "maximo": 0,
  "minimo": 0,
  "fechaHora": "2026-03-23T17:29:07.457Z",
  "tendencia": "sube",                // Tendencia enum
  "cierreAnterior": 0,
  "montoOperado": 0,
  "volumenNominal": 0,                // integer
  "precioPromedio": 0,
  "moneda": "peso_Argentino",         // Moneda enum
  "precioAjuste": 0,
  "interesesAbiertos": 0,
  "puntas": [
    { "cantidadCompra": 0, "precioCompra": 0, "precioVenta": 0, "cantidadVenta": 0 }
  ],
  "cantidadOperaciones": 0,           // integer
  "simbolo": "string",
  "pais": "estados_Unidos",           // Pais enum
  "mercado": "bCBA",                  // Mercado enum
  "tipo": "oPCIONES",                 // Tipo Titulo enum
  "descripcionTitulo": "string",
  "plazo": "t0",                      // Plazo enum
  "laminaMinima": 0,                  // integer
  "lote": 0,                          // integer
  "cantidadMinima": 0,                // integer
  "puntosVariacion": 0
}
```

---

### `GET /api/v2/cotizaciones-orleans/{Instrumento}/{Pais}/Todos`
Get all quotes via Orleans (alternative/faster data source).

**Parameters:** Same as `GET /api/v2/Cotizaciones/{Instrumento}/{Pais}/Todos`

**Response (200):** `InstrumentoModel` (same structure)

---

### `GET /api/v2/{pais}/Titulos/Cotizacion/Paneles/{instrumento}`
List available panels for an instrument in a country.

**Parameters:**
| Field | In | Type | Required | Values |
|-------|-----|------|----------|--------|
| `pais` | path | `string` | **Yes** | Pais enum |
| `instrumento` | path | `string` | **Yes** | |

**Response (200):**
```json
[{ "instrumento": "string", "pais": "estados_Unidos" }]
```

---

### `GET /api/v2/cotizaciones-orleans/{Instrumento}/{Pais}/Operables`
Get tradeable quotes via Orleans.

**Parameters:** Same as Orleans Todos variant.

**Response (200):** `InstrumentoModel`

---

### `GET /api/v2/{Mercado}/Titulos/{Simbolo}/Cotizacion`
Get quote for a specific title with plazo support.

**Parameters:**
| Field | In | Type | Required | Description |
|-------|-----|------|----------|-------------|
| `mercado` | query | `string` | **Yes** | |
| `simbolo` | query | `string` | **Yes** | |
| `model.simbolo` | query | `string` | **Yes** | e.g. `ALUA`, `APBR` |
| `model.mercado` | query | `string` | **Yes** | Mercado enum. e.g. `Rofx`, `BCBA` |
| `model.plazo` | query | `string` | No | Plazo enum. T0=Inmediato, T+1=24h, T+2=72h |

**Response (200):** `CotizacionModel`
```json
{
  "ultimoPrecio": 0,
  "variacion": 0,
  "apertura": 0,
  "maximo": 0,
  "minimo": 0,
  "fechaHora": "2026-03-23T17:29:07.465Z",
  "tendencia": "sube",                // Tendencia enum
  "cierreAnterior": 0,
  "montoOperado": 0,
  "volumenNominal": 0,
  "precioPromedio": 0,
  "moneda": "peso_Argentino",
  "precioAjuste": 0,                  // loaded for futures
  "interesesAbiertos": 0,             // loaded for futures
  "puntas": [                          // all available bid/ask levels
    { "cantidadCompra": 0, "precioCompra": 0, "precioVenta": 0, "cantidadVenta": 0 }
  ],
  "cantidadOperaciones": 0,
  "descripcionTitulo": "string",
  "plazo": "string",
  "laminaMinima": 0,
  "lote": 0
}
```

---

### `GET /api/v2/cotizaciones-orleans-panel/{Instrumento}/{Pais}/Todos`
Get all quotes via Orleans Panel.

**Parameters:** Same as other Orleans variants.

**Response (200):** `InstrumentoModel`

---

### `GET /api/v2/Titulos/FCI/Administradoras/{administradora}/TipoFondos`
Get fund types for a specific FCI administrator.

**Parameters:**
| Field | In | Type | Required |
|-------|-----|------|----------|
| `administradora` | path | `string` | **Yes** |

**Response (200):**
```json
[
  {
    "administradora": "string",
    "identificadorTipoFondoFCI": "plazo_fijo_pesos",   // Tipo Fondo FCI enum
    "nombreTipoFondoFCI": "string"
  }
]
```

---

### `GET /api/v2/cotizaciones-orleans-panel/{Instrumento}/{Pais}/Operables`
Get tradeable quotes via Orleans Panel.

**Parameters:** Same as other Orleans variants.

**Response (200):** `InstrumentoModel`

---

### `GET /api/v2/{mercado}/Titulos/{simbolo}/CotizacionDetalleMobile/{plazo}`
Get detailed quote (mobile version, includes operability flags).

**Parameters:**
| Field | In | Type | Required | Values |
|-------|-----|------|----------|--------|
| `mercado` | path | `string` | **Yes** | Mercado enum |
| `simbolo` | path | `string` | **Yes** | |
| `plazo` | path | `string` | **Yes** | Plazo enum |

**Response (200):** `CotizacionDetalleMobileModel`
Same as `CotizacionDetalleModel` plus:
```json
{
  "operableCompra": true,    // boolean - can buy
  "operableVenta": true,     // boolean - can sell
  "visible": true,           // boolean
  // ... rest same as CotizacionDetalleModel
}
```

---

### `GET /api/v2/Titulos/FCI/Administradoras/{administradora}/TipoFondos/{tipoFondo}`
Get FCI titles filtered by administrator and fund type.

**Parameters:**
| Field | In | Type | Required | Values |
|-------|-----|------|----------|--------|
| `administradora` | path | `string` | **Yes** | `"cONVEXITY"` \| `"sUPERVIELLE"` |
| `tipoFondo` | path | `string` | **Yes** | Tipo Fondo FCI enum |

**Response (200):** `Array[TituloFCIModel]`

---

### `GET /api/v2/{mercado}/Titulos/{simbolo}/Cotizacion/seriehistorica/{fechaDesde}/{fechaHasta}/{ajustada}`
Get historical price series for a title.

**Parameters:**
| Field | In | Type | Required | Values |
|-------|-----|------|----------|--------|
| `mercado` | path | `string` | **Yes** | Mercado enum |
| `simbolo` | path | `string` | **Yes** | |
| `fechaDesde` | path | `date-time` | **Yes** | |
| `fechaHasta` | path | `date-time` | **Yes** | |
| `ajustada` | path | `string` | **Yes** | `"ajustada"` \| `"sinAjustar"` |

**Response (200):** `Array[CotizacionModel]` (array of historical quotes with same structure as the Cotizacion endpoint)
