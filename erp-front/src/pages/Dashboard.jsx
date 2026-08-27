import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { supabase } from '../config/supabaseClient';

//definmos CATEGORY_DATA como un array vacío para llenarlo con los datos de stock por categoría
var CATEGORY_DATA = [
  { name: 'Guitarras eléctricas', value: 4226, percentage: 37, alt: false },
  { name: 'Guitarras acústicas', value: 25, percentage: 56, alt: true },
  { name: 'Bajos', value: 11, percentage: 26, alt: false },
  { name: 'Teclados y pianos', value: 12, percentage: 27, alt: true },
  { name: 'Baterías y percusión', value: 31, percentage: 70, alt: false },
  { name: 'Amplificadores', value: 9, percentage: 20, alt: true },
  { name: 'Micrófonos y audio', value: 38, percentage: 86, alt: false },
  { name: 'Accesorios', value: 52, percentage: 100, alt: true },
];

export default function Dashboard() {
  const [datos, setDatos] = useState([])
  const [datos_stock, setDatosStock] = useState([])
  const [cargando, setCargando] = useState(true) // Estado para controlar la carga de datos
  const [stockGlobal, setStockGlobal] = useState(0);
  const [stockAAtender, setStockAAtender] = useState([]);
  const [movimientosdiario, setMovimientosdiario] = useState([]);
  const [datosstockXcategoria, setStockXcategoria] = useState([]);

  const [alertas, setAlertas] = useState([]);
  const [loadingAlertas, setLoadingAlertas] = useState(true);
  const [errorAlertas, setErrorAlertas] = useState(null);

async function fetchAlertas() {
  try {

        const { data, error } = await supabase
          .from('vista_alertas_reposicion')
          .select('*')
          .order('fecha', { ascending: false })
          .limit(5);
        
        setAlertas(data || []);
      } catch (err) {
        setErrorAlertas(err.message);
      } finally {
        setLoadingAlertas(false);
      }
}



  async function traerDatos() {
    try {
      const { data, error } = await supabase
        .from('articulos')
        .select('*')

      if (error) throw error

      setDatos(data)

    } catch (error) {
      console.error('Error:', error.message)
    } finally {
      setCargando(false) // Avisás que ya terminó de cargar
    }
  }
  async function traerDatosStock() {
    try {
      const { data, error } = await supabase
        .from('articulos') //CAMBIAR
        .select('*')

      if (error) throw error

      setDatosStock(data)

    } catch (error) {
      console.error('Error:', error.message)
    } finally {
      setCargando(false) // Avisás que ya terminó de cargar
    }
  }
  async function obtenerStockTotal() {
      try {
        setCargando(true);
        
        // Consultamos la tabla donde llevas el stock por depósito
        const { data, error } = await supabase
          .from('existencias') // Cambia esto por el nombre real de tu tabla
          .select('cantidad')

        if (error) throw error;

        // Sumamos las cantidades de todos los depósitos devueltos
        if (data) {
          const sumaTotal = data.reduce((acumulador, registro) => acumulador + (registro.cantidad || 0), 0);
          setStockGlobal(sumaTotal);
        }
        
      } catch (error) {
        console.error('Error al calcular el stock:', error.message);
      } finally {
        setCargando(false);
      }
    }
  async function alertaStock() {
    try {
      const { data, error } = await supabase
        .from('vista_alertas_reposicion')
        .select('*')

      if (error) throw error
      setStockAAtender(data)
    } catch (error) {
      console.error('Error:', error.message)
    } finally {
      setCargando(false) // Avisás que ya terminó de cargar
    }
  }
  async function movimientosHoy() {
    try {
      const { data, error } = await supabase
        .from('transferencia_stock')
        .select('*')
        .eq('fecha', new Date().toISOString().split('T')[0])

      if (error) throw error
      setMovimientosdiario(data)
    } catch (error) {
      console.error('Error:', error.message)
    } finally {
      setCargando(false)
    }
  }
async function stockXcategoria() {
    try {
      setCargando(true);
      
      // 1. Consulta a Supabase con JOIN anidado (existencias -> articulos -> categorias)
      const { data, error } = await supabase
        .from('existencias')
        .select(`
          cantidad,
          articulos (
            categorias (
              nombre
            )
          )
        `);

      if (error) throw error;

      // 2. Agrupamos los datos y sumamos el stock
      const totalesPorCategoria = {};
      
      data.forEach((registro) => {
        // Navegamos por la respuesta anidada de Supabase
        const nombreCategoria = registro.articulos?.categorias?.nombre || 'Sin categoría';
        const cantidad = registro.cantidad || 0;

        if (!totalesPorCategoria[nombreCategoria]) {
          totalesPorCategoria[nombreCategoria] = 0;
        }
        totalesPorCategoria[nombreCategoria] += cantidad;
      });

      // 3. Calculamos el valor máximo para asignar un porcentaje real a las barras
      const maxStock = Math.max(...Object.values(totalesPorCategoria), 1);

      // 4. Formateamos los datos para que sean idénticos a CATEGORY_DATA
      const arrayFormateado = Object.keys(totalesPorCategoria).map((nombre) => {
        const valor = totalesPorCategoria[nombre];
        return {
          name: nombre,
          value: valor,
          percentage: Math.round((valor / maxStock) * 100), // La categoría con más stock será 100%
        };
      });

      // 5. Ordenamos de mayor a menor cantidad y aplicamos el estilo alterno (alt)
      arrayFormateado.sort((a, b) => b.value - a.value);
      
      const dataFinal = arrayFormateado.map((item, index) => ({
        ...item,
        alt: index % 2 !== 0 // Intercala false y true (rojo y negro)
      }));

      // 6. Guardamos el array final directamente en el estado
      setStockXcategoria(dataFinal);

    } catch (error) {
      console.error('Error al obtener stock por categoría:', error.message);
    } finally {
      setCargando(false);
    }
  }


    useEffect(() => {
    traerDatos()
    traerDatosStock()
    obtenerStockTotal()
    alertaStock() 
    movimientosHoy()
    stockXcategoria()
    fetchAlertas()

    
  }, [])




  return (
    <div>
      {/* 4 TARJETAS DE MÉTRICAS */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-icon tint-red">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3.24L4 3v5.59a2 2 0 0 0 .59 1.41l9.59 9.59a2 2 0 0 0 2.82 0l3.59-3.59a2 2 0 0 0 0-2.59Z" />
              </svg>
            </div>
            <span className="stat-trend up">+4.2%</span>
          </div>
          <div className="stat-value">{datos.length}</div>
          <div className="stat-label">Productos en catálogo</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-icon tint-black">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 8 12 3 3 8l9 5 9-5Z" />
                <path d="M3 8v8l9 5 9-5V8" />
              </svg>
            </div>
            <span className="stat-trend flat">estable</span>
          </div>
          <div className="stat-value">{stockGlobal}</div>
          <div className="stat-label">Unidades — stock consolidado</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-icon tint-amber">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                <path d="M12 9v4M12 17h.01" />
              </svg>
            </div>
            <span className="stat-trend down">+2 hoy</span>
          </div>
          <div className="stat-value">{stockAAtender.length}</div>
          <div className="stat-label">Productos que requieren atención</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-icon tint-green">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 7h13l-3-3M17 17H4l3 3" />
              </svg>
            </div>
            <span className="stat-trend up">+18%</span>
          </div>
          <div className="stat-value">{movimientosdiario.length}</div>
          <div className="stat-label">Movimientos del día</div>
        </div>
      </div>

      {/* FILA DE BARRAS DE CATEGORÍA Y ALERTAS RECIENTES */}
      <div className="dashboard-row">
        {/* STOCK CONSOLIDADO POR CATEGORÍA */}
        <div className="panel">
          <div className="panel-header">
            <h3>Stock consolidado por categoría</h3>
            <Link to="/Inventario" className="link">
              Ver inventario
            </Link>
          </div>
          <div className="panel-body">
            <div className="bar-chart">
              {datosstockXcategoria.map((item) => (
                <div className="bar-row" key={item.name}>
                  <span className="bar-row-label">{item.name}</span>
                  <div className="bar-track">
                    <div
                      className={`bar-fill ${item.alt ? 'alt' : ''}`}
                      style={{ width: `${item.percentage}%`, transition: 'width 0.4s ease' }}
                    ></div>
                  </div>
                  <span className="bar-row-value">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ALERTAS RECIENTES */}
        <div className="panel">
          <div className="panel-header">
            <h3>Alertas recientes</h3>
            <Link to="/Alertas_de_stock" className="link">
              Ver todas
            </Link>
          </div>
          <div className="panel-body">
            {loadingAlertas && <div style={{ padding: '16px', color: 'var(--gray-500)', fontSize: '13px' }}>Cargando alertas...</div>}
            {errorAlertas && <div style={{ padding: '16px', color: 'var(--red)', fontSize: '13px' }}>Error: {errorAlertas}</div>}
            {!loadingAlertas && !errorAlertas && alertas.length === 0 && (
               <div style={{ padding: '16px', color: 'var(--gray-500)', fontSize: '13px' }}>No hay alertas de stock recientes.</div>
            )}
            {!loadingAlertas && !errorAlertas && alertas.slice(0, 5).map((alerta, idx) => {
              const isCrit = alerta.stock_actual <= (alerta.stock_minimo / 2);
              const dotClass = isCrit ? 'crit' : 'low';
              return (
                <div className="alert-mini" key={idx}>
                  <span className={`alert-mini-dot ${dotClass}`}></span>
                  <div className="alert-mini-info">
                    <div className="alert-mini-name">{alerta.articulo_nombre}</div>
                    <div className="alert-mini-sub">{alerta.deposito_nombre} · mínimo {alerta.stock_minimo}</div>
                  </div>
                  <span className={`alert-mini-stock ${dotClass === 'low' ? 'low' : ''}`}>{alerta.stock_actual} uds.</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ÚLTIMOS MOVIMIENTOS */}
      <div className="panel">
        <div className="panel-header">
          <h3>Últimos movimientos</h3>
          <Link to="/Movimientos" className="link">
            Ver historial completo
          </Link>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Tipo</th>
                <th>Depósito</th>
                <th>Cantidad</th>
                <th>Usuario</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="cell-strong">Fender Stratocaster Player</td>
                <td><span className="type-pill type-entrada">ENTRADA</span></td>
                <td>Tienda Central</td>
                <td className="cell-strong">+8</td>
                <td>Juan Pérez</td>
                <td>21/08/2026 · 09:14</td>
              </tr>
              <tr>
                <td className="cell-strong">Shure SM58</td>
                <td><span className="type-pill type-salida">SALIDA</span></td>
                <td>Galería Margalef</td>
                <td className="cell-strong">-4</td>
                <td>María Gómez</td>
                <td>21/08/2026 · 08:52</td>
              </tr>
              <tr>
                <td className="cell-strong">Roland TD-17</td>
                <td><span className="type-pill type-transferencia">TRANSFERENCIA</span></td>
                <td>Central → Margalef</td>
                <td className="cell-strong">2</td>
                <td>Carlos Ruiz</td>
                <td>20/08/2026 · 17:30</td>
              </tr>
              <tr>
                <td className="cell-strong">Ibanez GSR200</td>
                <td><span className="type-pill type-ajuste-neg">AJUSTE NEG.</span></td>
                <td>Galería Margalef</td>
                <td className="cell-strong">-1</td>
                <td>Carlos Ruiz</td>
                <td>20/08/2026 · 16:05</td>
              </tr>
              <tr>
                <td className="cell-strong">Yamaha P-145</td>
                <td><span className="type-pill type-entrada">ENTRADA</span></td>
                <td>Tienda Central</td>
                <td className="cell-strong">+1</td>
                <td>Juan Pérez</td>
                <td>20/08/2026 · 11:20</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

