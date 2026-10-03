import { useState, useEffect, useMemo, useCallback } from 'react';
import Modal from '../components/Modal';
import { supabase } from '../config/supabaseClient';
import { formatearMonto, formatearFechaHora } from '../utils/format';

const USUARIO_DEFAULT_ID = '00000000-0000-0000-0000-000000000001';

// Función para sugerir por defecto mañana a las 00:00
function getFechaMananaDefault() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── IMPRESIÓN OFICIAL DE LISTA PARA MOSTRADOR ───────────────────────────────
function imprimirListaPreciosHTML(articulosFiltrados, categoriaFiltro, marcaFiltro) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Habilitá las ventanas emergentes para imprimir la lista.');
    return;
  }

  const hoy = new Date();
  const fechaStr = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()} - ${String(hoy.getHours()).padStart(2, '0')}:${String(hoy.getMinutes()).padStart(2, '0')} hs`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Lista de Precios de Mostrador - Mario A. Guerrisi</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 24px; color: #111; font-size: 11.5px; }
    .header { border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    h1 { margin: 0; font-size: 18px; font-weight: 800; }
    p { margin: 2px 0; color: #555; }
    .meta { text-align: right; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background: #f1f5f9; text-align: left; padding: 6px 8px; border-top: 1px solid #000; border-bottom: 1px solid #000; font-size: 10px; text-transform: uppercase; }
    td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
    td.right, th.right { text-align: right; }
    td.mono { font-family: monospace; }
    .footer { margin-top: 24px; border-top: 1px solid #ccc; padding-top: 8px; font-size: 10px; color: #666; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Mario A. Guerrisi e Hijos S.R.L.</h1>
      <p>Lista de Precios al Consumidor Final (Venta Minorista)</p>
      <p><strong>Filtro:</strong> Categoría: ${categoriaFiltro} | Marca: ${marcaFiltro}</p>
    </div>
    <div class="meta">
      <p><strong>Fecha de emisión:</strong> ${fechaStr}</p>
      <p><strong>Total de artículos:</strong> ${articulosFiltrados.length}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 12%;">Código</th>
        <th>Descripción / Instrumento</th>
        <th style="width: 15%;">Marca</th>
        <th style="width: 15%;">Modelo</th>
        <th style="width: 15%;">Categoría</th>
        <th class="right" style="width: 15%;">Precio Final</th>
      </tr>
    </thead>
    <tbody>
      ${articulosFiltrados.map((a) => `
        <tr>
          <td class="mono">${a.codigo_interno || '—'}</td>
          <td><strong>${a.descripcion}</strong></td>
          <td>${a.marca_nombre || '—'}</td>
          <td>${a.modelo || 'Estándar'}</td>
          <td>${a.categoria_nombre || '—'}</td>
          <td class="right mono"><strong>$${Number(a.precio_actual).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong></td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    Precios finales en Pesos Argentinos (ARS) sujetos a modificación sin previo aviso. Casa central: San Juan 956, Salta.
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

// ── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
function Lista_Precios() {
  const [tabActiva, setTabActiva] = useState('vigentes'); // 'vigentes' | 'programados'

  const [articulos, setArticulos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [programados, setProgramados] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedBrand, setSelectedBrand] = useState('Todas');
  const [sortBy, setSortBy] = useState('nombre-asc');

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  // Toast
  const [toast, setToast] = useState(null);

  // Modal 1: Edición Individual
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [articuloAEditar, setArticuloAEditar] = useState(null);
  const [individualForm, setIndividualForm] = useState({
    nuevoPrecio: '',
    modalidad: 'inmediato', // 'inmediato' | 'programado'
    fechaProgramada: getFechaMananaDefault(),
  });
  const [guardandoPrecio, setGuardandoPrecio] = useState(false);

  // Modal 2: Aumento Masivo
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkFilter, setBulkFilter] = useState({
    tipo: 'todos', // 'todos' | 'categoria' | 'marca'
    categoria_id: '',
    marca_id: '',
    porcentaje: '',
    redondeo: '100', // 'sin', '10', '100', '1000'
    modalidad: 'inmediato', // 'inmediato' | 'programado'
    fechaProgramada: getFechaMananaDefault(),
  });
  const [aplicandoAumento, setAplicandoAumento] = useState(false);

  // Modal 3: Historial
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historialArticulo, setHistorialArticulo] = useState([]);
  const [articuloHistorialSeleccionado, setArticuloHistorialSeleccionado] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const showToast = (msg, type = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  };

  // =========================================================================
  // SINCRONIZACIÓN AUTOMÁTICA Y CARGA
  // =========================================================================
  const sincronizarPreciosVencidos = async () => {
    try {
      const ahora = new Date().toISOString();

      // Buscar precios en historial cuya fecha programada ya se cumplió
      const { data: vencidos } = await supabase
        .from('historial_precios')
        .select('id, articulo_id, precio, fecha_hora_registro')
        .lte('fecha_hora_registro', ahora)
        .order('fecha_hora_registro', { ascending: true });

      if (vencidos && vencidos.length > 0) {
        // Mapear el último precio programado por artículo
        const ultimosPrecios = new Map();
        vencidos.forEach((v) => {
          ultimosPrecios.set(v.articulo_id, { precio: v.precio, fecha: v.fecha_hora_registro });
        });

        // Actualizar precio_actual en artículos si corresponde
        for (const [artId, info] of ultimosPrecios.entries()) {
          await supabase
            .from('articulos')
            .update({
              precio_actual: info.precio,
              fecha_hora_actualizacion: info.fecha,
            })
            .eq('id', artId);
        }
      }
    } catch (err) {
      console.warn('[SyncPrecios] Error sincronizando:', err);
    }
  };

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Sincronizar automáticos
      await sincronizarPreciosVencidos();

      // 2. Cargar maestros y artículos
      const ahora = new Date().toISOString();
      const [artRes, catRes, marRes, usuRes, progRes] = await Promise.all([
        supabase
          .from('articulos')
          .select('id, codigo_interno, descripcion, modelo, codigo_ean13, precio_actual, categoria_id, marca_id, estado, fecha_hora_actualizacion')
          .eq('estado', true),
        supabase.from('categorias').select('id, nombre'),
        supabase.from('marcas').select('id, nombre'),
        supabase.from('usuarios').select('id, nombre'),
        // Aumentos a futuro pendientes
        supabase
          .from('historial_precios')
          .select('id, articulo_id, precio, fecha_hora_registro, usuario_id')
          .gt('fecha_hora_registro', ahora)
          .order('fecha_hora_registro', { ascending: true }),
      ]);

      const catMap = new Map((catRes.data || []).map((c) => [c.id, c.nombre]));
      const marMap = new Map((marRes.data || []).map((m) => [m.id, m.nombre]));
      const usuMap = new Map((usuRes.data || []).map((u) => [u.id, u.nombre]));

      const articulosMapeados = (artRes.data || []).map((a) => ({
        ...a,
        categoria_nombre: catMap.get(a.categoria_id) || 'Sin categoría',
        marca_nombre: marMap.get(a.marca_id) || 'Sin marca',
      }));

      const artMap = new Map(articulosMapeados.map((a) => [a.id, a]));

      const programadosMapeados = (progRes.data || []).map((p) => {
        const art = artMap.get(p.articulo_id);
        const precioActual = art ? Number(art.precio_actual) : 0;
        const nuevoPrecio = Number(p.precio);
        const diffPct = precioActual > 0 ? ((nuevoPrecio - precioActual) / precioActual) * 100 : 0;

        return {
          ...p,
          articulo_desc: art ? `${art.marca_nombre} - ${art.descripcion}` : 'Artículo no encontrado',
          articulo_cod: art?.codigo_interno || '—',
          precio_actual: precioActual,
          nuevo_precio: nuevoPrecio,
          variacion_pct: diffPct,
          usuario_nombre: usuMap.get(p.usuario_id) || 'Administrador',
        };
      });

      setArticulos(articulosMapeados);
      setCategorias(catRes.data || []);
      setMarcas(marRes.data || []);
      setUsuarios(usuRes.data || []);
      setProgramados(programadosMapeados);
    } catch (err) {
      console.error('[ListaPrecios] Error al cargar datos:', err);
      showToast('Error al conectar con la base de datos.', 'err');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // =========================================================================
  // FILTRADO Y PAGINACIÓN
  // =========================================================================
  const articulosFiltrados = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return articulos
      .filter((a) => {
        const matchText =
          !q ||
          a.descripcion.toLowerCase().includes(q) ||
          (a.modelo && a.modelo.toLowerCase().includes(q)) ||
          (a.codigo_interno && a.codigo_interno.toLowerCase().includes(q)) ||
          (a.codigo_ean13 && a.codigo_ean13.includes(q)) ||
          a.marca_nombre.toLowerCase().includes(q);

        const matchCat = selectedCategory === 'Todas' || a.categoria_id === selectedCategory;
        const matchMarca = selectedBrand === 'Todas' || a.marca_id === selectedBrand;

        return matchText && matchCat && matchMarca;
      })
      .sort((a, b) => {
        if (sortBy === 'nombre-asc') return a.descripcion.localeCompare(b.descripcion);
        if (sortBy === 'precio-asc') return Number(a.precio_actual) - Number(b.precio_actual);
        if (sortBy === 'precio-desc') return Number(b.precio_actual) - Number(a.precio_actual);
        if (sortBy === 'recientes') return new Date(b.fecha_hora_actualizacion) - new Date(a.fecha_hora_actualizacion);
        return 0;
      });
  }, [articulos, searchTerm, selectedCategory, selectedBrand, sortBy]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, selectedBrand, sortBy]);

  const totalPages = Math.ceil(articulosFiltrados.length / rowsPerPage) || 1;
  const paginatedArticulos = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return articulosFiltrados.slice(start, start + rowsPerPage);
  }, [articulosFiltrados, currentPage, rowsPerPage]);

  const kpis = useMemo(() => {
    const total = articulos.length;
    const suma = articulos.reduce((acc, a) => acc + (Number(a.precio_actual) || 0), 0);
    const promedio = total > 0 ? suma / total : 0;
    return { total, promedio, programados: programados.length };
  }, [articulos, programados]);

  // =========================================================================
  // HANDLERS: EDICIÓN INDIVIDUAL (INMEDIATA O PROGRAMADA)
  // =========================================================================
  const handleOpenEdit = (art) => {
    setArticuloAEditar(art);
    setIndividualForm({
      nuevoPrecio: String(art.precio_actual),
      modalidad: 'inmediato',
      fechaProgramada: getFechaMananaDefault(),
    });
    setIsEditModalOpen(true);
  };

  const handleSaveIndividualPrice = async (e) => {
    e.preventDefault();
    const precioNum = Number(individualForm.nuevoPrecio);

    if (isNaN(precioNum) || precioNum <= 0) {
      alert('Ingresá un precio válido mayor a 0.');
      return;
    }

    const esProgramado = individualForm.modalidad === 'programado';
    let fechaEfectiva = new Date().toISOString();

    if (esProgramado) {
      if (!individualForm.fechaProgramada) {
        alert('Seleccioná la fecha y hora en la que debe entrar en vigencia el precio.');
        return;
      }
      const fechaSel = new Date(individualForm.fechaProgramada);
      if (fechaSel <= new Date()) {
        alert('La fecha programada debe ser en el futuro.');
        return;
      }
      fechaEfectiva = fechaSel.toISOString();
    }

    setGuardandoPrecio(true);
    try {
      const usuarioLogueadoId = usuarios[0]?.id || USUARIO_DEFAULT_ID;

      // 1. Guardar en historial_precios
      const { error: histError } = await supabase.from('historial_precios').insert([
        {
          articulo_id: articuloAEditar.id,
          precio: precioNum,
          fecha_hora_registro: fechaEfectiva,
          usuario_id: usuarioLogueadoId,
        },
      ]);

      if (histError) throw histError;

      // 2. Solo si es INMEDIATO actualizamos articulos.precio_actual ahora
      if (!esProgramado) {
        const { error: artError } = await supabase
          .from('articulos')
          .update({
            precio_actual: precioNum,
            fecha_hora_actualizacion: fechaEfectiva,
          })
          .eq('id', articuloAEditar.id);

        if (artError) throw artError;

        showToast(`Precio de "${articuloAEditar.descripcion}" actualizado a ${formatearMonto(precioNum)}.`);
      } else {
        showToast(
          `Aumento programado para el ${new Date(individualForm.fechaProgramada).toLocaleString('es-AR')}.`
        );
      }

      setIsEditModalOpen(false);
      cargarDatos();
    } catch (err) {
      alert(`Error al guardar: ${err.message}`);
    } finally {
      setGuardandoPrecio(false);
    }
  };

  // =========================================================================
  // HANDLERS: AUMENTO MASIVO GRUPAL (INMEDIATO O PROGRAMADO)
  // =========================================================================
  const articulosAfectadosAumento = useMemo(() => {
    return articulos.filter((a) => {
      if (bulkFilter.tipo === 'categoria') return a.categoria_id === bulkFilter.categoria_id;
      if (bulkFilter.tipo === 'marca') return a.marca_id === bulkFilter.marca_id;
      return true;
    });
  }, [articulos, bulkFilter.tipo, bulkFilter.categoria_id, bulkFilter.marca_id]);

  const aplicarReglaRedondeo = (valor, regla) => {
    if (regla === '10') return Math.round(valor / 10) * 10;
    if (regla === '100') return Math.round(valor / 100) * 100;
    if (regla === '1000') return Math.round(valor / 1000) * 1000;
    return Math.round(valor * 100) / 100;
  };

  const handleConfirmBulkUpdate = async (e) => {
    e.preventDefault();
    const pct = Number(bulkFilter.porcentaje);

    if (isNaN(pct) || pct === 0) {
      alert('Ingresá un porcentaje de variación válido (distinto de 0).');
      return;
    }

    if (articulosAfectadosAumento.length === 0) {
      alert('No hay artículos que coincidan con el alcance seleccionado.');
      return;
    }

    const esProgramado = bulkFilter.modalidad === 'programado';
    let fechaEfectiva = new Date().toISOString();

    if (esProgramado) {
      if (!bulkFilter.fechaProgramada) {
        alert('Seleccioná la fecha y hora de vigencia.');
        return;
      }
      const fechaSel = new Date(bulkFilter.fechaProgramada);
      if (fechaSel <= new Date()) {
        alert('La fecha programada debe ser futura.');
        return;
      }
      fechaEfectiva = fechaSel.toISOString();
    }

    const mensajeConfirmacion = esProgramado
      ? `¿Confirmás programar un ajuste del ${pct > 0 ? '+' : ''}${pct}% para ${articulosAfectadosAumento.length} artículo(s) a partir del ${new Date(bulkFilter.fechaProgramada).toLocaleString('es-AR')}?`
      : `¿Confirmás aplicar un ajuste inmediato del ${pct > 0 ? '+' : ''}${pct}% sobre ${articulosAfectadosAumento.length} artículo(s)?`;

    if (!window.confirm(mensajeConfirmacion)) return;

    setAplicandoAumento(true);
    try {
      const usuarioLogueadoId = usuarios[0]?.id || USUARIO_DEFAULT_ID;
      const factor = 1 + pct / 100;

      for (const a of articulosAfectadosAumento) {
        const valorCalculado = a.precio_actual * factor;
        const precioFinal = Math.max(0, aplicarReglaRedondeo(valorCalculado, bulkFilter.redondeo));

        // Registrar en historial con su fecha correspondiente
        await supabase.from('historial_precios').insert([
          {
            articulo_id: a.id,
            precio: precioFinal,
            fecha_hora_registro: fechaEfectiva,
            usuario_id: usuarioLogueadoId,
          },
        ]);

        // Si es inmediato, actualizar artículo
        if (!esProgramado) {
          await supabase
            .from('articulos')
            .update({
              precio_actual: precioFinal,
              fecha_hora_actualizacion: fechaEfectiva,
            })
            .eq('id', a.id);
        }
      }

      showToast(
        esProgramado
          ? `Aumento del ${pct}% programado para ${articulosAfectadosAumento.length} artículos.`
          : `Aumento del ${pct}% aplicado a ${articulosAfectadosAumento.length} artículos con éxito.`
      );

      setIsBulkModalOpen(false);
      setBulkFilter({
        tipo: 'todos',
        categoria_id: '',
        marca_id: '',
        porcentaje: '',
        redondeo: '100',
        modalidad: 'inmediato',
        fechaProgramada: getFechaMananaDefault(),
      });
      cargarDatos();
    } catch (err) {
      alert(`Error en la actualización masiva: ${err.message}`);
    } finally {
      setAplicandoAumento(false);
    }
  };

  // =========================================================================
  // HANDLERS: CANCELAR O ADELANTAR PRECIO PROGRAMADO
  // =========================================================================
  const handleCancelarProgramado = async (progId) => {
    if (!window.confirm('¿Cancelar este aumento programado? El precio no llegará a aplicarse.')) return;
    try {
      const { error } = await supabase.from('historial_precios').delete().eq('id', progId);
      if (error) throw error;
      showToast('Programación cancelada.');
      cargarDatos();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAplicarYaProgramado = async (prog) => {
    if (!window.confirm(`¿Aplicar de inmediato el precio de ${formatearMonto(prog.nuevo_precio)} para "${prog.articulo_desc}"?`)) return;
    try {
      const ahora = new Date().toISOString();
      await supabase
        .from('articulos')
        .update({
          precio_actual: prog.nuevo_precio,
          fecha_hora_actualizacion: ahora,
        })
        .eq('id', prog.articulo_id);

      await supabase
        .from('historial_precios')
        .update({ fecha_hora_registro: ahora })
        .eq('id', prog.id);

      showToast(`Precio aplicado de inmediato a "${prog.articulo_desc}".`);
      cargarDatos();
    } catch (err) {
      alert(err.message);
    }
  };

  // =========================================================================
  // HANDLERS: HISTORIAL COMPLETO
  // =========================================================================
  const handleOpenHistory = async (art) => {
    setArticuloHistorialSeleccionado(art);
    setIsHistoryModalOpen(true);
    setLoadingHistory(true);

    try {
      const { data, error } = await supabase
        .from('historial_precios')
        .select('id, precio, fecha_hora_registro, usuario_id')
        .eq('articulo_id', art.id)
        .order('fecha_hora_registro', { ascending: false });

      if (error) throw error;

      const usuMap = new Map(usuarios.map((u) => [u.id, u.nombre]));
      const historialConUsuarios = (data || []).map((h) => ({
        ...h,
        usuario_nombre: usuMap.get(h.usuario_id) || 'Administrador',
        esFuturo: new Date(h.fecha_hora_registro) > new Date(),
      }));

      setHistorialArticulo(historialConUsuarios);
    } catch (err) {
      console.error('Error al cargar historial:', err);
      setHistorialArticulo([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div>
      {/* Toast Alert */}
      {toast && (
        <div
          className={`confirm-banner ${toast.type === 'err' ? 'confirm-banner--error' : ''}`}
          style={toast.type === 'err' ? { background: '#dc2626', color: '#fff', borderColor: '#dc2626' } : {}}
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* KPI CARDS */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '16px' }}>
        <div className="stat-card">
          <div className="stat-value">{kpis.total}</div>
          <div className="stat-label">Artículos en lista activa</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--green, #16a34a)' }}>
            {formatearMonto(kpis.promedio)}
          </div>
          <div className="stat-label">Precio promedio de mostrador</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: kpis.programados > 0 ? 'var(--amber, #f59e0b)' : '#64748b' }}>
            {kpis.programados}
          </div>
          <div className="stat-label">Aumentos programados a futuro</div>
        </div>
      </div>

      {/* SWITCH DE PESTAÑAS: VIGENTES VS PROGRAMADOS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div className="warehouse-tabs" style={{ marginBottom: 0 }}>
          <button
            className={`warehouse-tab ${tabActiva === 'vigentes' ? 'active' : ''}`}
            onClick={() => setTabActiva('vigentes')}
          >
            Precios vigentes (Mostrador)
          </button>
          <button
            className={`warehouse-tab ${tabActiva === 'programados' ? 'active' : ''}`}
            onClick={() => setTabActiva('programados')}
          >
            ⏰ Aumentos programados
            {kpis.programados > 0 && (
              <span
                style={{
                  background: 'var(--amber, #f59e0b)',
                  color: '#fff',
                  fontSize: '10.5px',
                  fontWeight: '800',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  marginLeft: '6px',
                }}
              >
                {kpis.programados}
              </span>
            )}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() =>
              imprimirListaPreciosHTML(
                articulosFiltrados,
                selectedCategory === 'Todas' ? 'Todas' : categorias.find((c) => c.id === selectedCategory)?.nombre,
                selectedBrand === 'Todas' ? 'Todas' : marcas.find((m) => m.id === selectedBrand)?.nombre
              )
            }
            title="Imprimir catálogo físico de mostrador"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Imprimir lista
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsBulkModalOpen(true)}
          >
            ⚡ Aumento masivo (%)
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* VISTA 1: PRECIOS VIGENTES                                      */}
      {/* ============================================================== */}
      {tabActiva === 'vigentes' && (
        <>
          <div className="catalog-toolbar" style={{ flexWrap: 'wrap', gap: '10px' }}>
            <div className="search-input" style={{ flex: '1 1 240px' }}>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                placeholder="Buscar por artículo, modelo, código o EAN…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}
                >
                  ✕
                </button>
              )}
            </div>

            <div className="select-field">
              Categoría:
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                <option value="Todas">Todas</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>

            <div className="select-field">
              Marca:
              <select value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)}>
                <option value="Todas">Todas</option>
                {marcas.map((m) => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
            </div>

            <div className="select-field">
              Ordenar:
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="nombre-asc">Nombre (A - Z)</option>
                <option value="precio-asc">Precio (Menor a mayor)</option>
                <option value="precio-desc">Precio (Mayor a menor)</option>
                <option value="recientes">Modificados recientemente</option>
              </select>
            </div>
          </div>

          <div className="table-panel" style={{ marginTop: '12px' }}>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Artículo</th>
                    <th>Marca</th>
                    <th>Modelo</th>
                    <th>Categoría</th>
                    <th style={{ textAlign: 'right' }}>Precio de lista (ARS)</th>
                    <th>Último cambio</th>
                    <th style={{ textAlign: 'center', width: '130px' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--gray-500)' }}>
                        Cargando lista de precios vigente…
                      </td>
                    </tr>
                  ) : articulosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--gray-500)' }}>
                        No se encontraron productos con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    paginatedArticulos.map((art) => (
                      <tr key={art.id}>
                        <td className="cell-mono">{art.codigo_interno}</td>
                        <td className="cell-strong">{art.descripcion}</td>
                        <td>{art.marca_nombre}</td>
                        <td>{art.modelo || 'Estándar'}</td>
                        <td>
                          <span className="badge badge-gray">{art.categoria_nombre}</span>
                        </td>
                        <td className="cell-mono" style={{ textAlign: 'right', fontWeight: '800', fontSize: '13.5px', color: '#0f172a' }}>
                          {formatearMonto(art.precio_actual)}
                        </td>
                        <td style={{ fontSize: '11.5px', color: 'var(--gray-500)' }}>
                          {formatearFechaHora(art.fecha_hora_actualizacion)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="row-actions" style={{ justifyContent: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              style={{ padding: '3px 8px', fontSize: '11px' }}
                              title="Modificar precio unitario"
                              onClick={() => handleOpenEdit(art)}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="icon-btn"
                              title="Ver historial de cambios"
                              onClick={() => handleOpenHistory(art)}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* BARRA DE PAGINACIÓN */}
            {!loading && articulosFiltrados.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 18px',
                  borderTop: '1px solid var(--border-color, #e5e7eb)',
                  fontSize: '12.5px',
                  color: '#64748b',
                  flexWrap: 'wrap',
                  gap: '10px',
                  background: '#fafafa',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Filas por página:</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: '#fff',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#0f172a',
                      cursor: 'pointer',
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                  <span style={{ marginLeft: '6px' }}>
                    Mostrando <strong style={{ color: '#0f172a' }}>{(currentPage - 1) * rowsPerPage + 1}</strong> -{' '}
                    <strong style={{ color: '#0f172a' }}>{Math.min(currentPage * rowsPerPage, articulosFiltrados.length)}</strong> de{' '}
                    <strong style={{ color: '#0f172a' }}>{articulosFiltrados.length}</strong> artículos
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    ← Anterior
                  </button>
                  <span style={{ fontWeight: '700', padding: '0 6px', color: '#0f172a' }}>
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ============================================================== */}
      {/* VISTA 2: AUMENTOS PROGRAMADOS A FUTURO                         */}
      {/* ============================================================== */}
      {tabActiva === 'programados' && (
        <div className="table-panel">
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #e5e7eb', background: '#fffbeb' }}>
            <strong style={{ color: '#92400e', fontSize: '13px' }}>
              ⏰ Lista de espera de precios programados
            </strong>
            <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#b45309' }}>
              Estos precios no están activos en el mostrador todavía. Se aplicarán automáticamente en el momento indicado.
            </p>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Artículo</th>
                  <th style={{ textAlign: 'right' }}>Precio actual</th>
                  <th style={{ textAlign: 'right' }}>Precio programado</th>
                  <th style={{ textAlign: 'center' }}>Variación</th>
                  <th>Entra en vigencia el</th>
                  <th>Cargado por</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {programados.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--gray-500)' }}>
                      No hay aumentos programados a futuro. Podés programar uno desde el botón "+ Aumento masivo" o editando un artículo.
                    </td>
                  </tr>
                ) : (
                  programados.map((p) => (
                    <tr key={p.id}>
                      <td className="cell-mono">{p.articulo_cod}</td>
                      <td className="cell-strong">{p.articulo_desc}</td>
                      <td className="cell-mono" style={{ textAlign: 'right', color: '#64748b' }}>
                        {formatearMonto(p.precio_actual)}
                      </td>
                      <td className="cell-mono" style={{ textAlign: 'right', fontWeight: '800', color: '#047857' }}>
                        {formatearMonto(p.nuevo_precio)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          className={`badge ${p.variacion_pct >= 0 ? 'badge-green' : 'badge-red'}`}
                          style={{ fontWeight: '700' }}
                        >
                          {p.variacion_pct >= 0 ? '+' : ''}{p.variacion_pct.toFixed(1)}%
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-amber" style={{ fontWeight: '600' }}>
                          {formatearFechaHora(p.fecha_hora_registro)}
                        </span>
                      </td>
                      <td style={{ fontSize: '11.5px', color: '#4b5563' }}>{p.usuario_nombre}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="row-actions" style={{ justifyContent: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            style={{ padding: '3px 8px', fontSize: '11px', color: '#059669', borderColor: '#a7f3d0' }}
                            title="Adelantar vigencia y aplicar ya mismo"
                            onClick={() => handleAplicarYaProgramado(p)}
                          >
                            Aplicar ya
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            style={{ padding: '3px 8px', fontSize: '11px', color: '#dc2626', borderColor: '#fca5a5' }}
                            title="Eliminar de la lista de espera"
                            onClick={() => handleCancelarProgramado(p.id)}
                          >
                            Cancelar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: EDICIÓN INDIVIDUAL (CON FECHA)                       */}
      {/* ============================================================== */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Modificar precio de lista"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setIsEditModalOpen(false)} disabled={guardandoPrecio}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={handleSaveIndividualPrice} disabled={guardandoPrecio}>
              {guardandoPrecio
                ? 'Guardando…'
                : individualForm.modalidad === 'programado'
                ? 'Programar aumento'
                : 'Guardar precio'}
            </button>
          </>
        }
      >
        {articuloAEditar && (
          <form onSubmit={handleSaveIndividualPrice} className="form-row">
            <div className="form-field full">
              <label>Artículo</label>
              <div style={{ fontWeight: '700', fontSize: '13.5px', color: 'var(--ink)' }}>
                {articuloAEditar.marca_nombre} - {articuloAEditar.descripcion}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--gray-500)', marginTop: '2px' }}>
                Código: {articuloAEditar.codigo_interno} · Modelo: {articuloAEditar.modelo || 'Estándar'}
              </div>
            </div>

            <div className="form-field full" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Precio actual:</span>
                <strong style={{ fontSize: '16px', color: '#64748b' }}>
                  {formatearMonto(articuloAEditar.precio_actual)}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#047857', display: 'block' }}>Nuevo precio:</span>
                <strong style={{ fontSize: '16px', color: '#047857' }}>
                  {individualForm.nuevoPrecio ? formatearMonto(Number(individualForm.nuevoPrecio)) : '—'}
                </strong>
              </div>
            </div>

            <div className="form-field full">
              <label>Nuevo precio de venta al público ($ ARS) <span className="req">*</span></label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={individualForm.nuevoPrecio}
                onChange={(e) => setIndividualForm({ ...individualForm, nuevoPrecio: e.target.value })}
                autoFocus
                required
              />
              {individualForm.nuevoPrecio && Number(individualForm.nuevoPrecio) !== Number(articuloAEditar.precio_actual) && (
                <span style={{ fontSize: '11.5px', marginTop: '4px', fontWeight: '600', color: Number(individualForm.nuevoPrecio) > Number(articuloAEditar.precio_actual) ? '#16a34a' : '#dc2626' }}>
                  Variación: {(((Number(individualForm.nuevoPrecio) - Number(articuloAEditar.precio_actual)) / Number(articuloAEditar.precio_actual)) * 100).toFixed(1)}%
                </span>
              )}
            </div>

            {/* SELECTOR DE VIGENCIA TEMPORAL */}
            <div className="form-field full" style={{ background: '#f1f5f9', padding: '12px', borderRadius: '8px' }}>
              <label style={{ fontWeight: '700', marginBottom: '8px', color: '#0f172a' }}>Vigencia del cambio:</label>
              <div style={{ display: 'flex', gap: '14px', marginBottom: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="modalidad"
                    checked={individualForm.modalidad === 'inmediato'}
                    onChange={() => setIndividualForm({ ...individualForm, modalidad: 'inmediato' })}
                  />
                  Aplicar de inmediato (Mostrador)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="modalidad"
                    checked={individualForm.modalidad === 'programado'}
                    onChange={() => setIndividualForm({ ...individualForm, modalidad: 'programado' })}
                  />
                  ⏰ Programar para fecha futura
                </label>
              </div>

              {individualForm.modalidad === 'programado' && (
                <div className="form-field full" style={{ margin: 0 }}>
                  <label style={{ fontSize: '11.5px' }}>Fecha y hora de entrada en vigencia:</label>
                  <input
                    type="datetime-local"
                    value={individualForm.fechaProgramada}
                    onChange={(e) => setIndividualForm({ ...individualForm, fechaProgramada: e.target.value })}
                    required
                  />
                </div>
              )}
            </div>
          </form>
        )}
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 2: AUMENTO MASIVO (CON PROGRAMACIÓN)                     */}
      {/* ============================================================== */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Actualización masiva de precios"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setIsBulkModalOpen(false)} disabled={aplicandoAumento}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={handleConfirmBulkUpdate} disabled={aplicandoAumento || !bulkFilter.porcentaje}>
              {aplicandoAumento
                ? 'Procesando…'
                : bulkFilter.modalidad === 'programado'
                ? `Programar para ${articulosAfectadosAumento.length} artículos`
                : `Aplicar a ${articulosAfectadosAumento.length} artículos`}
            </button>
          </>
        }
      >
        <form onSubmit={handleConfirmBulkUpdate} className="form-row">
          <div className="form-field full">
            <label>Alcance del ajuste</label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                className={`btn btn-sm ${bulkFilter.tipo === 'todos' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setBulkFilter({ ...bulkFilter, tipo: 'todos' })}
              >
                Todo el catálogo ({articulos.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${bulkFilter.tipo === 'categoria' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setBulkFilter({ ...bulkFilter, tipo: 'categoria' })}
              >
                Por categoría
              </button>
              <button
                type="button"
                className={`btn btn-sm ${bulkFilter.tipo === 'marca' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setBulkFilter({ ...bulkFilter, tipo: 'marca' })}
              >
                Por marca
              </button>
            </div>
          </div>

          {bulkFilter.tipo === 'categoria' && (
            <div className="form-field full">
              <label>Seleccionar categoría destino</label>
              <select
                value={bulkFilter.categoria_id}
                onChange={(e) => setBulkFilter({ ...bulkFilter, categoria_id: e.target.value })}
                required
              >
                <option value="" disabled>Elegí una categoría…</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {bulkFilter.tipo === 'marca' && (
            <div className="form-field full">
              <label>Seleccionar marca destino</label>
              <select
                value={bulkFilter.marca_id}
                onChange={(e) => setBulkFilter({ ...bulkFilter, marca_id: e.target.value })}
                required
              >
                <option value="" disabled>Elegí una marca…</option>
                {marcas.map((m) => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-field">
            <label>Porcentaje de variación (%) <span className="req">*</span></label>
            <input
              type="number"
              step="0.5"
              placeholder="Ej: 10 (aumento) o -5 (descuento)"
              value={bulkFilter.porcentaje}
              onChange={(e) => setBulkFilter({ ...bulkFilter, porcentaje: e.target.value })}
              required
            />
          </div>

          <div className="form-field">
            <label>Redondeo comercial de precios</label>
            <select
              value={bulkFilter.redondeo}
              onChange={(e) => setBulkFilter({ ...bulkFilter, redondeo: e.target.value })}
            >
              <option value="sin">Sin redondeo (con centavos)</option>
              <option value="10">Redondear a $10</option>
              <option value="100">Redondear a $100 (Recomendado)</option>
              <option value="1000">Redondear a $1.000</option>
            </select>
          </div>

          <div className="form-field full" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: '#64748b', width: '100%', marginBottom: '2px' }}>Aumentos rápidos:</span>
            {[5, 10, 15, 20, 25].map((val) => (
              <button
                key={val}
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setBulkFilter({ ...bulkFilter, porcentaje: String(val) })}
              >
                +{val}%
              </button>
            ))}
          </div>

          {/* VIGENCIA TEMPORAL MASIVA */}
          <div className="form-field full" style={{ background: '#f1f5f9', padding: '12px', borderRadius: '8px', marginTop: '6px' }}>
            <label style={{ fontWeight: '700', marginBottom: '8px', color: '#0f172a' }}>Vigencia del ajuste masivo:</label>
            <div style={{ display: 'flex', gap: '14px', marginBottom: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="modalidad_bulk"
                  checked={bulkFilter.modalidad === 'inmediato'}
                  onChange={() => setBulkFilter({ ...bulkFilter, modalidad: 'inmediato' })}
                />
                Aplicar de inmediato a mostrador
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="modalidad_bulk"
                  checked={bulkFilter.modalidad === 'programado'}
                  onChange={() => setBulkFilter({ ...bulkFilter, modalidad: 'programado' })}
                />
                ⏰ Programar para fecha futura
              </label>
            </div>

            {bulkFilter.modalidad === 'programado' && (
              <div className="form-field full" style={{ margin: 0 }}>
                <label style={{ fontSize: '11.5px' }}>Fecha y hora de entrada en vigencia:</label>
                <input
                  type="datetime-local"
                  value={bulkFilter.fechaProgramada}
                  onChange={(e) => setBulkFilter({ ...bulkFilter, fechaProgramada: e.target.value })}
                  required
                />
              </div>
            )}
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 3: HISTORIAL DE CAMBIOS                                  */}
      {/* ============================================================== */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title="Historial de cambios de precio"
        footer={
          <button className="btn btn-outline" onClick={() => setIsHistoryModalOpen(false)}>
            Cerrar
          </button>
        }
      >
        {articuloHistorialSeleccionado && (
          <div>
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--ink)' }}>
                {articuloHistorialSeleccionado.marca_nombre} - {articuloHistorialSeleccionado.descripcion}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '2px' }}>
                Precio actual vigente en mostrador: <strong>{formatearMonto(articuloHistorialSeleccionado.precio_actual)}</strong>
              </div>
            </div>

            <div className="table-panel">
              <div className="table-scroll" style={{ maxHeight: '320px' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Fecha y Hora</th>
                      <th style={{ textAlign: 'right' }}>Precio Registrado</th>
                      <th>Estado</th>
                      <th>Usuario / Autor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingHistory ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-500)' }}>
                          Consultando historial…
                        </td>
                      </tr>
                    ) : historialArticulo.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-500)' }}>
                          No hay modificaciones registradas para este artículo.
                        </td>
                      </tr>
                    ) : (
                      historialArticulo.map((h) => (
                        <tr key={h.id}>
                          <td>{formatearFechaHora(h.fecha_hora_registro)}</td>
                          <td className="cell-mono" style={{ textAlign: 'right', fontWeight: '700' }}>
                            {formatearMonto(h.precio)}
                          </td>
                          <td>
                            {h.esFuturo ? (
                              <span className="badge badge-amber">⏰ Programado</span>
                            ) : (
                              <span className="badge badge-green">✓ Aplicado</span>
                            )}
                          </td>
                          <td>{h.usuario_nombre}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default Lista_Precios;