import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';


import { supabase } from '../config/supabaseClient.js';

// formato tabla
// id, codigo_interno, decripcion, codigo_ean13, categoria_id, marca_id, pais_origen, precio_actul, estado, fecha_hora_registro, fecha_hora_actualizacion

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

const calcularDigitoVerificador = (ean12) => {
  let suma = 0;
  for (let i = 0; i < 12; i++) {
    // Los índices pares del array (0, 2...) son las posiciones impares del código (1°, 3°...)
    const multiplicador = i % 2 === 0 ? 1 : 3;
    suma += parseInt(ean12[i], 10) * multiplicador;
  }
  return (10 - (suma % 10)) % 10;
};

function Catalogo_de_productos() {
  const navigate = useNavigate();

  // Forma inicial para cargar los datos de los productos hardcodeados
  const [products, setProducts] = useState([INITIAL_PRODUCTS]);

  // EL ESTADO INICIA VACÍO, necesario para en un futuro consultar los productos.
  //const [products, setProducts] = useState([]);

  // Estado para la lista dinámica de paises
  const [paisesOrigen, setPaisesOrigen] = useState([]);

  // ESTADO PARA MANEJAR LA CARGA
  //const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('Todas');
  const [selectedStatus, setSelectedStatus] = useState('Todas');
  const [lifecycleFilter, setLifecycleFilter] = useState('activos'); // 'activos' | 'bajas' | 'todos'
  const [sortBy, setSortBy] = useState('relevantes');
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  /*
  // LA FUNCIÓN QUE TRAE LOS DATOS DE SUPABASE
  async function fetchProductos() {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('articulos') // <-- REEMPLAZA ESTO POR EL NOMBRE EXACTO DE TU TABLA
        .select('*')
        .order('id', { ascending: true }); // Ordena por ID o por 'name', como prefieras

      if (error) {
        throw error;
      }
      
      // Si todo sale bien, procedemos a mapear
      if (data) {
        const productosMapeados = data.map((itemDb) => {
          return {
            id: itemDb.id, // O el nombre que tenga tu clave primaria
            code: itemDb.codigo_interno, // Ejemplo: mapeando 'codigo_interno' a 'code'
            name: "Guitarra piola", // En la tabla no algo como un nombre en sí. Preguntar y verificar de como proseguir
            brand: itemDb.marca_id, // Ejemplo: 'marca' a 'brand'
            model: itemDb.modelo, // Recientemente agregado
            ean: itemDb.codigo_ean13, // Ejemplo: 'codigo_barras_ean' a 'ean'
            category: itemDb.categoria_id, // Ejemplo: 'categoria' a 'category'
            price: itemDb.precio_venta, // Ejemplo: 'precio_venta' a 'price'
            status: itemDb.estado_operativo, // Ejemplo: 'estado_operativo' a 'status'
            central: itemDb.stock_sucursal_central, // Ejemplo a 'central'
            margalef: itemDb.stock_sucursal_margalef, // Ejemplo a 'margalef'
            active: itemDb.esta_activo // Ejemplo booleano a 'active'
          };
        });

        // Guardamos los datos YA TRADUCIDOS en el estado
        setProducts(productosMapeados);
      }
    } catch (error) {
      console.error('Error al cargar productos:', error.message);
      // Aquí podrías usar tu showToast para mostrar el error al usuario
    } finally {
      setLoading(false);
    }
  }
  */


  // Función de consulta de los paises registrados.
  async function fetchPaises() {
    try {
      const { data, error } = await supabase
        .from('paises_origen') // Conecta con la tabla que usaste en el Dashboard
        .select('id, nombre')
        .order('nombre', { ascending: true }); // Los ordenamos alfabéticamente

      if (error) throw error;

      setPaisesOrigen(data); // Guardamos la lista en el estado
    } catch (error) {
      console.error('Error al cargar países:', error.message);
    }
  }


  // EL useEffect QUE DISPARA LA CONSULTA AL ENTRAR A LA PÁGINA

  useEffect(() => {
    // fetchProductos(); esta función que consulta todos los productos registrado. En espera por cohque de datos entre el modelo y la base. Ahora el nombre del producto (del modelo)
    fetchPaises(); // función que consulta a los paises
  }, []);

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
    initialStock: 0,
    paisOrigenId: ''
  });

  // Modal Dar de Baja
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [productToDeactivate, setProductToDeactivate] = useState(null);
  const [deactivateReason, setDeactivateReason] = useState('Discontinuado por el fabricante');

  // Modal Reactivar
  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false);
  const [productToReactivate, setProductToReactivate] = useState(null);

  // Nueva Validación de EAN-13 - donde primeramente ingresamos los 12 nuermos y calcula el 13vo
  const eanValidation = useMemo(() => {
    const val = newProduct.ean.trim();
    if (val.length === 0) return { state: 'empty' };
    
    const isNumeric = /^[0-9]+$/.test(val);
    if (val.length !== 12 || !isNumeric) {
      return { state: 'invalid', message: 'Ingresá los primeros 12 dígitos numéricos.' };
    }
    
    // Calculamos el dígito 13 y armamos el EAN completo
    const checkDigit = calcularDigitoVerificador(val);
    const fullEan = `${val}${checkDigit}`;
    
    const isDuplicate = products.some(p => p.ean === fullEan);
    if (isDuplicate) return { state: 'duplicate', message: `El EAN ${fullEan} ya se encuentra registrado.` };
    
    return { state: 'valid', message: `EAN completo: ${fullEan}`, fullEan };
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
    if (!newProduct.description.trim() || eanValidation.state !== 'valid' || !newProduct.paisOrigenId) {
      return; 
    }

    const created = {
      id: Date.now(),
      code: newProduct.code,
      name: newProduct.description,
      brand: newProduct.brand,
      model: newProduct.model || newProduct.code,
      ean: eanValidation.fullEan,
      category: newProduct.category,
      price: Number(String(newProduct.price).replace(/[^0-9]/g, '')) || 0,
      status: newProduct.status,
      central: Number(newProduct.initialStock) || 0,
      margalef: 0,
      active: true,
      pais_origen_id: newProduct.paisOrigenId
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
      initialStock: 0,
      paisOrigenId: '' // <-- RESETEA EL CAMPO, esto para limpiar los posibles campso lseccionados y dejamos unos preseleccionados
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
              <label>EAN-13 (Ingresar 12 dígitos)<span className="req">*</span></label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  maxLength={12}
                  placeholder="Ej: 779123450001"
                  required
                  value={newProduct.ean}
                  onChange={(e) => setNewProduct({ ...newProduct, ean: e.target.value })}
                />
                
                {/* Cuadro dinámico que muestra el dígito verificador */}
                {newProduct.ean.length === 12 && eanValidation.state !== 'invalid' && (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 16px', backgroundColor: 'var(--gray-100)', 
                    border: '1px solid var(--gray-300)', borderRadius: '6px',
                    fontWeight: '600', color: 'var(--gray-700)'
                  }}>
                    - {calcularDigitoVerificador(newProduct.ean)}
                  </div>
                )}
              </div>
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

          <div className="form-row">
            <div className="form-field">
              <label>País de Origen<span className="req">*</span></label>
              <select
                required
                value={newProduct.paisOrigenId}
                onChange={(e) => setNewProduct({ ...newProduct, paisOrigenId: e.target.value })}
              >
                <option value="" disabled>Seleccionar país...</option>
                
                {/* Iteramos sobre los datos reales que llegaron de Supabase */}
                {paisesOrigen.map((pais) => (
                  <option key={pais.id} value={pais.id}>
                    {pais.nombre}
                  </option>
                ))}
                
              </select>
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