import { useState, useEffect, useMemo, useRef } from 'react';
import Modal from '../components/Modal';
import { validarCuit, formatearCuit } from '../utils/cuit';
import {
  listarProveedores,
  buscarProveedorPorCuit,
  crearProveedor,
  actualizarProveedor,
  cambiarEstadoProveedor,
  obtenerHistorialCompras,
} from '../services/supplierService';

const CONDICIONES_PAGO = [
  { value: 'contado', label: 'Contado' },
  { value: '15_dias', label: '15 días' },
  { value: '30_dias', label: '30 días' },
  { value: '60_dias', label: '60 días' },
  { value: '90_dias', label: '90 días' },
  { value: 'cuenta_corriente', label: 'Cuenta corriente' },
];

const FORM_INICIAL = {
  razonSocial: '',
  cuit: '',
  nombreContacto: '',
  telefono: '',
  email: '',
  direccion: '',
  condicionPago: '',
  notas: '',
};

function getCondicionLabel(value) {
  return CONDICIONES_PAGO.find((c) => c.value === value)?.label || value || '—';
}

function formatearFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function formatearMonto(valor) {
  return `$${Number(valor || 0).toLocaleString('es-AR')}`;
}

function Gestion_de_proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmToast, setConfirmToast] = useState(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('activos'); // activos | inactivos | todos
  const [filtroCondicion, setFiltroCondicion] = useState('todas');

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 10;

  // Modal alta / edición
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState(null);
  const [formData, setFormData] = useState(FORM_INICIAL);
  const [submitting, setSubmitting] = useState(false);
  const [duplicadoEncontrado, setDuplicadoEncontrado] = useState(null);
  const [verificandoCuit, setVerificandoCuit] = useState(false);
  const cuitCheckToken = useRef(0);

  // Modal ficha (detalle + historial de compras)
  const [isFichaOpen, setIsFichaOpen] = useState(false);
  const [fichaProveedor, setFichaProveedor] = useState(null);
  const [historialOC, setHistorialOC] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  // Modales de baja / reactivación
  const [proveedorABajar, setProveedorABajar] = useState(null);
  const [proveedorAReactivar, setProveedorAReactivar] = useState(null);

  const fetchProveedores = () => {
    setLoading(true);
    listarProveedores()
      .then((data) => setProveedores(data))
      .catch((err) => console.error('Error al listar proveedores:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProveedores();
  }, []);

  // Reiniciar a la página 1 cada vez que se modifican los filtros
  useEffect(() => {
    setPaginaActual(1);
  }, [searchTerm, filtroEstado, filtroCondicion]);

  const showToast = (message) => {
    setConfirmToast(message);
    setTimeout(() => setConfirmToast(null), 4000);
  };

  // Validación de CUIT argentino (módulo 11)
  const cuitValidation = useMemo(() => validarCuit(formData.cuit), [formData.cuit]);

  // Verificación en vivo de duplicados contra la base de datos
  useEffect(() => {
    if (cuitValidation.estado !== 'valido') {
      setDuplicadoEncontrado(null);
      setVerificandoCuit(false);
      return;
    }

    const token = ++cuitCheckToken.current;
    setVerificandoCuit(true);

    const idActual = editingProveedor ? editingProveedor.id : null;
    const timer = setTimeout(() => {
      buscarProveedorPorCuit(formData.cuit, idActual)
        .then((encontrado) => {
          if (cuitCheckToken.current !== token) return;
          setDuplicadoEncontrado(encontrado);
        })
        .catch((err) => console.error('Error verificando CUIT duplicado:', err))
        .finally(() => {
          if (cuitCheckToken.current === token) setVerificandoCuit(false);
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [formData.cuit, cuitValidation.estado, editingProveedor]);

  const handleOpenCreateModal = () => {
    setEditingProveedor(null);
    setFormData(FORM_INICIAL);
    setDuplicadoEncontrado(null);
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (prov) => {
    setEditingProveedor(prov);
    setFormData({
      razonSocial: prov.razonSocial,
      cuit: formatearCuit(prov.cuit),
      nombreContacto: prov.nombreContacto || '',
      telefono: prov.telefono || '',
      email: prov.email || '',
      direccion: prov.direccion || '',
      condicionPago: prov.condicionPago,
      notas: prov.notas || '',
    });
    setDuplicadoEncontrado(null);
    setIsFormOpen(true);
  };

  const isFormValid =
    formData.razonSocial.trim().length > 0 &&
    cuitValidation.estado === 'valido' &&
    !duplicadoEncontrado &&
    !verificandoCuit &&
    formData.telefono.trim().length > 0 &&
    formData.email.trim().length > 0 &&
    formData.condicionPago.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid || submitting) return;

    setSubmitting(true);
    try {
      if (editingProveedor) {
        await actualizarProveedor(editingProveedor.id, formData);
        showToast(`Los datos de "${formData.razonSocial}" fueron actualizados correctamente.`);
      } else {
        await crearProveedor(formData);
        showToast(`Proveedor "${formData.razonSocial}" dado de alta correctamente.`);
      }
      setIsFormOpen(false);
      fetchProveedores();
    } catch (error) {
      if (error.code === 'CUIT_DUPLICADO') {
        setDuplicadoEncontrado(error.proveedorExistente);
      } else {
        alert(error.message || 'Ocurrió un error al guardar el proveedor.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerFichaDuplicado = () => {
    if (!duplicadoEncontrado) return;
    setIsFormOpen(false);
    handleAbrirFicha(duplicadoEncontrado);
  };

  const handleAbrirFicha = (prov) => {
    setFichaProveedor(prov);
    setIsFichaOpen(true);
    setHistorialOC([]);
    setLoadingHistorial(true);
    obtenerHistorialCompras(prov.id)
      .then((data) => setHistorialOC(data))
      .catch((err) => console.error('Error al obtener historial de compras:', err))
      .finally(() => setLoadingHistorial(false));
  };

  const handleConfirmarBaja = async () => {
    if (!proveedorABajar) return;
    try {
      await cambiarEstadoProveedor(proveedorABajar.id, false);
      showToast(`"${proveedorABajar.razonSocial}" fue dado de baja.`);
      setProveedorABajar(null);
      fetchProveedores();
    } catch (error) {
      alert(error.message || 'Error al dar de baja el proveedor.');
    }
  };

  const handleConfirmarReactivacion = async () => {
    if (!proveedorAReactivar) return;
    try {
      await cambiarEstadoProveedor(proveedorAReactivar.id, true);
      showToast(`"${proveedorAReactivar.razonSocial}" fue reactivado.`);
      setProveedorAReactivar(null);
      fetchProveedores();
    } catch (error) {
      alert(error.message || 'Error al reactivar el proveedor.');
    }
  };

  // Filtrado reactivo en cliente
  const proveedoresFiltrados = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return proveedores.filter((p) => {
      const matchesEstado =
        filtroEstado === 'todos' ||
        (filtroEstado === 'activos' && p.estado) ||
        (filtroEstado === 'inactivos' && !p.estado);

      const matchesCondicion = filtroCondicion === 'todas' || p.condicionPago === filtroCondicion;

      const matchesSearch =
        term.length === 0 ||
        p.razonSocial.toLowerCase().includes(term) ||
        p.cuit.includes(term.replace(/\D/g, '')) ||
        (p.nombreContacto || '').toLowerCase().includes(term) ||
        (p.email || '').toLowerCase().includes(term);

      return matchesEstado && matchesCondicion && matchesSearch;
    });
  }, [proveedores, searchTerm, filtroEstado, filtroCondicion]);

  // Totales para las tarjetas KPI
  const totalActivos = proveedores.filter((p) => p.estado).length;
  const totalInactivos = proveedores.length - totalActivos;

  // Control de paginación
  const totalPaginas = Math.ceil(proveedoresFiltrados.length / itemsPorPagina) || 1;
  const indicePrimerItem = (paginaActual - 1) * itemsPorPagina;
  const indiceUltimoItem = Math.min(indicePrimerItem + itemsPorPagina, proveedoresFiltrados.length);
  const proveedoresPaginados = proveedoresFiltrados.slice(indicePrimerItem, indiceUltimoItem);

  // Detección de filtros activos
  const hayFiltrosActivos = searchTerm.trim() !== '' || filtroEstado !== 'activos' || filtroCondicion !== 'todas';

  const handleLimpiarFiltros = () => {
    setSearchTerm('');
    setFiltroEstado('activos');
    setFiltroCondicion('todas');
  };

  // Exportar listado a archivo CSV con codificación UTF-8 BOM para Excel
  const handleExportarCSV = () => {
    if (proveedoresFiltrados.length === 0) return;

    const encabezados = [
      'Razón Social',
      'CUIT',
      'Contacto',
      'Teléfono',
      'Email',
      'Dirección',
      'Condición de Pago',
      'Estado',
      'Fecha Alta'
    ];

    const filas = proveedoresFiltrados.map((p) => [
      `"${(p.razonSocial || '').replace(/"/g, '""')}"`,
      `"${p.cuit || ''}"`,
      `"${(p.nombreContacto || '').replace(/"/g, '""')}"`,
      `"${(p.telefono || '').replace(/"/g, '""')}"`,
      `"${(p.email || '').replace(/"/g, '""')}"`,
      `"${(p.direccion || '').replace(/"/g, '""')}"`,
      `"${getCondicionLabel(p.condicionPago)}"`,
      `"${p.estado ? 'Activo' : 'Dado de baja'}"`,
      `"${formatearFecha(p.fechaAlta)}"`
    ]);

    const csvContent = '\uFEFF' + [encabezados.join(';'), ...filas.map((f) => f.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `proveedores_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const historialCount = historialOC.length;
  const montoOperadoTotal = historialOC.reduce((acc, oc) => acc + (Number(oc.monto) || 0), 0);

  return (
    <div>
      {/* BANNER DE CONFIRMACIÓN */}
      {confirmToast && (
        <div className="confirm-banner">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <span>{confirmToast}</span>
        </div>
      )}

      {/* ENCABEZADO */}
      <div className="section-heading">
        <div>
          <h2>Gestión de Proveedores</h2>
          <span className="desc">
            Listado centralizado de proveedores — {proveedoresFiltrados.length} registros (
            {filtroEstado === 'activos' ? 'activos' : filtroEstado === 'inactivos' ? 'dados de baja' : 'totales'})
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className="btn btn-outline"
            onClick={handleExportarCSV}
            title="Descargar listado filtrado en formato CSV para Excel"
            disabled={proveedoresFiltrados.length === 0}
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Exportar CSV
          </button>
          <button className="btn btn-primary" onClick={handleOpenCreateModal}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nuevo proveedor
          </button>
        </div>
      </div>

      {/* TARJETAS KPI */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-icon tint-black">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21V9l9-6 9 6v12" />
                <path d="M9 21v-6h6v6" />
              </svg>
            </div>
          </div>
          <div className="stat-value">{proveedores.length}</div>
          <div className="stat-label">Proveedores registrados</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-icon tint-green">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
          </div>
          <div className="stat-value">{totalActivos}</div>
          <div className="stat-label">Activos</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-icon tint-amber">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
            </div>
          </div>
          <div className="stat-value">{totalInactivos}</div>
          <div className="stat-label">Dados de baja</div>
        </div>
      </div>

      {/* BARRA DE HERRAMIENTAS Y FILTROS */}
      <div className="catalog-toolbar">
        <div className="search-input">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por razón social, CUIT, contacto o email…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="select-field">
          Estado:
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="activos">Activos</option>
            <option value="inactivos">Dados de baja</option>
            <option value="todos">Todos</option>
          </select>
        </div>

        <div className="select-field">
          Condición de pago:
          <select value={filtroCondicion} onChange={(e) => setFiltroCondicion(e.target.value)}>
            <option value="todas">Todas</option>
            {CONDICIONES_PAGO.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {hayFiltrosActivos && (
          <button
            className="btn btn-outline btn-sm"
            onClick={handleLimpiarFiltros}
            title="Restablecer todos los filtros"
            style={{ marginLeft: 'auto' }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* TABLA CON PAGINACIÓN */}
      <div className="table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Razón Social</th>
                <th>CUIT</th>
                <th>Contacto</th>
                <th>Condición de pago</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--gray-500)' }}>
                    Cargando proveedores…
                  </td>
                </tr>
              ) : proveedoresPaginados.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--gray-500)' }}>
                    No se encontraron proveedores para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                proveedoresPaginados.map((prov) => (
                  <tr key={prov.id} style={{ opacity: prov.estado ? 1 : 0.65 }}>
                    <td>
                      <div className="cell-strong">{prov.razonSocial}</div>
                      <div className="cell-sub">Alta: {formatearFecha(prov.fechaAlta)}</div>
                    </td>
                    <td className="cell-mono">{formatearCuit(prov.cuit)}</td>
                    <td>
                      <div>{prov.nombreContacto || '—'}</div>
                      <div className="cell-sub" style={{ fontFamily: 'inherit' }}>
                        {prov.telefono}{prov.telefono && prov.email ? ' · ' : ''}{prov.email}
                      </div>
                    </td>
                    <td>{getCondicionLabel(prov.condicionPago)}</td>
                    <td>
                      <span className={`badge ${prov.estado ? 'badge-green' : 'badge-amber'}`}>
                        <span className="badge-dot"></span>
                        {prov.estado ? 'Activo' : 'Baja'}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-outline btn-sm" onClick={() => handleAbrirFicha(prov)}>
                          Ver ficha
                        </button>
                        <button
                          className="icon-btn"
                          title="Editar proveedor"
                          onClick={() => handleOpenEditModal(prov)}
                        >
                          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                        </button>
                        {prov.estado ? (
                          <button
                            className="icon-btn"
                            title="Dar de baja proveedor"
                            onClick={() => setProveedorABajar(prov)}
                          >
                            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                            </svg>
                          </button>
                        ) : (
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ color: 'var(--green)', borderColor: 'var(--green)' }}
                            title="Reactivar proveedor"
                            onClick={() => setProveedorAReactivar(prov)}
                          >
                            Reactivar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* BARRA DE PAGINACIÓN */}
        {proveedoresFiltrados.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              borderTop: '1px solid var(--gray-200)',
              fontSize: '13px',
              color: 'var(--gray-600)',
            }}
          >
            <div>
              Mostrando <strong>{indicePrimerItem + 1}</strong> a <strong>{indiceUltimoItem}</strong> de{' '}
              <strong>{proveedoresFiltrados.length}</strong> proveedores
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                className="btn btn-outline btn-sm"
                disabled={paginaActual === 1}
                onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))}
              >
                Anterior
              </button>
              <span style={{ fontWeight: '500', padding: '0 4px' }}>
                Página {paginaActual} de {totalPaginas}
              </span>
              <button
                className="btn btn-outline btn-sm"
                disabled={paginaActual === totalPaginas}
                onClick={() => setPaginaActual((prev) => Math.min(prev + 1, totalPaginas))}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* MODAL: ALTA / EDICIÓN DE PROVEEDOR                            */}
      {/* ============================================================ */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingProveedor ? `Editar: ${editingProveedor.razonSocial}` : 'Nuevo proveedor'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setIsFormOpen(false)}>
              Cancelar
            </button>
            <button className="btn btn-primary" disabled={!isFormValid || submitting} onClick={handleSubmit}>
              {submitting ? 'Guardando…' : editingProveedor ? 'Guardar cambios' : 'Dar de alta'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="modal-notice">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            Los campos marcados con <strong>*</strong> son obligatorios.
          </div>

          <div className="form-row">
            <div className="form-field full">
              <label>Razón social<span className="req">*</span></label>
              <input
                type="text"
                placeholder="Ej: Insumos Musicales del Norte S.R.L."
                required
                value={formData.razonSocial}
                onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>CUIT<span className="req">*</span></label>
              <input
                type="text"
                placeholder="Ej: 30-71234567-8"
                maxLength={13}
                required
                value={formData.cuit}
                onChange={(e) => setFormData({ ...formData, cuit: formatearCuit(e.target.value) })}
              />
              {(cuitValidation.estado === 'incompleto' || cuitValidation.estado === 'invalido') && (
                <span className="field-error">{cuitValidation.mensaje}</span>
              )}
              {cuitValidation.estado === 'valido' && verificandoCuit && (
                <span className="field-success">Verificando disponibilidad del CUIT…</span>
              )}
              {cuitValidation.estado === 'valido' && !verificandoCuit && duplicadoEncontrado && (
                <span className="field-error">
                  Ya existe un proveedor registrado con este CUIT: <strong>{duplicadoEncontrado.razonSocial}</strong>.{' '}
                  <a onClick={handleVerFichaDuplicado} style={{ color: 'inherit', textDecoration: 'underline', cursor: 'pointer' }}>
                    Ver ficha del proveedor existente
                  </a>
                </span>
              )}
              {cuitValidation.estado === 'valido' && !verificandoCuit && !duplicadoEncontrado && (
                <span className="field-success">CUIT válido y disponible.</span>
              )}
            </div>

            <div className="form-field">
              <label>Condición de pago<span className="req">*</span></label>
              <select
                required
                value={formData.condicionPago}
                onChange={(e) => setFormData({ ...formData, condicionPago: e.target.value })}
              >
                <option value="">Seleccione una condición</option>
                {CONDICIONES_PAGO.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Nombre de contacto</label>
              <input
                type="text"
                placeholder="Ej: Marcelo Ibáñez"
                value={formData.nombreContacto}
                onChange={(e) => setFormData({ ...formData, nombreContacto: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label>Teléfono<span className="req">*</span></label>
              <input
                type="text"
                placeholder="Ej: 387-4551234"
                required
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Email<span className="req">*</span></label>
              <input
                type="email"
                placeholder="Ej: ventas@proveedor.com.ar"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label>Dirección</label>
              <input
                type="text"
                placeholder="Ej: Av. Bolivia 1450, Salta"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field full">
              <label>Notas</label>
              <textarea
                placeholder="Observaciones internas sobre el proveedor (opcional)"
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: FICHA DE PROVEEDOR (datos + historial de compras)     */}
      {/* ============================================================ */}
      <Modal
        isOpen={isFichaOpen}
        onClose={() => setIsFichaOpen(false)}
        title={fichaProveedor ? fichaProveedor.razonSocial : 'Ficha de proveedor'}
        footer={
          <button className="btn btn-outline" onClick={() => setIsFichaOpen(false)}>
            Cerrar
          </button>
        }
      >
        {fichaProveedor && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <span className="cell-mono" style={{ fontSize: '13px' }}>
                CUIT {formatearCuit(fichaProveedor.cuit)}
              </span>
              <span className={`badge ${fichaProveedor.estado ? 'badge-green' : 'badge-amber'}`}>
                <span className="badge-dot"></span>
                {fichaProveedor.estado ? 'Activo' : 'Baja'}
              </span>
            </div>

            <div className="detail-info-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', margin: 0 }}>
              <div className="detail-info-item">
                <div className="label">Contacto</div>
                <div className="value">{fichaProveedor.nombreContacto || '—'}</div>
              </div>
              <div className="detail-info-item">
                <div className="label">Condición de pago</div>
                <div className="value">{getCondicionLabel(fichaProveedor.condicionPago)}</div>
              </div>
              <div className="detail-info-item">
                <div className="label">Teléfono</div>
                <div className="value">{fichaProveedor.telefono || '—'}</div>
              </div>
              <div className="detail-info-item">
                <div className="label">Email</div>
                <div className="value">{fichaProveedor.email || '—'}</div>
              </div>
              <div className="detail-info-item">
                <div className="label">Dirección</div>
                <div className="value">{fichaProveedor.direccion || '—'}</div>
              </div>
              <div className="detail-info-item">
                <div className="label">Fecha de alta</div>
                <div className="value">{formatearFecha(fichaProveedor.fechaAlta)}</div>
              </div>
            </div>

            {fichaProveedor.notas && (
              <div style={{ fontSize: '12.5px', color: 'var(--gray-700)', background: 'var(--gray-50)', padding: '10px 12px', borderRadius: '6px', borderLeft: '3px solid var(--red)' }}>
                {fichaProveedor.notas}
              </div>
            )}

            {/* KPIs de historial de compras */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', margin: 0 }}>
              <div className="stat-card" style={{ padding: '14px 16px' }}>
                <div className="stat-value" style={{ fontSize: '20px' }}>{historialCount}</div>
                <div className="stat-label">Órdenes de compra registradas</div>
              </div>
              <div className="stat-card" style={{ padding: '14px 16px' }}>
                <div className="stat-value" style={{ fontSize: '20px' }}>{formatearMonto(montoOperadoTotal)}</div>
                <div className="stat-label">Monto total operado</div>
              </div>
            </div>

            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '12.5px', color: 'var(--gray-800)', fontWeight: '600' }}>
                Historial de órdenes de compra
              </h4>
              <div className="table-panel">
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>N° de Orden</th>
                        <th>Fecha</th>
                        <th>Estado</th>
                        <th>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingHistorial ? (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: '18px', color: 'var(--gray-500)' }}>
                            Cargando historial…
                          </td>
                        </tr>
                      ) : historialOC.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: '18px', color: 'var(--gray-500)' }}>
                            Todavía no se registraron órdenes de compra para este proveedor.
                          </td>
                        </tr>
                      ) : (
                        historialOC.map((oc) => (
                          <tr key={oc.numero}>
                            <td className="cell-mono">{oc.numero}</td>
                            <td>{formatearFecha(oc.fecha)}</td>
                            <td>{oc.estado}</td>
                            <td>{formatearMonto(oc.monto)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL: CONFIRMAR BAJA */}
      <Modal
        isOpen={!!proveedorABajar}
        onClose={() => setProveedorABajar(null)}
        title="Dar de baja proveedor"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setProveedorABajar(null)}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={handleConfirmarBaja}>
              Confirmar baja
            </button>
          </>
        }
      >
        {proveedorABajar && (
          <p style={{ fontSize: '13.5px', color: 'var(--gray-700)', margin: 0 }}>
            ¿Confirmás dar de baja a <strong>{proveedorABajar.razonSocial}</strong>? Podrás reactivarlo en cualquier momento desde el listado.
          </p>
        )}
      </Modal>

      {/* MODAL: CONFIRMAR REACTIVACIÓN */}
      <Modal
        isOpen={!!proveedorAReactivar}
        onClose={() => setProveedorAReactivar(null)}
        title="Reactivar proveedor"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setProveedorAReactivar(null)}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={handleConfirmarReactivacion}>
              Confirmar reactivación
            </button>
          </>
        }
      >
        {proveedorAReactivar && (
          <p style={{ fontSize: '13.5px', color: 'var(--gray-700)', margin: 0 }}>
            ¿Confirmás reactivar a <strong>{proveedorAReactivar.razonSocial}</strong> como proveedor activo?
          </p>
        )}
      </Modal>
    </div>
  );
}

export default Gestion_de_proveedores;