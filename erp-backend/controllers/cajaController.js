const CajaService = require('../services/cajaService');
const { generarReporteCierre } = require('../utils/reporteCierrePdf');

// Errores de negocio que son conflictos de estado (la acción es válida pero no se puede ahora).
const CODIGOS_CONFLICTO = [
  'USUARIO_CON_CAJA_ABIERTA', 'SUCURSAL_SIN_CAJAS_LIBRES', 'CAJA_OCUPADA',
  'SIN_CAJA_ABIERTA', 'SALDO_INSUFICIENTE', 'YA_COMPENSADO', 'CONTRA_ASIENTO_INVALIDO',
  'VENTAS_PENDIENTES',
];

// GET /api/cajas?depositoId=...
const listarCajas = async (req, res) => {
  try {
    const data = await CajaService.listarCajasPorDeposito(req.query.depositoId);
    return res.status(200).json({ data });
  } catch (error) {
    console.error('[API] Error GET /api/cajas:', error);
    return res.status(400).json({ error: error.message });
  }
};

// GET /api/cajas/sesion-activa?usuarioId=...
const obtenerSesionActiva = async (req, res) => {
  try {
    const data = await CajaService.obtenerSesionActiva(req.query.usuarioId);
    return res.status(200).json({ data }); // data = null si la caja está cerrada
  } catch (error) {
    console.error('[API] Error GET /api/cajas/sesion-activa:', error);
    return res.status(400).json({ error: error.message });
  }
};

// POST /api/cajas/abrir  { cajaId, usuarioId, montoInicial }
const abrirCaja = async (req, res) => {
  try {
    const data = await CajaService.abrirCaja(req.body || {});
    return res.status(201).json({ success: true, data });
  } catch (error) {
    const status = CODIGOS_CONFLICTO.includes(error.codigo) ? 409 : 400;
    if (status === 400 && !error.codigo) console.error('[API] Error POST /api/cajas/abrir:', error);
    return res.status(status).json({ error: error.message, codigo: error.codigo || null });
  }
};

// ── HU-27 ──────────────────────────────────────────────────────────────────
// GET /api/cajas/resumen?usuarioId=...
const obtenerResumen = async (req, res) => {
  try {
    const data = await CajaService.obtenerResumen(req.query.usuarioId);
    return res.status(200).json({ data });
  } catch (error) {
    console.error('[API] Error GET /api/cajas/resumen:', error);
    return res.status(400).json({ error: error.message });
  }
};

// GET /api/cajas/conceptos
const listarConceptos = async (req, res) => {
  try {
    const data = await CajaService.listarConceptos();
    return res.status(200).json({ data });
  } catch (error) {
    console.error('[API] Error GET /api/cajas/conceptos:', error);
    return res.status(500).json({ error: error.message });
  }
};

// GET /api/cajas/movimientos?usuarioId=...
const listarMovimientos = async (req, res) => {
  try {
    const data = await CajaService.listarMovimientos(req.query.usuarioId);
    return res.status(200).json({ data });
  } catch (error) {
    console.error('[API] Error GET /api/cajas/movimientos:', error);
    return res.status(400).json({ error: error.message });
  }
};

// POST /api/cajas/movimientos  { usuarioId, tipo, monto, conceptoId, observacion?, contraAsientoDe? }
const registrarMovimiento = async (req, res) => {
  try {
    const data = await CajaService.registrarMovimiento(req.body || {});
    return res.status(200).json({ success: true, data }); // 200: lo espera el front para refrescar el saldo
  } catch (error) {
    let status = 400;
    if (error.codigo === 'REQUIERE_AUTORIZACION') status = 403;
    else if (CODIGOS_CONFLICTO.includes(error.codigo)) status = 409;
    if (!error.codigo) console.error('[API] Error POST /api/cajas/movimientos:', error);
    return res.status(status).json({ error: error.message, codigo: error.codigo || null, limite: error.limite ?? null });
  }
};

// ── HU-28 ──────────────────────────────────────────────────────────────────
// GET /api/cajas/arqueo/contexto?usuarioId=...   (sin importes: arqueo ciego)
const obtenerContextoArqueo = async (req, res) => {
  try {
    const data = await CajaService.obtenerContextoArqueo(req.query.usuarioId);
    return res.status(200).json({ data });
  } catch (error) {
    console.error('[API] Error GET /api/cajas/arqueo/contexto:', error);
    return res.status(400).json({ error: error.message });
  }
};

// POST /api/cajas/cerrar  { usuarioId, montoFisico }
const cerrarCaja = async (req, res) => {
  try {
    const data = await CajaService.cerrarCaja(req.body || {});
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const status = CODIGOS_CONFLICTO.includes(error.codigo) ? 409 : 400;
    if (!error.codigo) console.error('[API] Error POST /api/cajas/cerrar:', error);
    return res.status(status).json({ error: error.message, codigo: error.codigo || null });
  }
};

// GET /api/cajas/sesiones/:sesionId/reporte-cierre?usuarioId=...   -> PDF
const descargarReporteCierre = async (req, res) => {
  try {
    const datos = await CajaService.obtenerDatosReporte(req.params.sesionId, req.query.usuarioId);
    const doc = generarReporteCierre(datos);

    const fecha = new Date(datos.sesion.cierre).toISOString().slice(0, 10);
    const nombre = `cierre-${String(datos.sesion.cajaNombre).replace(/[^a-zA-Z0-9]+/g, '-')}-${fecha}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    doc.pipe(res);
    doc.end();
  } catch (error) {
    const status = error.codigo === 'REPORTE_NO_ENCONTRADO' ? 404 : error.codigo === 'SIN_PERMISO' ? 403 : 400;
    if (!error.codigo) console.error('[API] Error GET /api/cajas/sesiones/:id/reporte-cierre:', error);
    if (!res.headersSent) return res.status(status).json({ error: error.message, codigo: error.codigo || null });
    return res.end();
  }
};

module.exports = {
  listarCajas, obtenerSesionActiva, abrirCaja,
  obtenerResumen, listarConceptos, listarMovimientos, registrarMovimiento,
  obtenerContextoArqueo, cerrarCaja, descargarReporteCierre,
};