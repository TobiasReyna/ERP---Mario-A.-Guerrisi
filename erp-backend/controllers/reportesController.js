const ReportesService = require('../services/reportesService');
const { generarReporteGerencialPdf } = require('../utils/reporteCierrePdf');
const { supabaseAdmin } = require('../config/supabase');
const { ROLES } = require('../middlewares/authMiddleware');

/**
 * GET /api/reportes/ingresos
 * Autorizado para: [ROLES.ADMIN]
 */
const getIngresos = async (req, res) => {
  try {
    const {
      desde,
      hasta,
      fechaDesde,
      fechaHasta,
      canal_venta,
      canal,
      deposito_id,
      sucursal_id,
      medio_pago,
      metodo_pago,
      agrupacion = 'dia',
    } = req.query;

    const data = await ReportesService.obtenerReporteIngresos({
      desde: desde || fechaDesde,
      hasta: hasta || fechaHasta,
      canal_venta: canal_venta || canal,
      deposito_id: deposito_id || sucursal_id,
      medio_pago: medio_pago || metodo_pago,
      agrupacion,
    });

    return res.status(200).json(data);
  } catch (error) {
    const status = error.statusCode || 500;
    if (status === 500) console.error('[ReportesController] Error en getIngresos:', error);
    return res.status(status).json({
      error: error.message || 'Error interno al generar el reporte de ingresos.',
    });
  }
};

/**
 * GET /api/reportes/egresos
 * Autorizado para: [ROLES.ADMIN, ROLES.TESORERO]
 */
const getEgresos = async (req, res) => {
  try {
    const {
      desde,
      hasta,
      fechaDesde,
      fechaHasta,
      proveedor_id,
      proveedorId,
      agrupacion = 'dia',
    } = req.query;

    const data = await ReportesService.obtenerReporteEgresos({
      desde: desde || fechaDesde,
      hasta: hasta || fechaHasta,
      proveedor_id: proveedor_id || proveedorId,
      agrupacion,
    });

    return res.status(200).json(data);
  } catch (error) {
    const status = error.statusCode || 500;
    if (status === 500) console.error('[ReportesController] Error en getEgresos:', error);
    return res.status(status).json({
      error: error.message || 'Error interno al generar el reporte de egresos.',
    });
  }
};

/**
 * GET /api/reportes/balance
 * Autorizado para: [ROLES.ADMIN]
 */
const getBalance = async (req, res) => {
  try {
    const {
      desde,
      hasta,
      fechaDesde,
      fechaHasta,
      deposito_id,
      sucursal_id,
      agrupacion = 'dia',
    } = req.query;

    const data = await ReportesService.obtenerReporteBalance({
      desde: desde || fechaDesde,
      hasta: hasta || fechaHasta,
      deposito_id: deposito_id || sucursal_id,
      agrupacion,
    });

    return res.status(200).json(data);
  } catch (error) {
    const status = error.statusCode || 500;
    if (status === 500) console.error('[ReportesController] Error en getBalance:', error);
    return res.status(status).json({
      error: error.message || 'Error interno al generar el balance financiero.',
    });
  }
};

/**
 * GET /api/reportes/exportar-pdf
 * Query params: tipo ('ingresos' | 'egresos' | 'balance') y filtros activos.
 * Envía el archivo PDF generado en streaming (Content-Type: application/pdf).
 */
