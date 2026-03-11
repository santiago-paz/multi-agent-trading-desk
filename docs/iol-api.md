# InvertirOnline API (v2) Documentation

This document contains the available API endpoints for the InvertirOnline (IOL) API.

## Authentication

The authentication method used by this platform is digital tokens. They are Bearer tokens that must be sent in the `Authorization: Bearer <token>` header of every request.

The bearer token is valid for 15 minutes. To renew it, a refresh token is used.


## Base URL

`https://api.invertironline.com/api/v2`


## Endpoints

### `POST /api/v2/Asesor/Movimientos`
**Parameters:**
- `requestModel` (body, Required): 


---

### `POST /api/v2/asesores/operar/VenderEspecieD`
**Parameters:**
- `vm` (body, Required): 


---

### `GET /api/v2/asesores/test-inversor`

---

### `POST /api/v2/asesores/test-inversor`
**Parameters:**
- `respuestaInversor` (body, Required): 


---

### `POST /api/v2/asesores/test-inversor/{idClienteAsesorado}`
**Parameters:**
- `idClienteAsesorado` (path, Required): 
- `respuestaInversor` (body, Required): 


---

### `GET /api/v2/estadocuenta`

---

### `GET /api/v2/portafolio/{pais}`
**Parameters:**
- `pais` (path, Required): 


---

### `GET /api/v2/operaciones/{numero}`
**Parameters:**
- `numero` (path, Required): 


---

### `DELETE /api/v2/operaciones/{numero}`
**Parameters:**
- `numero` (path, Required): 


---

### `GET /api/v2/operaciones`
**Parameters:**
- `filtro.numero` (query, Optional): Ejemplo: 
0,
11122
- `filtro.estado` (query, Optional): Estados para filtrar, desagregados en el resultado final
Ejemplo:
Todas,
Pendientes,
Terminadas,
Canceladas
- `filtro.fechaDesde` (query, Optional): Ejemplo:
2016-08-01 ,
2016-01-23
- `filtro.fechaHasta` (query, Optional): Ejemplo 2016-10-15 23:00:00 ,
2016-05-01
- `filtro.pais` (query, Optional): 


---

### `GET /api/v2/Notificacion`

---

### `GET /api/v2/operar/CPD/PuedeOperar`

---

### `GET /api/v2/operar/CPD/{estado}/{segmento}`
**Parameters:**
- `estado` (path, Required): 
- `segmento` (path, Required): 


---

### `GET /api/v2/operar/CPD/Comisiones/{importe}/{plazo}/{tasa}`
**Parameters:**
- `importe` (path, Required): 
- `plazo` (path, Required): 
- `tasa` (path, Required): 


---

### `POST /api/v2/operar/CPD`
**Parameters:**
- `model` (body, Required): 


---

### `POST /api/v2/operar/Token`
**Parameters:**
- `requestTokenDDJJ` (body, Required): 


---

### `POST /api/v2/operar/Vender`
**Parameters:**
- `vm` (body, Required): 


---

### `POST /api/v2/operar/Comprar`
**Parameters:**
- `vm` (body, Required): 


---

### `POST /api/v2/operar/rescate/fci`
**Parameters:**
- `vm` (body, Required): 


---

### `POST /api/v2/operar/VenderEspecieD`
**Parameters:**
- `vm` (body, Required): 


---

### `POST /api/v2/operar/ComprarEspecieD`
**Parameters:**
- `vm` (body, Required): 


---

### `POST /api/v2/operar/suscripcion/fci`
**Parameters:**
- `vm` (body, Required): 


---

### `GET /api/v2/OperatoriaSimplificada/MontosEstimados/{monto}`
**Parameters:**
- `monto` (path, Required): 


---

### `GET /api/v2/OperatoriaSimplificada/{idTipoOperatoria}/Parametros`
**Parameters:**
- `idTipoOperatoria` (path, Required): 


---

### `GET /api/v2/OperatoriaSimplificada/Validar/{monto}/{idTipoOperatoria}`
**Parameters:**
- `monto` (path, Required): 
- `idTipoOperatoria` (path, Required): 


---

### `GET /api/v2/OperatoriaSimplificada/VentaMepSimple/MontosEstimados/{monto}`
**Parameters:**
- `monto` (path, Required): 


---

### `POST /api/v2/Cotizaciones/MEP`
**Parameters:**
- `cotizacionModel` (body, Required): 


---

### `POST /api/v2/OperatoriaSimplificada/Comprar`
**Parameters:**
- `model` (body, Required): 


---

### `GET /api/v2/datos-perfil`

---

### `GET /api/v2/Titulos/FCI`

---

### `GET /api/v2/Titulos/FCI/{simbolo}`
**Parameters:**
- `simbolo` (path, Required): 


---

### `GET /api/v2/Titulos/FCI/TipoFondos`

