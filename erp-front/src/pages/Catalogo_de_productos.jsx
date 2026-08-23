import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';

const INITIAL_PRODUCTS = [
  { id: 1, code: 'COD-0001', name: 'Stratocaster Player', brand: 'Fender', model: 'MX23', ean: '7791234500011', category: 'Guitarras eléctricas', price: 1250000, status: 'Normal', central: 8, margalef: 3 },
  { id: 2, code: 'COD-0002', name: 'Les Paul Studio', brand: 'Gibson', model: 'LPS', ean: '7791234500028', category: 'Guitarras eléctricas', price: 2480000, status: 'Reposición', central: 4, margalef: 2 },
  { id: 3, code: 'COD-0003', name: 'AD810', brand: 'Cort', model: 'AD810', ean: '7791234500035', category: 'Guitarras acústicas', price: 310000, status: 'Normal', central: 12, margalef: 9 },
  { id: 4, code: 'COD-0004', name: '214ce', brand: 'Taylor', model: '214ce', ean: '7791234500042', category: 'Guitarras acústicas', price: 980000, status: 'Crítico', central: 3, margalef: 1 },
  { id: 5, code: 'COD-0005', name: 'Player Jazz Bass', brand: 'Fender', model: 'PJB', ean: '7791234500059', category: 'Bajos', price: 1150000, status: 'Reposición', central: 5, margalef: 3 },
  { id: 6, code: 'COD-0006', name: 'GSR200', brand: 'Ibanez', model: 'GSR200', ean: '7791234500066', category: 'Bajos', price: 420000, status: 'Crítico', central: 2, margalef: 1 },
  { id: 7, code: 'COD-0007', name: 'P-145', brand: 'Yamaha', model: 'P-145', ean: '7791234500073', category: 'Pianos', price: 650000, status: 'Crítico', central: 1, margalef: 1 },
  { id: 8, code: 'COD-0008', name: 'B2', brand: 'Korg', model: 'B2', ean: '7791234500080', category: 'Teclados', price: 480000, status: 'Normal', central: 7, margalef: 3 },
  { id: 9, code: 'COD-0009', name: 'TD-17', brand: 'Roland', model: 'TD-17', ean: '7791234500097', category: 'Baterías', price: 2150000, status: 'Crítico', central: 3, margalef: 1 },
  { id: 10, code: 'COD-0010', name: 'Export Series', brand: 'Pearl', model: 'Export', ean: '7791234500103', category: 'Baterías', price: 1680000, status: 'Crítico', central: 2, margalef: 0 },
  { id: 11, code: 'COD-0011', name: 'Cajón Peruano', brand: 'LP', model: 'Serie Americana', ean: '7791234500110', category: 'Percusión', price: 185000, status: 'Normal', central: 15, margalef: 10 },
  { id: 12, code: 'COD-0012', name: 'MG30GFX', brand: 'Marshall', model: 'MG30GFX', ean: '7791234500127', category: 'Amplificadores', price: 520000, status: 'Reposición', central: 6, margalef: 3 },
  { id: 13, code: 'COD-0013', name: 'SM58', brand: 'Shure', model: 'SM58', ean: '7791234500134', category: 'Micrófonos', price: 195000, status: 'Normal', central: 20, margalef: 12 },
  { id: 14, code: 'COD-0014', name: 'HS5', brand: 'Yamaha', model: 'HS5', ean: '7791234500141', category: 'Audio', price: 340000, status: 'Reposición', central: 4, margalef: 2 },
  { id: 15, code: 'COD-0015', name: 'Correa + Púas Kit', brand: 'Dunlop', model: 'Kit', ean: '7791234500158', category: 'Accesorios', price: 28000, status: 'Normal', central: 30, margalef: 22 },
  { id: 16, code: 'COD-0016', name: 'YTR-2330', brand: 'Yamaha', model: 'YTR-2330', ean: '7791234500165', category: 'Instrumentos de viento', price: 890000, status: 'Crítico', central: 2, margalef: 0 },
];

const CATEGORIES = [
  'Todas', 'Guitarras eléctricas', 'Guitarras acústicas', 'Bajos', 'Teclados',
  'Pianos', 'Baterías', 'Percusión', 'Amplificadores', 'Micrófonos', 'Audio',
  'Accesorios', 'Instrumentos de viento'
];

