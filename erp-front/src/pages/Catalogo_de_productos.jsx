import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';


const CATEGORIES = [
  'Todas', 'Guitarras eléctricas', 'Guitarras acústicas', 'Bajos', 'Teclados',
  'Pianos', 'Baterías', 'Percusión', 'Amplificadores', 'Micrófonos', 'Audio',
  'Accesorios', 'Instrumentos de viento'
];

const ProductStock = ({ articuloId }) => {
  const [stock, setStock] = useState({ central: '-', margalef: '-', consol: '-' });

  useEffect(() => {
    fetch(`http://localhost:3001/api/stock/${articuloId}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.data) {
          const { stock_consolidado, desglose } = data.data;
          const central = desglose?.find(d => d.deposito_id === 'bf975c47-946f-406c-bb0e-a41dbe656df4')?.cantidad ?? '-';
          const margalef = desglose?.find(d => d.deposito_id === '26ef85b3-71e1-419a-be45-896fad9b1cd2')?.cantidad ?? '-';
          setStock({
            central,
            margalef,
            consol: stock_consolidado ?? '-'
          });
        }
      })
      .catch(err => console.error("Error fetching stock:", err));
  }, [articuloId]);

  return (
    <div className="product-stock-split">
      <span>Central: <b>{stock.central}</b></span>
      <span>·</span>
      <span>Margalef: <b>{stock.margalef}</b></span>
      <span>·</span>
      <span>Consol.: <b>{stock.consol}</b></span>
    </div>
  );
};

function Catalogo_de_productos() {
  const navigate = useNavigate();

  const [formCategories, setFormCategories] = useState([]);
  const [formCountries, setFormCountries] = useState([]);
  const [formBrands, setFormBrands] = useState([]);
  
  useEffect(() => {
    fetch('http://localhost:3001/api/categories')
      .then(res => res.json())
      .then(data => {
        if (data && data.data) {
          setFormCategories(data.data);
        }
      })
      .catch(err => console.error("Error fetching categories:", err));

    fetch('http://localhost:3001/api/countries')
      .then(res => res.json())
      .then(data => {
        if (data && data.data) {
          setFormCountries(data.data);
        }
      })
      .catch(err => console.error("Error fetching countries:", err));

    fetch('http://localhost:3001/api/brands')
      .then(res => res.json())
      .then(data => {
        if (data && data.data) {
          setFormBrands(data.data);
        }
      })
      .catch(err => console.error("Error fetching brands:", err));

    fetch('http://localhost:3001/api/articles')
      .then(res => res.json())
      .then(data => {
        if (data && data.data) {
          setProducts(data.data);
        }
      })
      .catch(err => console.error("Error fetching articles:", err));
  }, []);

  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('Todas');
  const [selectedStatus, setSelectedStatus] = useState('Todas');
  const [lifecycleFilter, setLifecycleFilter] = useState('activos'); // 'activos' | 'bajas' | 'todos'
  const [sortBy, setSortBy] = useState('relevantes');
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Toast de confirmación
  const [confirmToast, setConfirmToast] = useState(null);

  // Modal Nuevo Producto
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    code: 'COD-0017',
    category: '',
    description: '',
    brand: '',
    model: '',
    ean: '',
    price: '',
    status: 'Normal',
    initialStock: 0,
    originCountry: ''
  });

  // Modal Dar de Baja
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [productToDeactivate, setProductToDeactivate] = useState(null);
  const [deactivateReason, setDeactivateReason] = useState('Discontinuado por el fabricante');

  // Modal Reactivar
  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false);
  const [productToReactivate, setProductToReactivate] = useState(null);

  // Validación de EAN-13
  const eanValidation = useMemo(() => {
    const val = newProduct.ean.trim();
    if (val.length === 0) return { state: 'empty' };
    const isNumeric = /^[0-9]+$/.test(val);
    if (val.length !== 13 || !isNumeric) return { state: 'invalid', message: 'El código EAN-13 no es válido (debe tener 13 dígitos numéricos).' };
    const isDuplicate = products.some(p => p.ean === val);
    if (isDuplicate) return { state: 'duplicate', message: 'Este EAN-13 ya se encuentra registrado en el catálogo.' };
    return { state: 'valid', message: 'Código EAN-13 válido y disponible.' };
  }, [newProduct.ean, products]);

  const getCategoryName = (id) => {
    const cat = formCategories.find(c => c.id === id);
    return cat ? cat.nombre : 'Sin categoría';
  };

  const getBrandName = (id) => {
    const brand = formBrands.find(b => b.id === id);
    return brand ? brand.nombre : 'Sin marca';
  };

  // Filtrado reactivo
  const filteredProducts = useMemo(() => {
    return products
      .filter((item) => {
        const matchesCategory = activeCategory === 'Todas' || item.categoria_id === activeCategory;
        const matchesBrand = selectedBrand === 'Todas' || item.marca_id === selectedBrand;
        const matchesStatus = selectedStatus === 'Todas' || item.status === selectedStatus; // We keep item.status or maybe it's not present, we will ignore for now
        const matchesLifecycle =
          lifecycleFilter === 'todos' ||
          (lifecycleFilter === 'activos' && item.estado) ||
          (lifecycleFilter === 'bajas' && !item.estado);

        const brandName = getBrandName(item.marca_id).toLowerCase();
        
        const matchesSearch =
          (item.descripcion && item.descripcion.toLowerCase().includes(searchTerm.toLowerCase())) ||
          brandName.includes(searchTerm.toLowerCase()) ||
          (item.codigo_interno && String(item.codigo_interno).toLowerCase().includes(searchTerm.toLowerCase())) ||
          (item.codigo_ean13 && String(item.codigo_ean13).includes(searchTerm));

        return matchesCategory && matchesBrand && matchesStatus && matchesLifecycle && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.precio_actual - b.precio_actual;
        if (sortBy === 'price-desc') return b.precio_actual - a.precio_actual;
        if (sortBy === 'stock') return 0;
        return String(a.id).localeCompare(String(b.id));
      });
  }, [products, searchTerm, selectedBrand, selectedStatus, lifecycleFilter, sortBy, activeCategory, formBrands, formCategories]);

  const showToast = (message) => {
    setConfirmToast(message);
    setTimeout(() => setConfirmToast(null), 4000);
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.category || !newProduct.originCountry || !newProduct.brand || !newProduct.description.trim() || eanValidation.state !== 'valid') return;

    try {
      const payload = {
        codigo_interno: newProduct.code,
        descripcion: newProduct.description,
        codigo_ean13: newProduct.ean,
        categoria_id: newProduct.category,
        marca_id: newProduct.brand,
        pais_origen: newProduct.originCountry,
        precio_actual: Number(String(newProduct.price).replace(/[^0-9]/g, '')) || 0,
        modelo: newProduct.model || null
      };

      const response = await fetch('http://localhost:3001/api/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar el producto');
      }

      const result = await response.json();
      const created = result.data;

      setProducts([created, ...products]);
      setIsNewModalOpen(false);
      showToast('Producto guardado correctamente en el catálogo.');

      setNewProduct({
        code: `COD-${String(products.length + 2).padStart(4, '0')}`,
        category: '',
        description: '',
        brand: '',
        model: '',
        ean: '',
        price: '',
        status: 'Normal',
        initialStock: 0,
        originCountry: ''
      });
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

  // Dar de baja (Soft Delete)
  const handleConfirmDeactivate = () => {
    if (!productToDeactivate) return;
    setProducts(products.map(p => p.id === productToDeactivate.id ? { ...p, estado: false } : p));
    setIsDeactivateModalOpen(false);
    showToast(`El producto "${productToDeactivate.descripcion}" fue dado de baja. Podés consultarlo o reactivarlo filtrando por "Dados de baja".`);
    setProductToDeactivate(null);
  };

  // Reactivar producto
  const handleConfirmReactivate = () => {
    if (!productToReactivate) return;
    setProducts(products.map(p => p.id === productToReactivate.id ? { ...p, estado: true } : p));
    setIsReactivateModalOpen(false);
    showToast(`El producto "${productToReactivate.descripcion}" fue reactivado en el catálogo activo.`);
    setProductToReactivate(null);
  };


  const getBadge = (prod) => {
    return <span className="badge badge-green"><span className="badge-dot"></span>Normal</span>;
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
            placeholder="Buscar por nombre, marca, código interno o EAN-13…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* FILTRO DE ESTADO OPERATIVO (ACTIVOS / BAJAS) */}
        <div className="select-field">
          Catálogo:
          <select value={lifecycleFilter} onChange={(e) => setLifecycleFilter(e.target.value)}>
            <option value="activos">Productos Activos</option>
            <option value="bajas">Dados de baja</option>
            <option value="todos">Todos los registros</option>
          </select>
        </div>

        <div className="select-field">
          Marca:
          <select value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)}>
            <option value="Todas">Todas</option>
            {formBrands.map(b => (
              <option key={b.id} value={b.id}>{b.nombre}</option>
            ))}
          </select>
        </div>

        <div className="select-field">
          Disponibilidad:
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
            <option>Todas</option>
            <option>Normal</option>
            <option>Reposición</option>
            <option>Crítico</option>
          </select>
        </div>

        <div className="select-field">
          Ordenar:
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="relevantes">Más relevantes</option>
            <option value="price-asc">Precio: menor a mayor</option>
            <option value="price-desc">Precio: mayor a menor</option>
            <option value="stock">Stock consolidado</option>
          </select>
        </div>

        <div className="view-toggle">
          <button
            className={viewMode === 'grid' ? 'active' : ''}
            onClick={() => setViewMode('grid')}
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            Tarjetas
          </button>
          <button
            className={viewMode === 'table' ? 'active' : ''}
            onClick={() => setViewMode('table')}
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
            Tabla
          </button>
        </div>
      </div>

      {/* CATEGORY RAIL */}
      <div className="category-rail">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`category-chip ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
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
            filteredProducts.map((prod) => (
              <div
                className="product-card"
                key={prod.id}
                style={{ opacity: prod.estado ? 1 : 0.72 }}
              >
                <div className="product-thumb">
                  <span className="thumb-tag">{getCategoryName(prod.categoria_id)}</span>
                  <span className="thumb-code">{prod.codigo_interno}</span>
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                </div>

                <div className="product-body">
                  <span className="product-brand">{getBrandName(prod.marca_id)}</span>
                  <h3 className="product-name">{getBrandName(prod.marca_id)} {prod.modelo}</h3>
                  <span className="product-model">Modelo {prod.modelo} · EAN {prod.codigo_ean13}</span>

                  <div className="product-meta-row">
                    <span className="product-price">${prod.precio_actual}</span>
                    {getBadge(prod)}
                  </div>

                  <ProductStock articuloId={prod.id} />

                  <div className="product-card-actions">
                    <button
                      className="btn btn-outline"
                      onClick={() => navigate('/Detalle_producto')}
                    >
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
            ))
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
                  <th>Nombre / descripción</th>
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
                      <td className="cell-strong">{getBrandName(prod.marca_id)} {prod.modelo}</td>
                      <td>{getBrandName(prod.marca_id)}</td>
                      <td>{prod.modelo}</td>
                      <td className="cell-mono">{prod.codigo_ean13}</td>
                      <td>{getCategoryName(prod.categoria_id)}</td>
                      <td className="cell-strong">${prod.precio_actual}</td>
                      <td>{getBadge(prod)}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-btn"
                            title="Ver detalle"
                            onClick={() => navigate('/Detalle_producto')}
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

      {/* MODAL NUEVO PRODUCTO (HU-07) */}
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
            <div className="form-field">
              <label>Código interno<span className="req">*</span></label>
              <input
                type="text"
                required
                value={newProduct.code}
                onChange={(e) => setNewProduct({ ...newProduct, code: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label>Categoría<span className="req">*</span></label>
              <select
                value={newProduct.category}
                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
              >
                <option value="">Seleccione una categoría</option>
                {formCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field full">
              <label>Descripción / Nombre<span className="req">*</span></label>
              <input
                type="text"
                placeholder="Ej: Guitarra eléctrica Stratocaster, cuerpo tilo…"
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
                value={newProduct.brand}
                onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
              >
                <option value="">Seleccione una marca</option>
                {formBrands.map(b => (
                  <option key={b.id} value={b.id}>{b.nombre}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Modelo</label>
              <input
                type="text"
                placeholder="Ej: MX23"
                value={newProduct.model}
                onChange={(e) => setNewProduct({ ...newProduct, model: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>EAN-13<span className="req">*</span></label>
              <input
                type="text"
                maxLength={13}
                placeholder="Ej: 7791234500017"
                required
                value={newProduct.ean}
                onChange={(e) => setNewProduct({ ...newProduct, ean: e.target.value })}
              />
              {eanValidation.state === 'invalid' && (
                <span className="field-error">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" />
                  </svg>
                  {eanValidation.message}
                </span>
              )}
              {eanValidation.state === 'duplicate' && (
                <span className="field-error">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" />
                  </svg>
                  {eanValidation.message}
                </span>
              )}
              {eanValidation.state === 'valid' && (
                <span className="field-success">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  {eanValidation.message}
                </span>
              )}
            </div>

            <div className="form-field">
              <label>Precio ($ ARS)<span className="req">*</span></label>
              <input
                type="number"
                placeholder="Ej: 650000"
                required
                value={newProduct.price}
                onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>País de Origen<span className="req">*</span></label>
              <select
                value={newProduct.originCountry}
                onChange={(e) => setNewProduct({ ...newProduct, originCountry: e.target.value })}
              >
                <option value="">Seleccione un país</option>
                {formCountries.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Stock inicial (Tienda Central)</label>
              <input
                type="number"
                min={0}
                value={newProduct.initialStock}
                onChange={(e) => setNewProduct({ ...newProduct, initialStock: e.target.value })}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAL DAR DE BAJA PRODUCTO (SOFT DELETE) */}
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
            ¿Confirmás que querés dar de baja a <strong>{productToDeactivate?.descripcion} ({productToDeactivate?.codigo_interno})</strong>?
          </p>
          <div className="form-field">
            <label>Motivo de la baja</label>
            <select
              value={deactivateReason}
              onChange={(e) => setDeactivateReason(e.target.value)}
            >
              <option value="Discontinuado por el fabricante">Discontinuado por el fabricante</option>
              <option value="Fin de comercialización">Fin de comercialización</option>
              <option value="Reemplazado por nuevo modelo">Reemplazado por nuevo modelo</option>
              <option value="Sin stock proyectado">Sin stock proyectado</option>
            </select>
          </div>
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
          ¿Deseás reactivar <strong>{productToReactivate?.descripcion} ({productToReactivate?.codigo_interno})</strong>? El producto volverá a estar disponible para movimientos y consultas en el catálogo activo.
        </p>
      </Modal>
    </div>
  );
}

export default Catalogo_de_productos;