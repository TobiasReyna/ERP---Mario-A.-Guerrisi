import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';

const INITIAL_PRODUCTS = [
  { id: 1, name: 'Stratocaster Player', brand: 'Fender', category: 'Guitarras eléctricas', model: 'Modelo MX23 · 3-Color Sunburst', sku: 'GTR-FEN-001', price: 1250000, stock: 16, status: 'Disponible' },
  { id: 2, name: 'Les Paul Studio', brand: 'Gibson', category: 'Guitarras eléctricas', model: 'Modelo LPS · Ebony', sku: 'GTR-GIB-002', price: 2480000, stock: 7, status: 'Disponible' },
  { id: 3, name: 'AD810', brand: 'Cort', category: 'Guitarras acústicas', model: 'Dreadnought · Natural', sku: 'GTR-COR-007', price: 310000, stock: 27, status: 'Disponible' },
  { id: 4, name: '214ce', brand: 'Taylor', category: 'Guitarras acústicas', model: 'Grand Auditorium · Cutaway', sku: 'GTR-TAY-008', price: 980000, stock: 4, status: 'Stock bajo' },
  { id: 5, name: 'Player Jazz Bass', brand: 'Fender', category: 'Bajos', model: 'Modelo PJB · 3-Color Sunburst', sku: 'BAJ-FEN-009', price: 1150000, stock: 10, status: 'Disponible' },
  { id: 6, name: 'GSR200', brand: 'Ibanez', category: 'Bajos', model: 'Modelo GSR200 · Black', sku: 'BAJ-IBA-010', price: 420000, stock: 3, status: 'Crítico' },
  { id: 7, name: 'P-145', brand: 'Yamaha', category: 'Pianos', model: 'Piano digital 88 teclas', sku: 'KEY-YAM-003', price: 650000, stock: 19, status: 'Disponible' },
  { id: 8, name: 'B2', brand: 'Korg', category: 'Teclados', model: 'Piano digital compacto', sku: 'KEY-KOR-011', price: 480000, stock: 12, status: 'Disponible' },
  { id: 9, name: 'TD-17', brand: 'Roland', category: 'Baterías', model: 'Batería electrónica', sku: 'BAT-ROL-006', price: 2150000, stock: 5, status: 'Disponible' },
  { id: 10, name: 'Export Series', brand: 'Pearl', category: 'Baterías', model: 'Batería acústica 5 piezas', sku: 'BAT-PEA-012', price: 1680000, stock: 2, status: 'Crítico' },
  { id: 11, name: 'Cajón Peruano', brand: 'LP', category: 'Percusión', model: 'Serie Americana', sku: 'PER-LPX-013', price: 1850000, stock: 33, status: 'Disponible' },
  { id: 12, name: 'MG30GFX', brand: 'Marshall', category: 'Amplificadores', model: 'Amplificador de guitarra 30W', sku: 'AMP-MAR-005', price: 520000, stock: 11, status: 'Disponible' },
  { id: 13, name: 'SM58', brand: 'Shure', category: 'Micrófonos', model: 'Micrófono dinámico vocal', sku: 'MIC-SHR-004', price: 195000, stock: 44, status: 'Disponible' },
  { id: 14, name: 'HS5', brand: 'Yamaha', category: 'Audio', model: 'Monitor de estudio activo', sku: 'AUD-YAM-014', price: 340000, stock: 7, status: 'Disponible' },
  { id: 15, name: 'Correa + Púas Kit', brand: 'Dunlop', category: 'Accesorios', model: 'Set accesorios guitarra', sku: 'ACC-DUN-015', price: 28000, stock: 70, status: 'Disponible' },
  { id: 16, name: 'YTR-2330', brand: 'Yamaha', category: 'Instrumentos de viento', model: 'Trompeta Bb estudiante', sku: 'VIE-YAM-016', price: 890000, stock: 3, status: 'Stock bajo' },
];

const CATEGORIES = [
  'Todas', 'Guitarras eléctricas', 'Guitarras acústicas', 'Bajos', 'Teclados',
  'Pianos', 'Baterías', 'Percusión', 'Amplificadores', 'Micrófonos', 'Audio',
  'Accesorios', 'Instrumentos de viento'
];

