import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';

const INITIAL_PRODUCTS = [
  { id: 1, code: 'COD-0001', name: 'Stratocaster Player', brand: 'Fender', model: 'MX23', ean: '7791234500011', category: 'Guitarras eléctricas', price: 1250000, status: 'Normal', central: 8, margalef: 3, active: true },
  { id: 2, code: 'COD-0002', name: 'Les Paul Studio', brand: 'Gibson', model: 'LPS', ean: '7791234500028', category: 'Guitarras eléctricas', price: 2480000, status: 'Reposición', central: 4, margalef: 2, active: true },
  { id: 3, code: 'COD-0003', name: 'AD810', brand: 'Cort', model: 'AD810', ean: '7791234500035', category: 'Guitarras acústicas', price: 310000, status: 'Normal', central: 12, margalef: 9, active: true },
  { id: 4, code: 'COD-0004', name: '214ce', brand: 'Taylor', model: '214ce', ean: '7791234500042', category: 'Guitarras acústicas', price: 980000, status: 'Crítico', central: 3, margalef: 1, active: true },
  { id: 5, code: 'COD-0005', name: 'Player Jazz Bass', brand: 'Fender', model: 'PJB', ean: '7791234500059', category: 'Bajos', price: 1150000, status: 'Reposición', central: 5, margalef: 3, active: true },
  { id: 6, code: 'COD-0006', name: 'GSR200', brand: 'Ibanez', model: 'GSR200', ean: '7791234500066', category: 'Bajos', price: 420000, status: 'Crítico', central: 2, margalef: 1, active: true },
  { id: 7, code: 'COD-0007', name: 'P-145', brand: 'Yamaha', model: 'P-145', ean: '7791234500073', category: 'Pianos', price: 650000, status: 'Crítico', central: 1, margalef: 1, active: true },
  { id: 8, code: 'COD-0008', name: 'B2', brand: 'Korg', model: 'B2', ean: '7791234500080', category: 'Teclados', price: 480000, status: 'Normal', central: 7, margalef: 3, active: true },
  { id: 9, code: 'COD-0009', name: 'TD-17', brand: 'Roland', model: 'TD-17', ean: '7791234500097', category: 'Baterías', price: 2150000, status: 'Crítico', central: 3, margalef: 1, active: true },
  { id: 10, code: 'COD-0010', name: 'Export Series', brand: 'Pearl', model: 'Export', ean: '7791234500103', category: 'Baterías', price: 1680000, status: 'Crítico', central: 2, margalef: 0, active: true },
  { id: 11, code: 'COD-0011', name: 'Cajón Peruano', brand: 'LP', model: 'Serie Americana', ean: '7791234500110', category: 'Percusión', price: 185000, status: 'Normal', central: 15, margalef: 10, active: true },
  { id: 12, code: 'COD-0012', name: 'MG30GFX', brand: 'Marshall', model: 'MG30GFX', ean: '7791234500127', category: 'Amplificadores', price: 520000, status: 'Reposición', central: 6, margalef: 3, active: true },
  { id: 13, code: 'COD-0013', name: 'SM58', brand: 'Shure', model: 'SM58', ean: '7791234500134', category: 'Micrófonos', price: 195000, status: 'Normal', central: 20, margalef: 12, active: true },
  { id: 14, code: 'COD-0014', name: 'HS5', brand: 'Yamaha', model: 'HS5', ean: '7791234500141', category: 'Audio', price: 340000, status: 'Reposición', central: 4, margalef: 2, active: true },
  { id: 15, code: 'COD-0015', name: 'Correa + Púas Kit', brand: 'Dunlop', model: 'Kit', ean: '7791234500158', category: 'Accesorios', price: 28000, status: 'Normal', central: 30, margalef: 22, active: true },
  { id: 16, code: 'COD-0016', name: 'YTR-2330', brand: 'Yamaha', model: 'YTR-2330', ean: '7791234500165', category: 'Instrumentos de viento', price: 890000, status: 'Crítico', central: 2, margalef: 0, active: false },
];

