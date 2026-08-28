import { useState, useMemo, useEffect } from 'react';
import Modal from '../components/Modal';
import Detalle_producto from './Detalle_producto';

// Caché en memoria para evitar repetición de peticiones
const imageMemoryCache = new Map();

// Componente de Búsqueda Automática de Imágenes (MediaWiki Action API)
function AutoProductImage({ brand, model, description, category, query, alt, style }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const junkWords = ['sin especificar', 'estándar', 'estandar', 's/ean', 's/c', 'n/a', 'null', 'undefined', 'todas', 'articulo'];

    const cleanWord = (text) => {
      if (!text) return '';
      const t = String(text).trim();
      return junkWords.includes(t.toLowerCase()) ? '' : t;
    };

    const b = cleanWord(brand);
    const m = cleanWord(model);
    const d = cleanWord(description);
    const c = cleanWord(category);

    let searchTerms = [];
    if (query) {
      searchTerms.push(query.replace(/sin especificar|estándar|estandar|s\/c/gi, '').trim());
    } else {
      if (b && m) searchTerms.push(`${b} ${m}`);
      if (b) searchTerms.push(`${b} instrument`);
      if (d) searchTerms.push(d);
      if (c) searchTerms.push(c);
      searchTerms.push('musical instrument');
    }

    const primaryTerm = searchTerms[0] || 'musical instrument';

    if (imageMemoryCache.has(primaryTerm)) {
      setImageUrl(imageMemoryCache.get(primaryTerm));
      setLoading(false);
      return;
    }

    const cachedStorage = sessionStorage.getItem(`img_cache_${primaryTerm}`);
    if (cachedStorage) {
      imageMemoryCache.set(primaryTerm, cachedStorage);
      setImageUrl(cachedStorage);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setHasError(false);

    const fetchImage = async () => {
      try {
        let foundImage = null;

        for (const term of searchTerms) {
          if (!term || term.length < 2) continue;

          const endpoint = `https://en.wikipedia.org/w/api.php?action=query&origin=*&format=json&generator=search&gsrsearch=${encodeURIComponent(
            term
          )}&gsrlimit=1&prop=pageimages&pithumbsize=600`;

          const res = await fetch(endpoint);
          if (!res.ok) continue;

          const data = await res.json();
          if (data?.query?.pages) {
            const pages = data.query.pages;
            const firstPageKey = Object.keys(pages)[0];
            const src = pages[firstPageKey]?.thumbnail?.source;
            if (src) {
              foundImage = src;
              break;
            }
          }
        }

        if (isMounted) {
          if (foundImage) {
            imageMemoryCache.set(primaryTerm, foundImage);
            sessionStorage.setItem(`img_cache_${primaryTerm}`, foundImage);
            setImageUrl(foundImage);
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
  }, [brand, model, description, category, query]);

  if (hasError || !imageUrl) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: '54px', height: '54px', stroke: 'var(--gray-700)', ...style }}
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
      alt={alt || 'Instrumento'}
      onError={() => setHasError(true)}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        opacity: loading ? 0 : 1,
        transition: 'opacity 0.25s ease',
        ...style,
      }}
    />
  );
}