function Catalogo_de_productos() {
  const navigate = useNavigate();

  // Estados de filtros y vistas
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('Todas');
  const [selectedStatus, setSelectedStatus] = useState('Todas');
  const [sortBy, setSortBy] = useState('relevantes');
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' o 'table'

  // Estado para el modal de nuevo producto
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    brand: 'Fender',
    category: 'Guitarras eléctricas',
    model: '',
    sku: '',
    price: '',
    stock: '',
    status: 'Disponible'
  });

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
          item.sku.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesCategory && matchesBrand && matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        if (sortBy === 'stock') return b.stock - a.stock;
        return a.id - b.id; // relevantes / default
      });
  }, [products, searchTerm, selectedBrand, selectedStatus, sortBy, activeCategory]);

  const handleCreateProduct = (e) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.sku) return;

    const created = {
      ...newProduct,
      id: Date.now(),
      price: Number(newProduct.price) || 0,
      stock: Number(newProduct.stock) || 0,
    };

    setProducts([created, ...products]);
    setIsModalOpen(false);
    setNewProduct({
      name: '',
      brand: 'Fender',
      category: 'Guitarras eléctricas',
      model: '',
      sku: '',
      price: '',
      stock: '',
      status: 'Disponible'
    });
  };

  const getBadgeClass = (status) => {
    if (status === 'Disponible') return 'badge-green';
    if (status === 'Stock bajo') return 'badge-amber';
    return 'badge-red';
  };

  return (
    <div>
      {/* TOOLBAR */}
      <div className="catalog-toolbar">
        <div className="search-input">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nombre, marca o SKU…"
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
            <option>Disponible</option>
            <option>Stock bajo</option>
            <option>Crítico</option>
          </select>
        </div>

        <div className="select-field">
          Ordenar:
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="relevantes">Más relevantes</option>
            <option value="price-asc">Precio: menor a mayor</option>
            <option value="price-desc">Precio: mayor a menor</option>
            <option value="stock">Mayor stock disponible</option>
          </select>
        </div>

        {/* ALTERNADOR DE VISTA */}
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

      {/* ENCABEZADO Y BOTÓN DE NUEVO PRODUCTO */}
      <div className="section-heading">
        <div>
          <h2>Catálogo de instrumentos</h2>
          <span className="desc">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'producto encontrado' : 'productos encontrados'}
          </span>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nuevo producto
        </button>
      </div>

      {/* VISTA EN TARJETAS (GRID) */}
      {viewMode === 'grid' && (
        <div className="product-grid">
          {filteredProducts.map((prod) => (
            <div className="product-card" key={prod.id}>
              <div className="product-thumb">
                <span className="thumb-tag">{prod.category}</span>
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </div>
              <div className="product-body">
                <span className="product-brand">{prod.brand}</span>
                <h3 className="product-name">{prod.name}</h3>
                <span className="product-model">{prod.model}</span>
                <span className="product-sku">{prod.sku}</span>
                <div className="product-meta-row">
                  <span className="product-price">${prod.price.toLocaleString('es-AR')}</span>
                  <span className="product-stock">{prod.stock} uds.</span>
                </div>
                <div className="product-footer">
                  <span className={`badge ${getBadgeClass(prod.status)}`}>
                    <span className="badge-dot"></span>
                    {prod.status}
                  </span>
                </div>
                <button
                  className="btn btn-outline"
                  onClick={() => navigate('/Detalle_producto')}
                >
                  Ver detalle
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VISTA EN TABLA */}
      {viewMode === 'table' && (
        <div className="table-panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Marca</th>
                  <th>Categoría</th>
                  <th>SKU</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((prod) => (
                  <tr key={prod.id}>
                    <td className="cell-strong">
                      {prod.name}
                      <div className="cell-sub">{prod.model}</div>
                    </td>
                    <td>{prod.brand}</td>
                    <td>{prod.category}</td>
                    <td style={{ fontFamily: 'monospace' }}>{prod.sku}</td>
                    <td className="cell-strong">${prod.price.toLocaleString('es-AR')}</td>
                    <td>{prod.stock} uds.</td>
                    <td>
                      <span className={`badge ${getBadgeClass(prod.status)}`}>
                        <span className="badge-dot"></span>
                        {prod.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => navigate('/Detalle_producto')}
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL PARA AGREGAR NUEVO PRODUCTO */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Crear Nuevo Producto"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={handleCreateProduct}>
              Guardar Producto
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateProduct}>
          <div className="form-row">
            <div className="form-field">
              <label>Nombre del Producto *</label>
              <input
                type="text"
                placeholder="Ej. Telecaster Custom"
                required
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label>Marca *</label>
              <select
                value={newProduct.brand}
                onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
              >
                <option>Fender</option>
                <option>Gibson</option>
                <option>Yamaha</option>
                <option>Roland</option>
                <option>Marshall</option>
                <option>Shure</option>
                <option>Korg</option>
                <option>Cort</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Categoría</label>
              <select
                value={newProduct.category}
                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
              >
                {CATEGORIES.filter(c => c !== 'Todas').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>SKU / Código *</label>
              <input
                type="text"
                placeholder="Ej. GTR-FEN-099"
                required
                value={newProduct.sku}
                onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Precio ($ ARS)</label>
              <input
                type="number"
                placeholder="Ej. 1500000"
                value={newProduct.price}
                onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label>Stock Inicial</label>
              <input
                type="number"
                placeholder="Ej. 10"
                value={newProduct.stock}
                onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field full">
              <label>Modelo / Descripción Corta</label>
              <input
                type="text"
                placeholder="Ej. Edición especial 2026, color Butterscotch"
                value={newProduct.model}
                onChange={(e) => setNewProduct({ ...newProduct, model: e.target.value })}
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Catalogo_de_productos;