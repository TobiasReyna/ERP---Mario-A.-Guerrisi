import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../config/supabaseClient';

const CATEGORY_DATA = [
  { name: 'Guitarras eléctricas', value: 17, percentage: 37, alt: false },
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

    useEffect(() => {
    traerDatos()
    traerDatosStock()
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
          <div className="stat-value">227</div>
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
          <div className="stat-value">10</div>
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
          <div className="stat-value">9</div>
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
              {CATEGORY_DATA.map((item) => (
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
            <div className="alert-mini">
              <span className="alert-mini-dot crit"></span>
              <div className="alert-mini-info">
                <div className="alert-mini-name">Pearl Export Series</div>
                <div className="alert-mini-sub">Tienda Central · mínimo 4</div>
              </div>
              <span className="alert-mini-stock">2 uds.</span>
            </div>

            <div className="alert-mini">
              <span className="alert-mini-dot crit"></span>
              <div className="alert-mini-info">
                <div className="alert-mini-name">Ibanez GSR200</div>
                <div className="alert-mini-sub">Consolidado · mínimo 6</div>
              </div>
              <span className="alert-mini-stock">3 uds.</span>
            </div>

            <div className="alert-mini">
              <span className="alert-mini-dot crit"></span>
              <div className="alert-mini-info">
                <div className="alert-mini-name">Yamaha P-145</div>
                <div className="alert-mini-sub">Consolidado · mínimo 3</div>
              </div>
              <span className="alert-mini-stock">2 uds.</span>
            </div>

            <div className="alert-mini">
              <span className="alert-mini-dot low"></span>
              <div className="alert-mini-info">
                <div className="alert-mini-name">Gibson Les Paul Studio</div>
                <div className="alert-mini-sub">Sugerido: reponer 4 uds.</div>
              </div>
              <span className="alert-mini-stock low">6 uds.</span>
            </div>

            <div className="alert-mini">
              <span className="alert-mini-dot low"></span>
              <div className="alert-mini-info">
                <div className="alert-mini-name">Yamaha YTR-2330</div>
                <div className="alert-mini-sub">Consolidado · mínimo 5</div>
              </div>
              <span className="alert-mini-stock low">2 uds.</span>
            </div>
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