// Componente de Stock Dinámico por Depósito
const ProductStock = ({ articuloId }) => {
  const [stockData, setStockData] = useState({ consolidado: '-', desglose: [] });

  useEffect(() => {
    fetch(`http://localhost:3001/api/stock/${articuloId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.data) {
          const rawDesglose = data.data.desglose || data.data.depositos || [];
          const totalConsol =
            data.data.stock_consolidado ??
            data.data.stock_total ??
            data.data.total ??
            rawDesglose.reduce((acc, d) => acc + (Number(d.stock_actual || d.cantidad) || 0), 0);

          setStockData({
            consolidado: totalConsol,
            desglose: rawDesglose,
          });
        }
      })
      .catch((err) => console.error('Error fetching stock:', err));
  }, [articuloId]);

  return (
    <div className="product-stock-split">
      {stockData.desglose.length === 0 ? (
        <span>Consol.: <b>{stockData.consolidado}</b></span>
      ) : (
        <>
          {stockData.desglose.map((d, index) => (
            <span key={d.deposito_id || d.id || index}>
              {d.deposito_nombre || d.nombre || 'Depósito'}: <b>{d.stock_actual ?? d.cantidad ?? 0}</b>
              {index < stockData.desglose.length - 1 ? ' · ' : ''}
            </span>
          ))}
          <span> · </span>
          <span>Consol.: <b>{stockData.consolidado}</b></span>
        </>
      )}
    </div>
  );
};

function Catalogo_de_productos() {
  // Datos maestros dinámicos
  const [formCategories, setFormCategories] = useState([]);
  const [formCountries, setFormCountries] = useState([]);
  const [formBrands, setFormBrands] = useState([]);

  // Estados del listado
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('Todas');
  const [lifecycleFilter, setLifecycleFilter] = useState('activos');
  const [sortBy, setSortBy] = useState('relevantes');
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [viewMode, setViewMode] = useState('grid');

  // Modal Detalle
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState(null);

  // Toast
  const [confirmToast, setConfirmToast] = useState(null);

  // Modales Altas / Bajas
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    category: '',
    description: '',
    brand: '',
    model: '',
    ean: '',
    price: '',
    originCountry: '',
  });

  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [productToDeactivate, setProductToDeactivate] = useState(null);

  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false);
  const [productToReactivate, setProductToReactivate] = useState(null);

  // Carga de categorías, marcas y países desde la BD
  useEffect(() => {
    fetch('http://localhost:3001/api/categories')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.data) setFormCategories(data.data);
      })
      .catch((err) => console.error('Error fetching categories:', err));

    fetch('http://localhost:3001/api/countries')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.data) setFormCountries(data.data);
      })
      .catch((err) => console.error('Error fetching countries:', err));

    fetch('http://localhost:3001/api/brands')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.data) setFormBrands(data.data);
      })
      .catch((err) => console.error('Error fetching brands:', err));
  }, []);

  // Carga de artículos
  const fetchArticles = () => {
    let endpoint = 'http://localhost:3001/api/articles';
    if (lifecycleFilter === 'bajas') endpoint = 'http://localhost:3001/api/articles/inactivos';
    else if (lifecycleFilter === 'todos') endpoint = 'http://localhost:3001/api/articles/todos';

    fetch(endpoint)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.data) setProducts(data.data);
      })
      .catch((err) => console.error('Error fetching articles:', err));
  };

  useEffect(() => {
    fetchArticles();
  }, [lifecycleFilter]);

  // Validación de EAN-13
  const eanValidation = useMemo(() => {
    const val = newProduct.ean.trim();
    if (val.length === 0) return { state: 'empty' };
    const isNumeric = /^[0-9]+$/.test(val);
    if (val.length !== 13 || !isNumeric) {
      return { state: 'invalid', message: 'El código EAN-13 debe tener exactamente 13 dígitos numéricos.' };
    }
    const isDuplicate = products.some((p) => p.codigo_ean13 === val || p.ean === val);
    if (isDuplicate) {
      return { state: 'duplicate', message: 'Este EAN-13 ya se encuentra registrado en el catálogo.' };
    }
    return { state: 'valid', message: 'Código EAN-13 válido y disponible.' };
  }, [newProduct.ean, products]);

  const getCategoryName = (id) => {
    const cat = formCategories.find((c) => c.id === id);
    return cat ? cat.nombre : 'Sin categoría';
  };

  const getBrandName = (id) => {
    const brand = formBrands.find((b) => b.id === id);
    return brand ? brand.nombre : 'Sin marca';
  };

  // Filtrado y ordenamiento reactivo
  const filteredProducts = useMemo(() => {
    return products
      .filter((item) => {
        const matchesCategory = activeCategory === 'Todas' || item.categoria_id === activeCategory;
        const matchesBrand = selectedBrand === 'Todas' || item.marca_id === selectedBrand;
        const matchesLifecycle =
          lifecycleFilter === 'todos' ||
          (lifecycleFilter === 'activos' && item.estado) ||
          (lifecycleFilter === 'bajas' && !item.estado);

        const brandName = getBrandName(item.marca_id).toLowerCase();
        const categoryName = getCategoryName(item.categoria_id).toLowerCase();

        const matchesSearch =
          (item.descripcion && item.descripcion.toLowerCase().includes(searchTerm.toLowerCase())) ||
          brandName.includes(searchTerm.toLowerCase()) ||
          categoryName.includes(searchTerm.toLowerCase()) ||
          (item.modelo && item.modelo.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (item.codigo_interno && String(item.codigo_interno).toLowerCase().includes(searchTerm.toLowerCase())) ||
          (item.codigo_ean13 && String(item.codigo_ean13).includes(searchTerm));

        return matchesCategory && matchesBrand && matchesLifecycle && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.precio_actual - b.precio_actual;
        if (sortBy === 'price-desc') return b.precio_actual - a.precio_actual;
        return String(a.id).localeCompare(String(b.id));
      });
  }, [products, searchTerm, selectedBrand, lifecycleFilter, sortBy, activeCategory, formBrands, formCategories]);

  const showToast = (message) => {
    setConfirmToast(message);
    setTimeout(() => setConfirmToast(null), 4000);
  };

  const handleOpenDetailModal = (articuloId) => {
    setSelectedArticleId(articuloId);
    setIsDetailModalOpen(true);
  };

  // Crear producto
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.category || !newProduct.originCountry || !newProduct.brand || !newProduct.description.trim() || eanValidation.state !== 'valid') {
      return;
    }

    try {
      const payload = {
        descripcion: newProduct.description.trim(),
        codigo_ean13: newProduct.ean.trim(),
        categoria_id: newProduct.category,
        marca_id: newProduct.brand,
        pais_origen: newProduct.originCountry,
        precio_actual: Number(String(newProduct.price).replace(/[^0-9]/g, '')) || 0,
        modelo: newProduct.model ? newProduct.model.trim() : 'Estándar',
      };

      const response = await fetch('http://localhost:3001/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Error al guardar el producto');
      }

      setIsNewModalOpen(false);
      showToast('Producto guardado correctamente en el catálogo.');
      fetchArticles();

      setNewProduct({
        category: '',
        description: '',
        brand: '',
        model: '',
        ean: '',
        price: '',
        originCountry: '',
      });
    } catch (error) {
      alert(error.message);
    }
  };

  // Dar de baja (Soft Delete)
  const handleConfirmDeactivate = async () => {
    if (!productToDeactivate) return;

    try {
      const response = await fetch(`http://localhost:3001/api/articles/${productToDeactivate.id}/status`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al dar de baja el producto');
      }

      setProducts(products.map((p) => (p.id === productToDeactivate.id ? { ...p, estado: false } : p)));
      setIsDeactivateModalOpen(false);
      showToast(`El producto "${getBrandName(productToDeactivate.marca_id)} ${productToDeactivate.modelo || ''}" fue dado de baja.`);
      setProductToDeactivate(null);
    } catch (error) {
      alert(error.message);
    }
  };

  // Reactivar producto
  const handleConfirmReactivate = async () => {
    if (!productToReactivate) return;

    try {
      const response = await fetch(`http://localhost:3001/api/articles/${productToReactivate.id}/reactivate`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al reactivar el producto');
      }

      setProducts(products.map((p) => (p.id === productToReactivate.id ? { ...p, estado: true } : p)));
      setIsReactivateModalOpen(false);
      showToast(`El producto "${getBrandName(productToReactivate.marca_id)} ${productToReactivate.modelo || ''}" fue reactivado en el catálogo activo.`);
      setProductToReactivate(null);
    } catch (error) {
      alert(error.message);
    }
  };

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
          <h2>Catálogo centralizado de productos</h2>
          <span className="desc">
            Base maestra de productos — {filteredProducts.length} registros ({lifecycleFilter === 'activos' ? 'activos' : lifecycleFilter === 'bajas' ? 'dados de baja' : 'totales'})
          </span>
        </div>
        <button className="btn btn-primary" onClick={() => setIsNewModalOpen(true)}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nuevo producto
        </button>
      </div>

      {/* TOOLBAR */}
      <div className="catalog-toolbar">
        <div className="search-input">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nombre, marca, categoría, modelo o EAN-13…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* FILTRO DE ESTADO */}
        <div className="select-field">
          Catálogo:
          <select value={lifecycleFilter} onChange={(e) => setLifecycleFilter(e.target.value)}>
            <option value="activos">Productos Activos</option>
            <option value="bajas">Dados de baja</option>
            <option value="todos">Todos los registros</option>
          </select>
        </div>

        {/* FILTRO DE MARCAS DINÁMICO */}
        <div className="select-field">
          Marca:
          <select value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)}>
            <option value="Todas">Todas las marcas</option>
            {formBrands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* ORDENAMIENTO */}
        <div className="select-field">
          Ordenar:
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="relevantes">Más recientes</option>
            <option value="price-asc">Precio: menor a mayor</option>
            <option value="price-desc">Precio: mayor a menor</option>
          </select>
        </div>

        {/* TOGGLE VISTA */}
        <div className="view-toggle">
          <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            Tarjetas
          </button>
          <button className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
            Tabla
          </button>
        </div>
      </div>

      {/* CATEGORY RAIL DINÁMICO (DESDE BD) */}
      <div className="category-rail">
        <button
          key="Todas"
          className={`category-chip ${activeCategory === 'Todas' ? 'active' : ''}`}
          onClick={() => setActiveCategory('Todas')}
        >
          Todas
        </button>
        {formCategories.map((cat) => (
          <button
            key={cat.id}
            className={`category-chip ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.nombre}
          </button>
        ))}
      </div>

      {/* VISTA EN TARJETAS (GRID) */}
      {viewMode === 'grid' && (
        <div className="product-grid">
          {filteredProducts.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '36px', textAlign: 'center', color: 'var(--gray-500)' }}>
              No se encontraron productos para los filtros seleccionados.
            </div>
          ) : (
            filteredProducts.map((prod) => {
              const brandText = getBrandName(prod.marca_id);
              const categoryText = getCategoryName(prod.categoria_id);

              return (
                <div className="product-card" key={prod.id} style={{ opacity: prod.estado ? 1 : 0.72 }}>
                  <div className="product-thumb">
                    <span className="thumb-tag">{categoryText}</span>
                    <span className="thumb-code">{prod.codigo_interno}</span>
                    <AutoProductImage
                      brand={brandText}
                      model={prod.modelo}
                      description={prod.descripcion}
                      category={categoryText}
                      alt={prod.descripcion}
                    />
                  </div>

                  <div className="product-body">
                    <span className="product-brand">{brandText}</span>
                    <h3 className="product-name">{brandText} {prod.modelo || prod.descripcion}</h3>
                    <span className="product-model">Modelo {prod.modelo || 'Estándar'} · EAN {prod.codigo_ean13}</span>

                    <div className="product-meta-row">
                      <span className="product-price">${Number(prod.precio_actual).toLocaleString('es-AR')}</span>
                      <span className={`badge ${prod.estado ? 'badge-green' : 'badge-amber'}`}>
                        <span className="badge-dot"></span>
                        {prod.estado ? 'Activo' : 'Baja'}
                      </span>
                    </div>

                    <ProductStock articuloId={prod.id} />

                    <div className="product-card-actions">
                      <button className="btn btn-outline" onClick={() => handleOpenDetailModal(prod.id)}>
                        Ver detalle
                      </button>

                      {prod.estado ? (
                        <button
                          className="icon-btn btn-icon-only"
                          title="Dar de baja producto"
                          onClick={() => {
                            setProductToDeactivate(prod);
                            setIsDeactivateModalOpen(true);
                          }}
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
                          title="Reactivar producto en catálogo activo"
                          onClick={() => {
                            setProductToReactivate(prod);
                            setIsReactivateModalOpen(true);
                          }}
                        >
                          Reactivar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VISTA EN TABLA */}
      {viewMode === 'table' && (
        <div className="table-panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Código interno</th>
                  <th>Descripción / Nombre</th>
                  <th>Marca</th>
                  <th>Modelo</th>
                  <th>EAN-13</th>
                  <th>Categoría</th>
                  <th>Precio actual</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-500)' }}>
                      No se encontraron productos registrados bajo estos filtros.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((prod) => (
                    <tr key={prod.id} style={{ opacity: prod.estado ? 1 : 0.65 }}>
                      <td className="cell-mono">{prod.codigo_interno}</td>
                      <td className="cell-strong">{prod.descripcion}</td>
                      <td>{getBrandName(prod.marca_id)}</td>
                      <td>{prod.modelo || '-'}</td>
                      <td className="cell-mono">{prod.codigo_ean13}</td>
                      <td>{getCategoryName(prod.categoria_id)}</td>
                      <td className="cell-strong">${Number(prod.precio_actual).toLocaleString('es-AR')}</td>
                      <td>
                        <span className={`badge ${prod.estado ? 'badge-green' : 'badge-amber'}`}>
                          <span className="badge-dot"></span>
                          {prod.estado ? 'Activo' : 'Baja'}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-btn"
                            title="Ver detalle"
                            onClick={() => handleOpenDetailModal(prod.id)}
                          >
                            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>

                          {prod.estado ? (
                            <button
                              className="icon-btn"
                              title="Dar de baja producto"
                              onClick={() => {
                                setProductToDeactivate(prod);
                                setIsDeactivateModalOpen(true);
                              }}
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
                              onClick={() => {
                                setProductToReactivate(prod);
                                setIsReactivateModalOpen(true);
                              }}
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
        </div>
      )}

      {/* MODAL DETALLE DE PRODUCTO */}
      <Detalle_producto
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        articuloId={selectedArticleId}
        onUpdate={() => {
          fetchArticles();
        }}
      />

      {/* MODAL NUEVO PRODUCTO */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Nuevo producto"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setIsNewModalOpen(false)}>
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              disabled={eanValidation.state !== 'valid'}
              onClick={handleCreateProduct}
            >
              Guardar producto
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateProduct}>
          <div className="modal-notice">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            Los campos marcados con <strong>*</strong> son obligatorios.
          </div>

          <div className="form-row">
            <div className="form-field full">
              <label>Categoría<span className="req">*</span></label>
              <select
                required
                value={newProduct.category}
                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
              >
                <option value="">Seleccione una categoría</option>
                {formCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field full">
              <label>Descripción / Nombre comercial<span className="req">*</span></label>
              <input
                type="text"
                placeholder="Ej: Guitarra eléctrica Stratocaster Player Series…"
                required
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Marca<span className="req">*</span></label>
              <select
                required
                value={newProduct.brand}
                onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
              >
                <option value="">Seleccione una marca</option>
                {formBrands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Modelo</label>
              <input
                type="text"
                placeholder="Ej: Standard / Player"
                value={newProduct.model}
                onChange={(e) => setNewProduct({ ...newProduct, model: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>EAN-13 (13 dígitos)<span className="req">*</span></label>
              <input
                type="text"
                maxLength={13}
                placeholder="Ej: 7791234500017"
                required
                value={newProduct.ean}
                onChange={(e) => setNewProduct({ ...newProduct, ean: e.target.value })}
              />
              {eanValidation.state === 'invalid' && (
                <span className="field-error">{eanValidation.message}</span>
              )}
              {eanValidation.state === 'duplicate' && (
                <span className="field-error">{eanValidation.message}</span>
              )}
              {eanValidation.state === 'valid' && (
                <span className="field-success">{eanValidation.message}</span>
              )}
            </div>

            <div className="form-field">
              <label>Precio ($ ARS)<span className="req">*</span></label>
              <input
                type="number"
                min="0"
                placeholder="Ej: 650000"
                required
                value={newProduct.price}
                onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field full">
              <label>País de Origen<span className="req">*</span></label>
              <select
                required
                value={newProduct.originCountry}
                onChange={(e) => setNewProduct({ ...newProduct, originCountry: e.target.value })}
              >
                <option value="">Seleccione un país</option>
                {formCountries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAL DAR DE BAJA PRODUCTO */}
      <Modal
        isOpen={isDeactivateModalOpen}
        onClose={() => setIsDeactivateModalOpen(false)}
        title="Dar de baja producto"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setIsDeactivateModalOpen(false)}>
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              style={{ background: 'var(--amber)' }}
              onClick={handleConfirmDeactivate}
            >
              Confirmar baja
            </button>
          </>
        }
      >
        <div>
          <p style={{ fontSize: '13.5px', color: 'var(--gray-700)', lineHeight: '1.6', marginBottom: '14px' }}>
            ¿Confirmás que querés dar de baja a <strong>{getBrandName(productToDeactivate?.marca_id)} {productToDeactivate?.modelo || ''}</strong>?
          </p>
          <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '12px' }}>
            * Esta acción no borrará los movimientos históricos y podrás reactivar el producto en cualquier momento.
          </p>
        </div>
      </Modal>

      {/* MODAL REACTIVAR PRODUCTO */}
      <Modal
        isOpen={isReactivateModalOpen}
        onClose={() => setIsReactivateModalOpen(false)}
        title="Reactivar producto en catálogo"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setIsReactivateModalOpen(false)}>
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              style={{ background: 'var(--green)' }}
              onClick={handleConfirmReactivate}
            >
              Reactivar producto
            </button>
          </>
        }
      >
        <p style={{ fontSize: '13.5px', color: 'var(--gray-700)', lineHeight: '1.6' }}>
          ¿Deseás reactivar <strong>{getBrandName(productToReactivate?.marca_id)} {productToReactivate?.modelo || ''}</strong>? El producto volverá a estar disponible para movimientos y consultas en el catálogo activo.
        </p>
      </Modal>
    </div>
  );
}

export default Catalogo_de_productos;