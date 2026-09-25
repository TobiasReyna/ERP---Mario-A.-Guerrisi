import { useState, useEffect, useMemo } from 'react';
import Modal2 from '../components/Modal2';
import { supabase } from '../config/supabaseClient';

function Movimientos() {
  const [allMovements, setAllMovements] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filtros
  const [selectedType, setSelectedType] = useState('Todos');
  const [selectedWarehouse, setSelectedWarehouse] = useState('Todos');
  const [selectedUser, setSelectedUser] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  // Toast confirmación
  const [confirmToast, setConfirmToast] = useState(null);

  // Modal registrar movimiento
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Catálogos maestros
  const [dbFetchProd, setDbFetchProd] = useState([]);
  const [dbFetchDepo, setDbFetchDepo] = useState([]);
  const [dbFetchUsu, setDbFetchUsu] = useState([]);
  const [dbFetchMot, setDbFetchMot] = useState([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // =========================================================================
  // 1. CARGA Y RECONSTRUCCIÓN CRONOLÓGICA DE STOCK (AJUSTES + VENTAS)
  // =========================================================================
  const fetchAllMovements = async () => {
    setIsLoading(true);
    try {
      const [artRes, depRes, usuRes, motRes, ajRes, vtaRes, vtaDetRes, exRes] = await Promise.all([
        supabase.from('articulos').select('id, descripcion, modelo'),
        supabase.from('depositos').select('id, nombre'),
        supabase.from('usuarios').select('id, nombre'),
        supabase.from('motivos_ajustes').select('id, nombre'),
        supabase.from('ajustes_stock').select('*'),
        supabase.from('ventas').select('*').eq('estado', 'Confirmada'),
        supabase.from('ventas_detalle').select('*'),
        supabase.from('existencias').select('articulo_id, deposito_id, cantidad'),
      ]);

      const artMap = new Map((artRes.data || []).map((a) => [a.id, a]));
      const depMap = new Map((depRes.data || []).map((d) => [d.id, d.nombre]));
      const usuMap = new Map((usuRes.data || []).map((u) => [u.id, u.nombre]));
      const motMap = new Map((motRes.data || []).map((m) => [m.id, m.nombre]));
      const vtaMap = new Map((vtaRes.data || []).map((v) => [v.id, v]));

      // Mapa con stock físico actual: "articuloId_depositoId" => cantidad
      const stockActualMap = new Map(
        (exRes.data || []).map((e) => [`${e.articulo_id}_${e.deposito_id}`, Number(e.cantidad) || 0])
      );

      const rawMovements = [];

      // A. Mapeo de Ajustes Manuales
      if (ajRes.data) {
        ajRes.data.forEach((a) => {
          const dateObj = new Date(a.fecha_hora_registro);
          const dateFormatted = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;

          const art = artMap.get(a.articulo_id);
          const depNombre = depMap.get(a.deposito_id) || 'Depósito';
          const usuNombre = usuMap.get(a.usuario_id) || 'Administrador';
          const motNombre = motMap.get(a.motivo_id) || 'Ajuste de inventario';

          const cantAnt = a.cantidad_anterior ?? 0;
          const cantNue = a.cantidad_nueva ?? 0;
          const delta = cantNue - cantAnt;
          const tipoLabel = delta >= 0 ? 'Ajuste positivo' : 'Ajuste negativo';

          rawMovements.push({
            id: `aj-${a.id}`,
            articulo_id: a.articulo_id,
            deposito_id: a.deposito_id,
            rawDate: dateObj,
            date: dateFormatted,
            product: art?.descripcion || 'Producto no especificado',
            model: art?.modelo || 'Estándar',
            type: tipoLabel,
            warehouse: depNombre,
            qty: delta >= 0 ? `+${delta}` : `${delta}`,
            reason: motNombre,
            user: usuNombre,
            isAjuste: true,
            cantAnt,
            cantNue,
          });
        });
      }

      // B. Mapeo de Ventas Mostrador Confirmadas
      if (vtaDetRes.data) {
        vtaDetRes.data.forEach((vd) => {
          const v = vtaMap.get(vd.venta_id);
          if (!v) return;

          const dateObj = new Date(v.fecha_hora_registro || v.fecha_hora_reserva || Date.now());
          const dateFormatted = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;

          const art = artMap.get(vd.articulo_id);
          const depNombre = depMap.get(v.deposito_id) || 'Depósito';
          const usuNombre = usuMap.get(v.usuario_id) || 'Cajero';
          const cantVendida = Number(vd.cantidad) || 0;

          rawMovements.push({
            id: `vta-${v.id}-${vd.id}`,
            articulo_id: vd.articulo_id,
            deposito_id: v.deposito_id,
            rawDate: dateObj,
            date: dateFormatted,
            product: art?.descripcion || 'Producto no especificado',
            model: art?.modelo || 'Estándar',
            type: 'Salida',
            warehouse: depNombre,
            qty: `-${cantVendida}`,
            reason: `Venta mostrador (${v.numero_comprobante || 'S/N'})`,
            user: usuNombre,
            isAjuste: false,
            cantVendida,
          });
        });
      }

      // C. Reconstrucción cronológica de "Stock ant. → nuevo" por artículo y depósito
      const agrupadosPorArtDep = new Map();
      rawMovements.forEach((m) => {
        const key = `${m.articulo_id}_${m.deposito_id}`;
        if (!agrupadosPorArtDep.has(key)) {
          agrupadosPorArtDep.set(key, []);
        }
        agrupadosPorArtDep.get(key).push(m);
      });

      const listaFinal = [];

      agrupadosPorArtDep.forEach((grupoMovimientos, key) => {
        grupoMovimientos.sort((a, b) => b.rawDate - a.rawDate);

        let runningStock = stockActualMap.get(key) ?? 0;

        grupoMovimientos.forEach((m) => {
          if (m.isAjuste) {
            m.stockChange = `${m.cantAnt} → ${m.cantNue}`;
            runningStock = m.cantAnt;
          } else {
            const stockNuevo = runningStock;
            const stockAnterior = runningStock + m.cantVendida;
            m.stockChange = `${stockAnterior} → ${stockNuevo}`;
            runningStock = stockAnterior;
          }
          listaFinal.push(m);
        });
      });

      listaFinal.sort((a, b) => b.rawDate - a.rawDate);
      setAllMovements(listaFinal);
    } catch (err) {
      console.error('Error cargando movimientos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // =========================================================================
  // 2. CARGA DE CATÁLOGOS MAESTROS
  // =========================================================================
  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        const [pRes, dRes, uRes, mRes] = await Promise.all([
          supabase.from('articulos').select('*').eq('estado', true),
          supabase.from('depositos').select('*'),
          supabase.from('usuarios').select('*'),
          supabase.from('motivos_ajustes').select('*'),
        ]);

        if (pRes.data) setDbFetchProd(pRes.data);
        if (dRes.data) setDbFetchDepo(dRes.data);
        if (uRes.data) setDbFetchUsu(uRes.data);
        if (mRes.data) setDbFetchMot(mRes.data);
      } catch (err) {
        console.error('Error cargando catálogos:', err);
      }
    };

    loadCatalogs();
    fetchAllMovements();
  }, []);

  // =========================================================================
  // 3. FILTRADO REACTIVO
  // =========================================================================
  const filteredMovements = useMemo(() => {
    return allMovements.filter((mov) => {
      const matchesType =
        selectedType === 'Todos' ||
        (selectedType === 'Entrada' && (mov.type === 'Entrada' || mov.type === 'Ajuste positivo')) ||
        (selectedType === 'Salida' && (mov.type === 'Salida' || mov.type === 'Ajuste negativo')) ||
        mov.type.toLowerCase().includes(selectedType.toLowerCase());

      const matchesWarehouse =
        selectedWarehouse === 'Todos' ||
        mov.warehouse.toLowerCase().includes(selectedWarehouse.toLowerCase());

      const matchesUser =
        selectedUser === 'Todos' || mov.user === selectedUser;

      const matchesSearch =
        searchQuery.trim() === '' ||
        mov.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mov.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mov.model.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesType && matchesWarehouse && matchesUser && matchesSearch;
    });
  }, [allMovements, selectedType, selectedWarehouse, selectedUser, searchQuery]);

  // Al cambiar filtros, volver a la página 1 automáticamente
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedType, selectedWarehouse, selectedUser, searchQuery]);

  // =========================================================================
  // 4. LÓGICA DE PAGINACIÓN
  // =========================================================================
  const totalPages = Math.ceil(filteredMovements.length / rowsPerPage) || 1;

  const paginatedMovements = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredMovements.slice(start, start + rowsPerPage);
  }, [filteredMovements, currentPage, rowsPerPage]);

  const showToast = (msg) => {
    setConfirmToast(msg);
    setTimeout(() => setConfirmToast(null), 4000);
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  // =========================================================================
  // 5. REGISTRO MANUAL DE AJUSTES MULTIPRODUCTO
  // =========================================================================
  const handleConfirmMultiProductMovement = async ({ headerData, productos }) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const { deposito, tipoMovimiento, responsable } = headerData;

      for (const item of productos) {
        const { data: existData } = await supabase
          .from('existencias')
          .select('cantidad')
          .eq('articulo_id', item.producto)
          .eq('deposito_id', deposito)
          .maybeSingle();

        const currentStock = existData?.cantidad ?? 0;
        let finalStock = currentStock;
        const cant = Number(item.cantidad) || 0;

        if (tipoMovimiento === 'entrada') {
          finalStock = currentStock + cant;
        } else if (tipoMovimiento === 'salida') {
          if (currentStock < cant) {
            const artInfo = dbFetchProd.find((p) => p.id === item.producto);
            const prodName = artInfo ? artInfo.descripcion : 'seleccionado';
            throw new Error(`Stock insuficiente para "${prodName}". Stock actual: ${currentStock}, requerido: ${cant}.`);
          }
          finalStock = currentStock - cant;
        } else if (tipoMovimiento === 'ajuste') {
          finalStock = cant;
        }

        const res = await fetch('http://localhost:3001/api/stock/adjust', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            articulo_id: item.producto,
            deposito_id: deposito,
            cantidad_anterior: Number(currentStock),
            cantidad_nueva: Number(finalStock),
            motivo_id: item.motivo || (dbFetchMot.length > 0 ? dbFetchMot[0].id : null),
            usuario_id: responsable,
          }),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || json.message || 'Error al registrar el ajuste en el backend.');
        }

        if (existData) {
          await supabase
            .from('existencias')
            .update({ cantidad: Number(finalStock) })
            .eq('articulo_id', item.producto)
            .eq('deposito_id', deposito);
        } else {
          await supabase.from('existencias').insert([
            {
              articulo_id: item.producto,
              deposito_id: deposito,
              cantidad: Number(finalStock),
            },
          ]);
        }
      }

      await fetchAllMovements();
      setIsModalOpen(false);
      showToast(`Movimiento registrado con éxito para ${productos.length} producto(s).`);
    } catch (err) {
      alert(`Error en la transacción: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* CONFIRM BANNER */}
      {confirmToast && (
        <div className="confirm-banner">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <span>{confirmToast}</span>
        </div>
      )}

      {/* FILTROS */}
      <div className="filter-bar">
        <div className="select-field">
          Tipo:
          <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
            <option>Todos</option>
            <option>Entrada</option>
            <option>Salida</option>
            <option>Ajuste positivo</option>
            <option>Ajuste negativo</option>
          </select>
        </div>

        <div className="select-field">
          Depósito:
          <select value={selectedWarehouse} onChange={(e) => setSelectedWarehouse(e.target.value)}>
            <option value="Todos">Todos los depósitos</option>
            {dbFetchDepo.map((d) => (
              <option key={d.id} value={d.nombre}>
                {d.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="select-field">
          Usuario:
          <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
            <option value="Todos">Todos los usuarios</option>
            {dbFetchUsu.map((u) => (
              <option key={u.id} value={u.nombre}>
                {u.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="search-input" style={{ maxWidth: '240px' }}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Buscar producto o modelo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <button className="btn btn-primary" onClick={handleOpenModal} style={{ marginLeft: 'auto' }}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Registrar movimiento
        </button>
      </div>

      {/* TABLA DE MOVIMIENTOS CON PAGINACIÓN */}
      <div className="table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Modelo</th>
                <th>Depósito</th>
                <th>Cantidad</th>
                <th>Motivo</th>
                <th>Usuario</th>
                <th>Stock ant. → nuevo</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--gray-500)' }}>
                    Cargando movimientos...
                  </td>
                </tr>
              ) : filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--gray-500)' }}>
                    No se encontraron movimientos registrados bajo los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                paginatedMovements.map((mov) => (
                  <tr key={mov.id}>
                    <td>{mov.date}</td>
                    <td className="cell-strong">{mov.product}</td>
                    <td>{mov.model}</td>
                    <td>{mov.warehouse}</td>
                    <td
                      className="cell-strong"
                      style={{
                        color: mov.qty.startsWith('-') ? 'var(--crit, #dc2626)' : 'var(--green, #16a34a)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {mov.qty}
                    </td>
                    <td>{mov.reason}</td>
                    <td>{mov.user}</td>
                    <td
                      className="cell-mono"
                      style={{
                        fontWeight: '700',
                        color: 'var(--gray-900)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {mov.stockChange}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* BARRA DE CONTROL DE PAGINACIÓN */}
        {!isLoading && filteredMovements.length > 0 && (
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
            {/* Selector de filas por página */}
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
                  outline: 'none',
                }}
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span style={{ marginLeft: '6px' }}>
                Mostrando{' '}
                <strong style={{ color: '#0f172a' }}>
                  {(currentPage - 1) * rowsPerPage + 1}
                </strong>{' '}
                -{' '}
                <strong style={{ color: '#0f172a' }}>
                  {Math.min(currentPage * rowsPerPage, filteredMovements.length)}
                </strong>{' '}
                de <strong style={{ color: '#0f172a' }}>{filteredMovements.length}</strong> movimientos
              </span>
            </div>

            {/* Navegación entre páginas */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: '4px 10px',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === 1 ? 0.5 : 1,
                }}
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
                style={{
                  padding: '4px 10px',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage >= totalPages ? 0.5 : 1,
                }}
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL REGISTRAR MOVIMIENTO MULTIPRODUCTO */}
      <Modal2
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmMultiProductMovement}
        depositos={dbFetchDepo}
        usuarios={dbFetchUsu}
        motivos={dbFetchMot}
        catalogoProductos={dbFetchProd}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

export default Movimientos;