const CATEGORIES = [
  'Todas', 'Guitarras eléctricas', 'Guitarras acústicas', 'Bajos', 'Teclados',
  'Pianos', 'Baterías', 'Percusión', 'Amplificadores', 'Micrófonos', 'Audio',
  'Accesorios', 'Instrumentos de viento'
];

const COUNTRIES = [
  { id: 'a37d867b-7d1f-4cda-8582-f2d26476b138', name: 'Argentina' },
  { id: '93836159-2616-4a77-83a3-deaeb97f4dbd', name: 'China' },
  { id: 'b05040f8-3657-40da-b803-30c2b6ee3b1d', name: 'Estados Unidos' },
  { id: '619e3858-f561-4108-a323-7218cf7b5f84', name: 'Indonesia' },
  { id: 'aa5056d6-d159-4903-8e77-a8c79c03b3e5', name: 'Japón' },
  { id: '67fea9c7-083a-450d-b8ff-5d7581e0dbd9', name: 'México' },
];

function Catalogo_de_productos() {
  const navigate = useNavigate();

  const [formCategories, setFormCategories] = useState([]);
  useEffect(() => {
    fetch('http://localhost:3001/api/categories')
      .then(res => res.json())
      .then(data => {
        if (data && data.data) {
          setFormCategories(data.data);
        }
      })
      .catch(err => console.error("Error fetching categories:", err));
  }, []);

  const [products, setProducts] = useState(INITIAL_PRODUCTS);
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
    brand: 'Fender',
    model: '',
    ean: '',
    price: '',
    status: 'Normal',
    initialStock: 0,
    originCountry: 'a37d867b-7d1f-4cda-8582-f2d26476b138'
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

  // Filtrado reactivo
  const filteredProducts = useMemo(() => {
    return products
      .filter((item) => {
        const matchesCategory = activeCategory === 'Todas' || item.category === activeCategory;
        const matchesBrand = selectedBrand === 'Todas' || item.brand === selectedBrand;
        const matchesStatus = selectedStatus === 'Todas' || item.status === selectedStatus;
        const matchesLifecycle =
          lifecycleFilter === 'todos' ||
          (lifecycleFilter === 'activos' && item.active) ||
          (lifecycleFilter === 'bajas' && !item.active);

        const matchesSearch =
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.ean.includes(searchTerm);

        return matchesCategory && matchesBrand && matchesStatus && matchesLifecycle && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        if (sortBy === 'stock') return (b.central + b.margalef) - (a.central + a.margalef);
        return a.id - b.id;
      });
  }, [products, searchTerm, selectedBrand, selectedStatus, lifecycleFilter, sortBy, activeCategory]);

  const showToast = (message) => {
    setConfirmToast(message);
    setTimeout(() => setConfirmToast(null), 4000);
  };

  const handleCreateProduct = (e) => {
    e.preventDefault();
    if (!newProduct.category || !newProduct.description.trim() || eanValidation.state !== 'valid') return;

    const created = {
      id: Date.now(),
      code: newProduct.code,
      name: newProduct.description,
      brand: newProduct.brand,
      model: newProduct.model || newProduct.code,
      ean: newProduct.ean,
      category: newProduct.category,
      price: Number(String(newProduct.price).replace(/[^0-9]/g, '')) || 0,
      status: newProduct.status,
      central: Number(newProduct.initialStock) || 0,
      margalef: 0,
      active: true,
      originCountry: newProduct.originCountry
    };

    setProducts([created, ...products]);
    setIsNewModalOpen(false);
    showToast('Producto guardado correctamente en el catálogo.');

    setNewProduct({
      code: `COD-${String(products.length + 2).padStart(4, '0')}`,
      category: '',
      description: '',
      brand: 'Fender',
      model: '',
      ean: '',
      price: '',
      status: 'Normal',
      initialStock: 0,
      originCountry: 'a37d867b-7d1f-4cda-8582-f2d26476b138'
    });
  };

  // Dar de baja (Soft Delete)
  const handleConfirmDeactivate = () => {
    if (!productToDeactivate) return;
    setProducts(products.map(p => p.id === productToDeactivate.id ? { ...p, active: false } : p));
    setIsDeactivateModalOpen(false);
    showToast(`El producto "${productToDeactivate.name}" fue dado de baja. Podés consultarlo o reactivarlo filtrando por "Dados de baja".`);
    setProductToDeactivate(null);
  };

  // Reactivar producto
  const handleConfirmReactivate = () => {
    if (!productToReactivate) return;
    setProducts(products.map(p => p.id === productToReactivate.id ? { ...p, active: true } : p));
    setIsReactivateModalOpen(false);
    showToast(`El producto "${productToReactivate.name}" fue reactivado en el catálogo activo.`);
    setProductToReactivate(null);
  };

  const getBadge = (prod) => {
    if (!prod.active) return <span className="badge badge-gray"><span className="badge-dot"></span>Dado de baja</span>;
    if (prod.status === 'Normal') return <span className="badge badge-green"><span className="badge-dot"></span>Normal</span>;
    if (prod.status === 'Reposición') return <span className="badge badge-amber"><span className="badge-dot"></span>Reposición</span>;
    return <span className="badge badge-red"><span className="badge-dot"></span>Crítico</span>;
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
            <option>Todas</option>
            <option>Fender</option>
            <option>Gibson</option>
            <option>Yamaha</option>
            <option>Roland</option>
            <option>Marshall</option>
            <option>Shure</option>
            <option>Korg</option>
            <option>Cort</option>
            <option>Taylor</option>
            <option>Ibanez</option>
            <option>Pearl</option>
            <option>LP</option>
            <option>Dunlop</option>
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
                style={{ opacity: prod.active ? 1 : 0.72 }}
              >
                <div className="product-thumb">
                  <span className="thumb-tag">{prod.category}</span>
                  <span className="thumb-code">{prod.code}</span>
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                </div>

                <div className="product-body">
                  <span className="product-brand">{prod.brand}</span>
                  <h3 className="product-name">{prod.name}</h3>
                  <span className="product-model">Modelo {prod.model} · EAN {prod.ean}</span>

                  <div className="product-meta-row">
                    <span className="product-price">${prod.price.toLocaleString('es-AR')}</span>
                    {getBadge(prod)}
                  </div>

                  <div className="product-stock-split">
                    <span>Central: <b>{prod.central}</b></span>
                    <span>·</span>
                    <span>Margalef: <b>{prod.margalef}</b></span>
                    <span>·</span>
                    <span>Consol.: <b>{prod.central + prod.margalef}</b></span>
                  </div>

                  <div className="product-card-actions">
                    <button
                      className="btn btn-outline"
                      onClick={() => navigate('/Detalle_producto')}
                    >
                      Ver detalle
                    </button>

                    {prod.active ? (
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
                    <tr key={prod.id} style={{ opacity: prod.active ? 1 : 0.65 }}>
                      <td className="cell-mono">{prod.code}</td>
                      <td className="cell-strong">{prod.name}</td>
                      <td>{prod.brand}</td>
                      <td>{prod.model}</td>
                      <td className="cell-mono">{prod.ean}</td>
                      <td>{prod.category}</td>
                      <td className="cell-strong">${prod.price.toLocaleString('es-AR')}</td>
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

                          {prod.active ? (
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
              <input
                type="text"
                placeholder="Ej: Fender"
                required
                value={newProduct.brand}
                onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
              />
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
                {COUNTRIES.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
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
            ¿Confirmás que querés dar de baja a <strong>{productToDeactivate?.name} ({productToDeactivate?.code})</strong>?
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
          ¿Deseás reactivar <strong>{productToReactivate?.name} ({productToReactivate?.code})</strong>? El producto volverá a estar disponible para movimientos y consultas en el catálogo activo.
        </p>
      </Modal>
    </div>
  );
}

export default Catalogo_de_productos;