---

### `GET /api/v2/Cotizaciones/MEP/{simbolo}`
**Parameters:**
- `simbolo` (path, Required): 


---

### `GET /api/v2/Titulos/FCI/Administradoras`

---

### `GET /api/v2/{mercado}/Titulos/{simbolo}`
**Parameters:**
- `mercado` (path, Required): 
- `simbolo` (path, Required): 


---

### `GET /api/v2/{mercado}/Titulos/{simbolo}/Opciones`
**Parameters:**
- `mercado` (path, Required): 
- `simbolo` (path, Required): 


---

### `GET /api/v2/{pais}/Titulos/Cotizacion/Instrumentos`
**Parameters:**
- `pais` (path, Required): 


---

### `GET /api/v2/Cotizaciones/{Instrumento}/{Pais}/Todos`
**Parameters:**
- `Instrumento` (path, Required): 
- `Pais` (path, Required): 
- `cotizacionInstrumentoModel.instrumento` (query, Optional): 
- `cotizacionInstrumentoModel.pais` (query, Optional): 


---

### `GET /api/v2/Cotizaciones/{Instrumento}/{Panel}/{Pais}`
**Parameters:**
- `Instrumento` (path, Required): 
- `Panel` (path, Required): 
- `Pais` (path, Required): 
- `panelCotizacion.instrumento` (query, Optional): 
- `panelCotizacion.panel` (query, Optional): 
- `panelCotizacion.pais` (query, Optional): 


---

### `GET /api/v2/{mercado}/Titulos/{simbolo}/CotizacionDetalle`
**Parameters:**
- `mercado` (path, Required): 
- `simbolo` (path, Required): 


---

### `GET /api/v2/cotizaciones-orleans/{Instrumento}/{Pais}/Todos`
**Parameters:**
- `Instrumento` (path, Required): 
- `Pais` (path, Required): 
- `cotizacionInstrumentoModel.instrumento` (query, Optional): 
- `cotizacionInstrumentoModel.pais` (query, Optional): 


---

### `GET /api/v2/{pais}/Titulos/Cotizacion/Paneles/{instrumento}`
**Parameters:**
- `pais` (path, Required): 
- `instrumento` (path, Required): 


---

### `GET /api/v2/cotizaciones-orleans/{Instrumento}/{Pais}/Operables`
**Parameters:**
- `Instrumento` (path, Required): 
- `Pais` (path, Required): 
- `cotizacionInstrumentoModel.instrumento` (query, Optional): 
- `cotizacionInstrumentoModel.pais` (query, Optional): 


---

### `GET /api/v2/{Mercado}/Titulos/{Simbolo}/Cotizacion`
**Parameters:**
- `mercado` (query, Required): 
- `simbolo` (query, Required): 
- `model.simbolo` (query, Required): Ejemplo: ALUA, APBR
- `model.mercado` (query, Required): Ejemplo:
Rofx,
BCBA
- `model.plazo` (query, Optional): T0 = Inmediato
T+1 = 24 Horas
T+2 = 72 Horas


---

### `GET /api/v2/cotizaciones-orleans-panel/{Instrumento}/{Pais}/Todos`
**Parameters:**
- `Instrumento` (path, Required): 
- `Pais` (path, Required): 
- `cotizacionInstrumentoModel.instrumento` (query, Optional): 
- `cotizacionInstrumentoModel.pais` (query, Optional): 


---

### `GET /api/v2/Titulos/FCI/Administradoras/{administradora}/TipoFondos`
**Parameters:**
- `administradora` (path, Required): 


---

### `GET /api/v2/cotizaciones-orleans-panel/{Instrumento}/{Pais}/Operables`
**Parameters:**
- `Instrumento` (path, Required): 
- `Pais` (path, Required): 
- `cotizacionInstrumentoModel.instrumento` (query, Optional): 
- `cotizacionInstrumentoModel.pais` (query, Optional): 


---

### `GET /api/v2/{mercado}/Titulos/{simbolo}/CotizacionDetalleMobile/{plazo}`
**Parameters:**
- `mercado` (path, Required): 
- `simbolo` (path, Required): 
- `plazo` (path, Required): 


---

### `GET /api/v2/Titulos/FCI/Administradoras/{administradora}/TipoFondos/{tipoFondo}`
**Parameters:**
- `administradora` (path, Required): 
- `tipoFondo` (path, Required): 


---

### `GET /api/v2/{mercado}/Titulos/{simbolo}/Cotizacion/seriehistorica/{fechaDesde}/{fechaHasta}/{ajustada}`
**Parameters:**
- `mercado` (path, Required): 
- `simbolo` (path, Required): 
- `fechaDesde` (path, Required): 
- `fechaHasta` (path, Required): 
- `ajustada` (path, Required): 


---