function Catalogo_de_productos() {
  const navigate = useNavigate();

  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('Todas');
  const [selectedStatus, setSelectedStatus] = useState('Todas');
  const [sortBy, setSortBy] = useState('relevantes');
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Toast de confirmación
  const [confirmToast, setConfirmToast] = useState(null);

  // Modal Nuevo Producto
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    code: 'COD-0017',
    category: 'Guitarras eléctricas',
    description: '',
    brand: 'Fender',
    model: '',
    ean: '',
    price: '',
    status: 'Normal',
    initialStock: 0
  });

  // Modal Eliminar Producto
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  // Validación de EAN-13 en vivo
  const eanValidation = useMemo(() => {
    const val = newProduct.ean.trim();
    if (val.length === 0) return { state: 'empty' };
    const isNumeric = /^[0-9]+$/.test(val);
    if (val.length !== 13 || !isNumeric) return { state: 'invalid', message: 'El código EAN-13 no es válido (debe tener 13 dígitos numéricos).' };
    const isDuplicate = products.some(p => p.ean === val);
    if (isDuplicate) return { state: 'duplicate', message: 'Este EAN-13 ya se encuentra registrado en el catálogo.' };
    return { state: 'valid', message: 'Código EAN-13 válido y disponible.' };
  }, [newProduct.ean, products]);

  // Filtrado y ordenamiento en tiempo real
  const filteredProducts = useMemo(() => {
    return products
      .filter((item) => {
        const matchesCategory = activeCategory === 'Todas' || item.category === activeCategory;
        const matchesBrand = selectedBrand === 'Todas' || item.brand === selectedBrand;
        const matchesStatus = selectedStatus === 'Todas' || item.status === selectedStatus;
        const matchesSearch =
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.ean.includes(searchTerm);

        return matchesCategory && matchesBrand && matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        if (sortBy === 'stock') return (b.central + b.margalef) - (a.central + a.margalef);
        return a.id - b.id;
      });
  }, [products, searchTerm, selectedBrand, selectedStatus, sortBy, activeCategory]);

  const showToast = (message) => {
    setConfirmToast(message);
    setTimeout(() => setConfirmToast(null), 4000);
  };

  const handleCreateProduct = (e) => {
    e.preventDefault();
    if (!newProduct.description.trim() || eanValidation.state !== 'valid') return;

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
      margalef: 0
    };

    setProducts([created, ...products]);
    setIsNewModalOpen(false);
    showToast('Producto guardado correctamente en el catálogo.');

    setNewProduct({
      code: `COD-${String(products.length + 2).padStart(4, '0')}`,
      category: 'Guitarras eléctricas',
      description: '',
      brand: 'Fender',
      model: '',
      ean: '',
      price: '',
      status: 'Normal',
      initialStock: 0
    });
  };

  const handleDeleteProduct = () => {
    if (!productToDelete) return;
    setProducts(products.filter(p => p.id !== productToDelete.id));
    setIsDeleteModalOpen(false);
    showToast(`Producto "${productToDelete.name}" eliminado del catálogo.`);
    setProductToDelete(null);
  };

  const getBadge = (status) => {
    if (status === 'Normal') return <span className="badge badge-green"><span className="badge-dot"></span>Normal</span>;
    if (status === 'Reposición') return <span className="badge badge-amber"><span className="badge-dot"></span>Reposición</span>;
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
            Base maestra de la que dependen inventario, movimientos y alertas — {filteredProducts.length} productos
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
          {filteredProducts.map((prod) => (
            <div className="product-card" key={prod.id}>
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
                  {getBadge(prod.status)}
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
                  <button
                    className="icon-btn btn-icon-only"
                    title="Eliminar"
                    onClick={() => {
                      setProductToDelete(prod);
                      setIsDeleteModalOpen(true);
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VISTA EN TABLA (HU-07 EXACTA) */}
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
                {filteredProducts.map((prod) => (
                  <tr key={prod.id}>
                    <td className="cell-mono">{prod.code}</td>
                    <td className="cell-strong">{prod.name}</td>
                    <td>{prod.brand}</td>
                    <td>{prod.model}</td>
                    <td className="cell-mono">{prod.ean}</td>
                    <td>{prod.category}</td>
                    <td className="cell-strong">${prod.price.toLocaleString('es-AR')}</td>
                    <td>{getBadge(prod.status)}</td>
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
                        <button
                          className="icon-btn"
                          title="Eliminar"
                          onClick={() => {
                            setProductToDelete(prod);
                            setIsDeleteModalOpen(true);
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
                {CATEGORIES.filter(c => c !== 'Todas').map(c => (
                  <option key={c} value={c}>{c}</option>
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
              <label>Estado<span className="req">*</span></label>
              <select
                value={newProduct.status}
                onChange={(e) => setNewProduct({ ...newProduct, status: e.target.value })}
              >
                <option value="Normal">Normal</option>
                <option value="Reposición">Reposición</option>
                <option value="Crítico">Crítico</option>
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

      {/* MODAL ELIMINAR PRODUCTO */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Eliminar producto"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              style={{ background: 'var(--crit)' }}
              onClick={handleDeleteProduct}
            >
              Eliminar producto
            </button>
          </>
        }
      >
        <p style={{ fontSize: '13.5px', color: 'var(--gray-700)', lineHeight: '1.6' }}>
          ¿Confirmás que querés eliminar <strong>{productToDelete?.name} ({productToDelete?.code})</strong> del catálogo? Esta acción no afecta el historial de movimientos ya registrado.
        </p>
      </Modal>
    </div>
  );
}

export default Catalogo_de_productos;