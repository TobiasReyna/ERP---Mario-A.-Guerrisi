import { useState, useEffect, useCallback } from 'react';
import Modal from '../components/Modal';

// TEMPORAL: mismo usuario fijo que se usa en Movimientos.jsx, hasta que exista login/auth real.
const TEMP_USER_ID = '7ab3d65c-eecc-4f0b-98a1-2c53efce620e';

// Caché en memoria para evitar llamadas redundantes
const imageMemoryCache = new Map();

function AutoProductImage({ query, alt, style }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!query || query.trim() === '') {
      setLoading(false);
      return;
    }

    const cleanQuery = query
      .replace(/[^\w\s-]/gi, '')
      .split(' ')
      .slice(0, 3)
      .join(' ')
      .trim();

    if (imageMemoryCache.has(cleanQuery)) {
      setImageUrl(imageMemoryCache.get(cleanQuery));
      setLoading(false);
      return;
    }

    const cachedStorage = sessionStorage.getItem(`img_cache_${cleanQuery}`);
    if (cachedStorage) {
      imageMemoryCache.set(cleanQuery, cachedStorage);
      setImageUrl(cachedStorage);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setHasError(false);

    const fetchImage = async () => {
      try {
        let res = await fetch(
          `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanQuery)}`
        );
        let data = res.ok ? await res.json() : null;

        if (!data || !data.thumbnail?.source) {
          res = await fetch(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanQuery)}`
          );
          data = res.ok ? await res.json() : null;
        }

        if (isMounted) {
          if (data && data.thumbnail?.source) {
            const highResUrl = data.thumbnail.source.replace(/\/\d+px-/, '/600px-');
            imageMemoryCache.set(cleanQuery, highResUrl);
            sessionStorage.setItem(`img_cache_${cleanQuery}`, highResUrl);
            setImageUrl(highResUrl);
          } else {
            setHasError(true);
          }
        }
      } catch {
        if (isMounted) setHasError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchImage();

    return () => {
      isMounted = false;
    };
  }, [query]);

  if (hasError || !imageUrl) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: '80px', height: '80px', stroke: 'var(--gray-500)', ...style }}
      >
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt || query}
      onError={() => setHasError(true)}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        opacity: loading ? 0 : 1,
        transition: 'opacity 0.3s ease',
        ...style,
      }}
    />
  );
}

function Detalle_producto({ isOpen, onClose, articuloId, onUpdate }) {
  const [articulo, setArticulo] = useState(null);
  const [stockInfo, setStockInfo] = useState({ consolidado: 0, depositos: [] });
  const [historialMovimientos, setHistorialMovimientos] = useState([]);
  const [depositosDisponibles, setDepositosDisponibles] = useState([]);
  const [brandsList, setBrandsList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [countriesList, setCountriesList] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmBanner, setConfirmBanner] = useState(null);

  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConfirmEditOpen, setIsConfirmEditOpen] = useState(false);

  const [stockMin, setStockMin] = useState(5);
  const [stockMax, setStockMax] = useState(15);
  const [selectedDepositoPolitica, setSelectedDepositoPolitica] = useState('TODOS');

  const [editFormData, setEditFormData] = useState({
    descripcion: '',
    marca_id: '',
    modelo: '',
    categoria_id: '',
    pais_origen: '',
    codigo_ean13: '',
    precio_actual: '',
  });

  const [transferData, setTransferData] = useState({
    origen_id: '',
    destino_id: '',
    cantidad: 1,
    motivo: 'Rebalanceo de stock',
  });

  const showConfirm = (text) => {
    setConfirmBanner(text);
    setTimeout(() => setConfirmBanner(null), 4000);
  };

  const loadProductDetails = useCallback(async () => {
    if (!articuloId || !isOpen) return;

    try {
      setLoading(true);
      setError(null);

      const [artRes, stockRes, histRes, depRes, brandRes, catRes, countRes] = await Promise.all([
        fetch(`http://localhost:3001/api/articles/${articuloId}`),
        fetch(`http://localhost:3001/api/stock/${articuloId}`),
        fetch(`http://localhost:3001/api/stock/${articuloId}/history`),
        fetch(`http://localhost:3001/api/deposits`),
        fetch(`http://localhost:3001/api/brands`),
        fetch(`http://localhost:3001/api/categories`),
        fetch(`http://localhost:3001/api/countries`),
      ]);

      if (!artRes.ok) throw new Error('No se pudo obtener el artículo.');

      const artJson = await artRes.json();
      const stockJson = stockRes.ok ? await stockRes.json() : { total: 0, depositos: [] };
      const histJson = histRes.ok ? await histRes.json() : { data: [] };
      const depJson = depRes.ok ? await depRes.json() : { data: [] };
      const brandJson = brandRes.ok ? await brandRes.json() : { data: [] };
      const catJson = catRes.ok ? await catRes.json() : { data: [] };
      const countJson = countRes.ok ? await countRes.json() : { data: [] };

      const bList = brandJson.data || [];
      const cList = catJson.data || [];
      const pList = countJson.data || [];

      setBrandsList(bList);
      setCategoriesList(cList);
      setCountriesList(pList);

      const artData = artJson.data || artJson;
      setArticulo(artData);

      setEditFormData({
        descripcion: artData.descripcion || '',
        marca_id: artData.marca_id || (bList.length > 0 ? bList[0].id : ''),
        modelo: artData.modelo || 'Estándar',
        categoria_id: artData.categoria_id || (cList.length > 0 ? cList[0].id : ''),
        pais_origen: artData.pais_origen || artData.pais_origen_id || (pList.length > 0 ? pList[0].id : ''),
        codigo_ean13: artData.codigo_ean13 || '',
        precio_actual: artData.precio_actual ?? 0,
      });

      const rawDepositos = stockJson.data?.depositos || stockJson.depositos || stockJson.data?.desglose || [];
      const totalStock =
        stockJson.data?.stock_total ??
        stockJson.data?.stock_consolidado ??
        stockJson.total ??
        rawDepositos.reduce((acc, d) => acc + (Number(d.stock_actual || d.cantidad) || 0), 0);

      setStockInfo({
        consolidado: totalStock,
        depositos: rawDepositos,
      });

      if (rawDepositos.length > 0 && rawDepositos[0].stock_minimo !== undefined) {
        setStockMin(rawDepositos[0].stock_minimo);
        setStockMax(rawDepositos[0].stock_maximo);
      }

      setHistorialMovimientos(histJson.data || []);

      const deps = depJson.data || [];
      setDepositosDisponibles(deps);
      if (deps.length >= 2) {
        setTransferData((prev) => ({
          ...prev,
          origen_id: deps[0].id,
          destino_id: deps[1].id,
        }));
      }
    } catch (err) {
      console.error('Error cargando detalle del producto:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [articuloId, isOpen]);

  useEffect(() => {
    loadProductDetails();
  }, [loadProductDetails]);

  const handleOpenEditModal = () => {
    if (!articulo) return;
    setEditFormData({
      descripcion: articulo.descripcion || '',
      marca_id: articulo.marca_id || (brandsList.length > 0 ? brandsList[0].id : ''),
      modelo: articulo.modelo || 'Estándar',
      categoria_id: articulo.categoria_id || (categoriesList.length > 0 ? categoriesList[0].id : ''),
      pais_origen: articulo.pais_origen || articulo.pais_origen_id || (countriesList.length > 0 ? countriesList[0].id : ''),
      codigo_ean13: articulo.codigo_ean13 || '',
      precio_actual: articulo.precio_actual ?? 0,
    });
    setIsEditModalOpen(true);
  };

  const handlePreSaveEdit = (e) => {
    e.preventDefault();

    if (!editFormData.descripcion || !editFormData.descripcion.trim()) {
      alert('La descripción / nombre comercial es obligatoria.');
      return;
    }
    if (!editFormData.codigo_ean13 || editFormData.codigo_ean13.trim().length !== 13) {
      alert('El código EAN-13 es obligatorio y debe tener exactamente 13 dígitos numéricos.');
      return;
    }
    if (!editFormData.marca_id) {
      alert('Debe seleccionar una marca obligatoriamente.');
      return;
    }
    if (!editFormData.categoria_id) {
      alert('Debe seleccionar una categoría obligatoriamente.');
      return;
    }
    if (!editFormData.pais_origen) {
      alert('Debe seleccionar un país de origen obligatoriamente.');
      return;
    }
    if (editFormData.precio_actual === '' || Number(editFormData.precio_actual) < 0) {
      alert('Debe ingresar un precio de venta válido mayor o igual a 0.');
      return;
    }

    setIsConfirmEditOpen(true);
  };

  const handleConfirmExecuteEdit = async () => {
    try {
      const codigoInternoActual = articulo?.codigo_interno || (articulo?.id ? String(articulo.id).substring(0, 8) : 'S/C');

      const payload = {
        descripcion: editFormData.descripcion.trim(),
        marca_id: editFormData.marca_id,
        modelo: editFormData.modelo && editFormData.modelo.trim() !== '' ? editFormData.modelo.trim() : 'Estándar',
        categoria_id: editFormData.categoria_id,
        pais_origen: editFormData.pais_origen,
        pais_origen_id: editFormData.pais_origen,
        codigo_ean13: editFormData.codigo_ean13.trim(),
        precio_actual: Number(editFormData.precio_actual) || 0,
        precio: Number(editFormData.precio_actual) || 0,
        codigo_interno: codigoInternoActual,
        usuario_id: TEMP_USER_ID,
      };

      const res = await fetch(`http://localhost:3001/api/articles/${articuloId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.message || 'Error al actualizar el producto');

      setIsConfirmEditOpen(false);
      setIsEditModalOpen(false);
      showConfirm('Producto modificado correctamente en la base de datos.');
      loadProductDetails();
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Error en edición:', err);
      alert(`Error guardando cambios: ${err.message}`);
    }
  };

  const handleConfirmTransfer = async (e) => {
    e.preventDefault();
    if (transferData.origen_id === transferData.destino_id) {
      alert('El depósito de origen y destino no pueden ser iguales.');
      return;
    }

    try {
      const res = await fetch('http://localhost:3001/api/stock/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articulo_id: articuloId,
          deposito_origen_id: transferData.origen_id,
          deposito_destino_id: transferData.destino_id,
          cantidad: Number(transferData.cantidad),
          motivo: transferData.motivo,
          usuario_id: TEMP_USER_ID,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error al ejecutar transferencia');

      setIsTransferOpen(false);
      showConfirm('Transferencia realizada correctamente.');
      loadProductDetails();
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(`Error en la transferencia: ${err.message}`);
    }
  };

  const handleSaveStockConfig = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:3001/api/stock/policies/${articuloId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stock_minimo: Number(stockMin),
          stock_maximo: Number(stockMax),
          deposito_id: selectedDepositoPolitica === 'TODOS' ? null : selectedDepositoPolitica,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error al actualizar políticas');

      showConfirm('Políticas de stock mínimo y máximo actualizadas.');
      loadProductDetails();
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  if (!isOpen) return null;

  const resolvedBrand =
    articulo?.marca_nombre || articulo?.marca || brandsList.find((b) => b.id === articulo?.marca_id)?.nombre || '';
  const resolvedCategory =
    articulo?.categoria_nombre ||
    articulo?.categoria ||
    categoriesList.find((c) => c.id === articulo?.categoria_id)?.nombre ||
    'Instrumentos';

  const productCommercialTitle =
    [resolvedBrand, articulo?.modelo].filter(Boolean).join(' ') || articulo?.descripcion || 'Artículo';
  const codigoInterno = articulo?.codigo_interno || (articulo?.id ? String(articulo.id).substring(0, 8) : 'S/C');
  const precioFormateado = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(articulo?.precio_actual || 0);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`${productCommercialTitle} (${codigoInterno})`}
        footer={
          <button className="btn btn-outline" onClick={onClose}>
            Cerrar
          </button>
        }
      >
        {loading && (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--gray-500)' }}>
            Cargando datos del producto...
          </div>
        )}

        {error && (
          <div style={{ padding: '20px', color: 'var(--red)', textAlign: 'center' }}>
            Error: {error}
          </div>
        )}

        {!loading && !error && articulo && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
            {confirmBanner && (
              <div className="confirm-banner" style={{ margin: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                <span>{confirmBanner}</span>
              </div>
            )}

            {/* BANNER VISUAL CON FOTO AUTOMÁTICA */}
            <div style={{
              width: '100%',
              height: '180px',
              background: 'var(--gray-100)',
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--gray-200)',
            }}>
              <AutoProductImage
                query={`${resolvedBrand} ${articulo.modelo || articulo.descripcion}`.trim()}
                alt={productCommercialTitle}
              />
            </div>

            {/* ENCABEZADO Y PRECIO */}
            <div style={{ borderBottom: '1px solid var(--gray-200)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {resolvedCategory}
                  </span>
                  <h2 style={{ margin: '3px 0 6px 0', fontSize: '19px', fontWeight: '700', color: 'var(--gray-900)' }}>
                    {productCommercialTitle}
                  </h2>
                  <div style={{ fontSize: '12.5px', color: 'var(--gray-600)', lineHeight: '1.4' }}>
                    Marca: <strong style={{ color: 'var(--gray-800)' }}>{resolvedBrand || 'Sin especificar'}</strong>
                    {articulo.modelo ? <> · Modelo: <strong style={{ color: 'var(--gray-800)' }}>{articulo.modelo}</strong></> : null}
                    {' · '}EAN-13: <strong style={{ color: 'var(--gray-800)' }}>{articulo.codigo_ean13 || 'S/EAN'}</strong>
                  </div>
                </div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--gray-900)', whiteSpace: 'nowrap' }}>
                  {precioFormateado}
                </div>
              </div>

              {articulo.descripcion && articulo.descripcion !== productCommercialTitle && (
                <div style={{ marginTop: '10px', fontSize: '12.5px', color: 'var(--gray-700)', background: 'var(--gray-50)', padding: '8px 12px', borderRadius: '6px', borderLeft: '3px solid var(--red)' }}>
                  {articulo.descripcion}
                </div>
              )}
            </div>

            {/* KPIS Y BOTONES */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--gray-500)', textTransform: 'uppercase', fontWeight: '600' }}>Consolidado</div>
                  <div style={{ fontSize: '17px', fontWeight: '700', color: 'var(--gray-900)' }}>{stockInfo.consolidado} uds.</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--gray-500)', textTransform: 'uppercase', fontWeight: '600' }}>Umbrales (Mín / Máx)</div>
                  <div style={{ fontSize: '17px', fontWeight: '700', color: 'var(--gray-900)' }}>{stockMin} / {stockMax}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className="btn btn-outline" style={{ fontSize: '12px', padding: '6px 10px' }} onClick={handleOpenEditModal}>
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '13px', height: '13px', marginRight: '4px' }}>
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Editar producto
                </button>
                <button className="btn btn-outline" style={{ fontSize: '12px', padding: '6px 10px' }} onClick={() => setIsTransferOpen(true)}>
                  Transferir stock
                </button>
              </div>
            </div>

            {/* EXISTENCIAS POR DEPÓSITO */}
            <div style={{ background: 'var(--gray-50)', borderRadius: '8px', padding: '12px 14px', border: '1px solid var(--gray-200)' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '12.5px', color: 'var(--gray-800)', fontWeight: '600' }}>Existencias por Depósito</h4>
              {stockInfo.depositos.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>No se registran existencias vinculadas en este momento.</div>
              ) : (
                <div className="compare-bars">
                  {stockInfo.depositos.map((dep, idx) => {
                    const stockVal = Number(dep.stock_actual ?? dep.cantidad) || 0;
                    const depNombre = dep.deposito_nombre || dep.nombre || 'Depósito';
                    const percent = stockInfo.consolidado > 0 ? Math.round((stockVal / stockInfo.consolidado) * 100) : 0;
                    return (
                      <div className="compare-bar-row" key={dep.deposito_id || idx} style={{ marginBottom: '6px' }}>
                        <span className="compare-bar-label" style={{ fontSize: '12px', minWidth: '110px' }}>{depNombre}</span>
                        <div className="compare-bar-track" style={{ height: '8px', flex: 1 }}>
                          <div className={`compare-bar-fill ${idx % 2 === 1 ? 'alt' : ''}`} style={{ width: `${percent}%` }}></div>
                        </div>
                        <span className="compare-bar-value" style={{ fontSize: '12px', minWidth: '75px', textAlign: 'right' }}>{stockVal} uds. ({percent}%)</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* POLÍTICAS DE STOCK MÍNIMO / MÁXIMO */}
            <form onSubmit={handleSaveStockConfig} style={{ border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '14px', background: '#fff', boxSizing: 'border-box' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--gray-800)', fontWeight: '600' }}>
                Políticas de Stock Mínimo / Máximo
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '12px', alignItems: 'start' }}>
                <div className="form-field" style={{ margin: 0 }}>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--gray-600)', marginBottom: '5px', display: 'block' }}>
                    Mínimo *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={stockMin}
                    onChange={(e) => setStockMin(Number(e.target.value))}
                    style={{ width: '100%', height: '38px', padding: '0 10px', boxSizing: 'border-box', fontSize: '13px' }}
                  />
                </div>

                <div className="form-field" style={{ margin: 0 }}>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--gray-600)', marginBottom: '5px', display: 'block' }}>
                    Máximo *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={stockMax}
                    onChange={(e) => setStockMax(Number(e.target.value))}
                    style={{ width: '100%', height: '38px', padding: '0 10px', boxSizing: 'border-box', fontSize: '13px' }}
                  />
                </div>

                <div className="form-field" style={{ margin: 0 }}>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--gray-600)', marginBottom: '5px', display: 'block' }}>
                    Alcance
                  </label>
                  <select
                    value={selectedDepositoPolitica}
                    onChange={(e) => setSelectedDepositoPolitica(e.target.value)}
                    style={{ width: '100%', height: '38px', padding: '0 10px', boxSizing: 'border-box', fontSize: '13px', lineHeight: '38px' }}
                  >
                    <option value="TODOS">Consolidado (Todos)</option>
                    {depositosDisponibles.map((d) => (
                      <option key={d.id} value={d.id}>{d.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" type="submit" style={{ fontSize: '12.5px', padding: '8px 18px', height: 'auto' }}>
                  Guardar políticas
                </button>
              </div>
            </form>

            {/* HISTORIAL RECIENTE */}
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '12.5px', color: 'var(--gray-800)', fontWeight: '600' }}>Últimos Movimientos Registrados</h4>
              <div style={{ maxHeight: '130px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {historialMovimientos.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--gray-500)', padding: '6px 0' }}>Sin movimientos registrados para este artículo.</div>
                ) : (
                  historialMovimientos.slice(0, 5).map((m, idx) => (
                    <div key={m.id || idx} style={{ fontSize: '12px', padding: '6px 10px', background: 'var(--gray-50)', borderRadius: '4px', display: 'flex', justifyContent: 'space-between' }}>
                      <span><strong>{m.tipo}</strong>: {m.motivo || 'Operación'}</span>
                      <span style={{ color: 'var(--gray-600)' }}>{m.fecha || m.fecha_hora_registro}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL EDITAR PRODUCTO */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Editar datos maestros (${codigoInterno})`}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setIsEditModalOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handlePreSaveEdit}>Guardar cambios</button>
          </>
        }
      >
        <form onSubmit={handlePreSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '12px', color: 'var(--gray-600)', background: 'var(--gray-50)', padding: '8px 12px', borderRadius: '6px', borderLeft: '3px solid var(--gray-400)' }}>
            El <strong>Código Interno</strong> y las <strong>Cantidades de Stock</strong> están protegidos y no pueden alterarse desde este formulario.
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div className="form-field" style={{ flex: '1 1 180px' }}>
              <label>Código Interno</label>
              <input type="text" disabled value={codigoInterno} style={{ background: 'var(--gray-100)', cursor: 'not-allowed' }} />
            </div>
            <div className="form-field" style={{ flex: '1 1 180px' }}>
              <label>Código EAN-13 *</label>
              <input
                type="text"
                maxLength={13}
                required
                value={editFormData.codigo_ean13}
                onChange={(e) => setEditFormData({ ...editFormData, codigo_ean13: e.target.value })}
              />
            </div>
          </div>

          <div className="form-field" style={{ width: '100%' }}>
            <label>Descripción / Nombre comercial *</label>
            <input
              type="text"
              required
              value={editFormData.descripcion}
              onChange={(e) => setEditFormData({ ...editFormData, descripcion: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div className="form-field" style={{ flex: '1 1 180px' }}>
              <label>Marca *</label>
              <select
                required
                value={editFormData.marca_id}
                onChange={(e) => setEditFormData({ ...editFormData, marca_id: e.target.value })}
              >
                {brandsList.map((b) => (
                  <option key={b.id} value={b.id}>{b.nombre}</option>
                ))}
              </select>
            </div>
            <div className="form-field" style={{ flex: '1 1 180px' }}>
              <label>Modelo *</label>
              <input
                type="text"
                required
                value={editFormData.modelo}
                onChange={(e) => setEditFormData({ ...editFormData, modelo: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div className="form-field" style={{ flex: '1 1 180px' }}>
              <label>Categoría *</label>
              <select
                required
                value={editFormData.categoria_id}
                onChange={(e) => setEditFormData({ ...editFormData, categoria_id: e.target.value })}
              >
                {categoriesList.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div className="form-field" style={{ flex: '1 1 180px' }}>
              <label>País de Origen *</label>
              <select
                required
                value={editFormData.pais_origen}
                onChange={(e) => setEditFormData({ ...editFormData, pais_origen: e.target.value })}
              >
                {countriesList.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-field" style={{ width: '100%' }}>
            <label>Precio de Venta ($ ARS) *</label>
            <input
              type="number"
              min="0"
              required
              value={editFormData.precio_actual}
              onChange={(e) => setEditFormData({ ...editFormData, precio_actual: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* CONFIRMACIÓN DE EDICIÓN */}
      <Modal
        isOpen={isConfirmEditOpen}
        onClose={() => setIsConfirmEditOpen(false)}
        title="¿Confirmar modificación?"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setIsConfirmEditOpen(false)}>
              Volver a editar
            </button>
            <button className="btn btn-primary" onClick={handleConfirmExecuteEdit}>
              Sí, guardar cambios
            </button>
          </>
        }
      >
        <div style={{ padding: '6px 0' }}>
          <p style={{ fontSize: '13.5px', color: 'var(--gray-800)', lineHeight: '1.6', marginBottom: '12px' }}>
            ¿Confirmás la actualización de los datos para <strong>{editFormData.descripcion}</strong>?
          </p>
          <ul style={{ fontSize: '12px', color: 'var(--gray-600)', lineHeight: '1.5', paddingLeft: '18px' }}>
            <li>Los datos maestros se guardarán en la base de datos inmediatamente.</li>
            <li>Si hubo cambio de precio, se registrará el valor anterior en el historial de auditoría.</li>
          </ul>
        </div>
      </Modal>

      {/* SUB-MODAL TRANSFERENCIA */}
      <Modal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        title="Transferir Stock"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setIsTransferOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleConfirmTransfer}>Confirmar</button>
          </>
        }
      >
        <form onSubmit={handleConfirmTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div className="form-field" style={{ flex: '1 1 180px' }}>
              <label>Origen</label>
              <select value={transferData.origen_id} onChange={(e) => setTransferData({ ...transferData, origen_id: e.target.value })}>
                {depositosDisponibles.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
              </select>
            </div>
            <div className="form-field" style={{ flex: '1 1 180px' }}>
              <label>Destino</label>
              <select value={transferData.destino_id} onChange={(e) => setTransferData({ ...transferData, destino_id: e.target.value })}>
                {depositosDisponibles.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div className="form-field" style={{ flex: '1 1 120px' }}>
              <label>Cantidad</label>
              <input type="number" min="1" required value={transferData.cantidad} onChange={(e) => setTransferData({ ...transferData, cantidad: Number(e.target.value) })} />
            </div>
            <div className="form-field" style={{ flex: '2 1 200px' }}>
              <label>Motivo</label>
              <input type="text" value={transferData.motivo} onChange={(e) => setTransferData({ ...transferData, motivo: e.target.value })} />
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}

export default Detalle_producto;