const exportarPdf = async (req, res) => {
  try {
    const {
      tipo,
      desde,
      hasta,
      fechaDesde,
      fechaHasta,
      canal_venta,
      canal,
      deposito_id,
      sucursal_id,
      medio_pago,
      metodo_pago,
      proveedor_id,
      proveedorId,
      agrupacion = 'dia',
    } = req.query;

    const tipoNormalizado = String(tipo || '').trim().toLowerCase();
    if (!['ingresos', 'egresos', 'balance'].includes(tipoNormalizado)) {
      return res.status(400).json({
        error: "El parámetro 'tipo' es obligatorio y debe ser 'ingresos', 'egresos' o 'balance'.",
      });
    }

    // Validación estricta de RBAC por tipo de reporte (HU-54 Criterio 4):
    // Tesorero únicamente puede exportar el reporte de egresos.
    const rolUsuario = String(req.user?.rol || '').trim().toLowerCase();
    const esAdmin = rolUsuario === ROLES.ADMIN.toLowerCase();
    const esTesorero = rolUsuario === ROLES.TESORERO.toLowerCase();

    if (tipoNormalizado !== 'egresos' && !esAdmin) {
      return res.status(403).json({
        error: 'No tiene permisos para exportar este tipo de reporte.',
      });
    }

    if (tipoNormalizado === 'egresos' && !esAdmin && !esTesorero) {
      return res.status(403).json({
        error: 'No tiene permisos para exportar el reporte de egresos.',
      });
    }

    const fDesde = desde || fechaDesde;
    const fHasta = hasta || fechaHasta;
    const fCanal = canal_venta || canal || 'Todos';
    const fDeposito = deposito_id || sucursal_id || '';
    const fMedio = medio_pago || metodo_pago || '';
    const fProveedor = proveedor_id || proveedorId || '';

    let reporte;
    const partesFiltro = [];

    if (tipoNormalizado === 'ingresos') {
      reporte = await ReportesService.obtenerReporteIngresos({
        desde: fDesde,
        hasta: fHasta,
        canal_venta: fCanal,
        deposito_id: fDeposito,
        medio_pago: fMedio,
        agrupacion,
      });

      partesFiltro.push(`Canal: ${fCanal}`);
      if (fDeposito) {
        const { data: dep } = await supabaseAdmin
          .from('depositos')
          .select('nombre')
          .eq('id', fDeposito)
          .maybeSingle();
        partesFiltro.push(`Sucursal: ${dep?.nombre || fDeposito}`);
      } else {
        partesFiltro.push('Sucursal: Todas');
      }
      partesFiltro.push(`Medio de pago: ${fMedio || 'Todos'}`);
    } else if (tipoNormalizado === 'egresos') {
      reporte = await ReportesService.obtenerReporteEgresos({
        desde: fDesde,
        hasta: fHasta,
        proveedor_id: fProveedor,
        agrupacion,
      });

      if (fProveedor) {
        const { data: prov } = await supabaseAdmin
          .from('proveedores')
          .select('razon_social')
          .eq('id', fProveedor)
          .maybeSingle();
        partesFiltro.push(`Proveedor: ${prov?.razon_social || fProveedor}`);
      } else {
        partesFiltro.push('Proveedor: Todos');
      }
    } else {
      reporte = await ReportesService.obtenerReporteBalance({
        desde: fDesde,
        hasta: fHasta,
        deposito_id: fDeposito,
        agrupacion,
      });

      if (fDeposito) {
        const { data: dep } = await supabaseAdmin
          .from('depositos')
          .select('nombre')
          .eq('id', fDeposito)
          .maybeSingle();
        partesFiltro.push(`Sucursal ventas: ${dep?.nombre || fDeposito}`);
      } else {
        partesFiltro.push('Sucursal ventas: Todas');
      }
    }

    // Registro en auditoría (best-effort para no interrumpir la descarga si la tabla no existe)
    try {
      await supabaseAdmin.from('auditoria_logs').insert([
        {
          usuario_id: req.user?.id || null,
          accion: `EXPORTAR_REPORTE_${tipoNormalizado.toUpperCase()}_PDF`,
          entidad: 'ReportesGerenciales',
          detalles: {
            tipo: tipoNormalizado,
            filtros: reporte.filtros,
          },
          ip: req.ip,
        },
      ]);
    } catch (_) {
      // No bloquear la exportación ante fallo de tabla de auditoría opcional
    }

    const doc = generarReporteGerencialPdf({
      tipo: tipoNormalizado,
      reporte,
      metadatos: {
        usuarioNombre: req.user?.nombre || 'Usuario',
        usuarioRol: req.user?.rol || ROLES.ADMIN,
        filtrosDescripcion: partesFiltro.join('  |  '),
      },
    });

    const filename = `reporte-${tipoNormalizado}-${reporte.filtros.desde}-a-${reporte.filtros.hasta}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'private, no-store');

    doc.on('error', (err) => {
      console.error('[ReportesController] Error en stream de PDF:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error generando el documento PDF.' });
      } else {
        res.end();
      }
    });

    doc.pipe(res);
    doc.end();
  } catch (error) {
    const status = error.statusCode || 500;
    if (status === 500) console.error('[ReportesController] Error en exportarPdf:', error);
    if (!res.headersSent) {
      return res.status(status).json({
        error: error.message || 'Error interno al exportar el reporte PDF.',
      });
    }
    return res.end();
  }
};

module.exports = {
  getIngresos,
  getEgresos,
  getBalance,
  exportarPdf,
};
