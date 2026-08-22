import { useNavigate} from 'react-router-dom'
import { useState } from 'react';

function Catalogo_de_productos() {

    const navigate = useNavigate();

    return(

        <main class="content">

            <div class="catalog-toolbar">
                <div class="search-input">
                    <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
                    <input type="text" placeholder="Buscar por nombre, marca o SKU…"/>
                </div>
                <div class="select-field">
                    Marca:
                    <select>
                        <option>Todas</option>
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
                <div class="select-field">
                    Disponibilidad:
                    <select>
                        <option>Todas</option>
                        <option>Disponible</option>
                        <option>Stock bajo</option>
                        <option>Sin stock</option>
                    </select>
                </div>
                <div class="select-field">
                    Ordenar:
                    <select>
                        <option>Más relevantes</option>
                        <option>Precio: menor a mayor</option>
                        <option>Precio: mayor a menor</option>
                        <option>Stock disponible</option>
                    </select>
                </div>
                <div class="view-toggle">
                    <button class="active">
                        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                        Tarjetas
                    </button>
                    <button>
                        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
                        Tabla
                    </button>
                </div>
            </div>

            <div class="category-rail">
                <span class="category-chip active">Todas</span>
                <span class="category-chip">Guitarras eléctricas</span>
                <span class="category-chip">Guitarras acústicas</span>
                <span class="category-chip">Bajos</span>
                <span class="category-chip">Teclados</span>
                <span class="category-chip">Pianos</span>
                <span class="category-chip">Baterías</span>
                <span class="category-chip">Percusión</span>
                <span class="category-chip">Amplificadores</span>
                <span class="category-chip">Micrófonos</span>
                <span class="category-chip">Audio</span>
                <span class="category-chip">Accesorios</span>
                <span class="category-chip">Instrumentos de viento</span>
            </div>

            <div class="section-heading">
                <div>
                    <h2>Catálogo de instrumentos</h2>
                    <span class="desc">16 productos encontrados</span>
                </div>
            </div>

            <div class="product-grid">

                {/*Debo investigar como realmente se va a desenvolver esta función, ya que los elementos no serán fijo, 
                sino segun la cantidad de resultados de la base de datos y el "tipo" (dependiendo de como sea ese dato) 
                del instrumento o articulo, es que tendrá un icono u otro
                
                Además, habrá que adaptar el onclick de los botones para que estos hagan la consulta de los datos*/}

                {/* <!-- Producto 1 -->*/}
                <div class="product-card">
                    <div class="product-thumb">
                        <span class="thumb-tag">Guitarras eléctricas</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                    </div>
                    <div class="product-body">
                        <span class="product-brand">Fender</span>
                        <h3 class="product-name">Stratocaster Player</h3>
                        <span class="product-model">Modelo MX23 · 3-Color Sunburst</span>
                        <span class="product-sku">GTR-FEN-001</span>
                        <div class="product-meta-row">
                            <span class="product-price">$1.250.000</span>
                            <span class="product-stock">16 uds.</span>
                        </div>
                        <div class="product-footer">
                            <span class="badge badge-green"><span class="badge-dot"></span>Disponible</span>
                        </div>

                        {/*Revisar si está incluido el path de /Detalle_producto en App.jsx*/}
                        <button class="btn btn-outline" data-open-detail="1" onClick={() => navigate('/Detalle_producto')}>Ver detalle</button>
                    </div>
                </div>

                {/*<!-- Producto 2 -->*/}
                <div class="product-card">
                    <div class="product-thumb">
                        <span class="thumb-tag">Guitarras eléctricas</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                    </div>
                    <div class="product-body">
                        <span class="product-brand">Gibson</span>
                        <h3 class="product-name">Les Paul Studio</h3>
                        <span class="product-model">Modelo LPS · Ebony</span>
                        <span class="product-sku">GTR-GIB-002</span>
                        <div class="product-meta-row">
                            <span class="product-price">$2.480.000</span>
                            <span class="product-stock">7 uds.</span>
                        </div>
                        <div class="product-footer">
                            <span class="badge badge-green"><span class="badge-dot"></span>Disponible</span>
                        </div>
                        <button class="btn btn-outline">Ver detalle</button>
                    </div>
                </div>

                {/*<!-- Producto 3 -->*/}
                <div class="product-card">
                    <div class="product-thumb">
                        <span class="thumb-tag">Guitarras acústicas</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                    </div>
                    <div class="product-body">
                        <span class="product-brand">Cort</span>
                        <h3 class="product-name">AD810</h3>
                        <span class="product-model">Dreadnought · Natural</span>
                        <span class="product-sku">GTR-COR-007</span>
                        <div class="product-meta-row">
                            <span class="product-price">$310.000</span>
                            <span class="product-stock">27 uds.</span>
                        </div>
                        <div class="product-footer">
                            <span class="badge badge-green"><span class="badge-dot"></span>Disponible</span>
                        </div>
                        <button class="btn btn-outline">Ver detalle</button>
                    </div>
                </div>

          {/*<!------- Producto 4 --->*/}
          <div class="product-card">
            <div class="product-thumb">
              <span class="thumb-tag">Guitarras acústicas</span>
              <svg viewBox="0 0 24 24" fill="none" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            </div>
            <div class="product-body">
              <span class="product-brand">Taylor</span>
              <h3 class="product-name">214ce</h3>
              <span class="product-model">Grand Auditorium · Cutaway</span>
              <span class="product-sku">GTR-TAY-008</span>
              <div class="product-meta-row">
                <span class="product-price">$980.000</span>
                <span class="product-stock">4 uds.</span>
              </div>
              <div class="product-footer">
                <span class="badge badge-amber"><span class="badge-dot"></span>Stock bajo</span>
              </div>
              <button class="btn btn-outline">Ver detalle</button>
            </div>
          </div>

          {/*<!---- Producto 5 -->*/}
          <div class="product-card">
            <div class="product-thumb">
              <span class="thumb-tag">Bajos</span>
              <svg viewBox="0 0 24 24" fill="none" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            </div>
            <div class="product-body">
              <span class="product-brand">Fender</span>
              <h3 class="product-name">Player Jazz Bass</h3>
              <span class="product-model">Modelo PJB · 3-Color Sunburst</span>
              <span class="product-sku">BAJ-FEN-009</span>
              <div class="product-meta-row">
                <span class="product-price">$1.150.000</span>
                <span class="product-stock">10 uds.</span>
              </div>
              <div class="product-footer">
                <span class="badge badge-green"><span class="badge-dot"></span>Disponible</span>
              </div>
              <button class="btn btn-outline">Ver detalle</button>
            </div>
          </div>

          {/*<!-- Producto 6 -->*/}
          <div class="product-card">
            <div class="product-thumb">
              <span class="thumb-tag">Bajos</span>
              <svg viewBox="0 0 24 24" fill="none" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            </div>
            <div class="product-body">
              <span class="product-brand">Ibanez</span>
              <h3 class="product-name">GSR200</h3>
              <span class="product-model">Modelo GSR200 · Black</span>
              <span class="product-sku">BAJ-IBA-010</span>
              <div class="product-meta-row">
                <span class="product-price">$420.000</span>
                <span class="product-stock">3 uds.</span>
              </div>
              <div class="product-footer">
                <span class="badge badge-red"><span class="badge-dot"></span>Crítico</span>
              </div>
              <button class="btn btn-outline">Ver detalle</button>
            </div>
          </div>

          {/*<!-- Producto 7 -->*/}
          <div class="product-card">
            <div class="product-thumb">
              <span class="thumb-tag">Pianos</span>
              <svg viewBox="0 0 24 24" fill="none" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="10" rx="1.5"/><path d="M7 7v10M11 7v6M15 7v6M19 7v10"/></svg>
            </div>
            <div class="product-body">
              <span class="product-brand">Yamaha</span>
              <h3 class="product-name">P-145</h3>
              <span class="product-model">Piano digital 88 teclas</span>
              <span class="product-sku">KEY-YAM-003</span>
              <div class="product-meta-row">
                <span class="product-price">$650.000</span>
                <span class="product-stock">19 uds.</span>
              </div>
              <div class="product-footer">
                <span class="badge badge-green"><span class="badge-dot"></span>Disponible</span>
              </div>
              <button class="btn btn-outline">Ver detalle</button>
            </div>
          </div>

          {/*<!-- Producto 8 -->*/}
          <div class="product-card">
            <div class="product-thumb">
              <span class="thumb-tag">Teclados</span>
              <svg viewBox="0 0 24 24" fill="none" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="10" rx="1.5"/><path d="M7 7v10M11 7v6M15 7v6M19 7v10"/></svg>
            </div>
            <div class="product-body">
              <span class="product-brand">Korg</span>
              <h3 class="product-name">B2</h3>
              <span class="product-model">Piano digital compacto</span>
              <span class="product-sku">KEY-KOR-011</span>
              <div class="product-meta-row">
                <span class="product-price">$480.000</span>
                <span class="product-stock">12 uds.</span>
              </div>
              <div class="product-footer">
                <span class="badge badge-green"><span class="badge-dot"></span>Disponible</span>
              </div>
              <button class="btn btn-outline">Ver detalle</button>
            </div>
          </div>

          {/*<!-- Producto 9 -->*/}
          <div class="product-card">
            <div class="product-thumb">
              <span class="thumb-tag">Baterías</span>
              <svg viewBox="0 0 24 24" fill="none" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v9c0 1.66 3.58 3 8 3s8-1.34 8-3V6"/></svg>
            </div>
            <div class="product-body">
              <span class="product-brand">Roland</span>
              <h3 class="product-name">TD-17</h3>
              <span class="product-model">Batería electrónica</span>
              <span class="product-sku">BAT-ROL-006</span>
              <div class="product-meta-row">
                <span class="product-price">$2.150.000</span>
                <span class="product-stock">5 uds.</span>
              </div>
              <div class="product-footer">
                <span class="badge badge-green"><span class="badge-dot"></span>Disponible</span>
              </div>
              <button class="btn btn-outline">Ver detalle</button>
            </div>
          </div>

          {/*<!-- Producto 10 -->*/}
          <div class="product-card">
            <div class="product-thumb">
              <span class="thumb-tag">Baterías</span>
              <svg viewBox="0 0 24 24" fill="none" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v9c0 1.66 3.58 3 8 3s8-1.34 8-3V6"/></svg>
            </div>
            <div class="product-body">
              <span class="product-brand">Pearl</span>
              <h3 class="product-name">Export Series</h3>
              <span class="product-model">Batería acústica 5 piezas</span>
              <span class="product-sku">BAT-PEA-012</span>
              <div class="product-meta-row">
                <span class="product-price">$1.680.000</span>
                <span class="product-stock">2 uds.</span>
              </div>
              <div class="product-footer">
                <span class="badge badge-red"><span class="badge-dot"></span>Crítico</span>
              </div>
              <button class="btn btn-outline">Ver detalle</button>
            </div>
          </div>

          {/*<!-- Producto 11 -->*/}
          <div class="product-card">
            <div class="product-thumb">
              <span class="thumb-tag">Percusión</span>
              <svg viewBox="0 0 24 24" fill="none" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="12" height="16" rx="2"/><path d="M6 10h12"/></svg>
            </div>
            <div class="product-body">
              <span class="product-brand">LP</span>
              <h3 class="product-name">Cajón Peruano</h3>
              <span class="product-model">Serie Americana</span>
              <span class="product-sku">PER-LPX-013</span>
              <div class="product-meta-row">
                <span class="product-price">$185.000</span>
                <span class="product-stock">33 uds.</span>
              </div>
              <div class="product-footer">
                <span class="badge badge-green"><span class="badge-dot"></span>Disponible</span>
              </div>
              <button class="btn btn-outline">Ver detalle</button>
            </div>
          </div>

          {/*<!-- Producto 12 -->*/}
          <div class="product-card">
            <div class="product-thumb">
              <span class="thumb-tag">Amplificadores</span>
              <svg viewBox="0 0 24 24" fill="none" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="9" cy="12" r="3"/><circle cx="16" cy="8" r="1"/><circle cx="16" cy="16" r="1"/></svg>
            </div>
            <div class="product-body">
              <span class="product-brand">Marshall</span>
              <h3 class="product-name">MG30GFX</h3>
              <span class="product-model">Amplificador de guitarra 30W</span>
              <span class="product-sku">AMP-MAR-005</span>
              <div class="product-meta-row">
                <span class="product-price">$520.000</span>
                <span class="product-stock">11 uds.</span>
              </div>
              <div class="product-footer">
                <span class="badge badge-green"><span class="badge-dot"></span>Disponible</span>
              </div>
              <button class="btn btn-outline">Ver detalle</button>
            </div>
          </div>

          {/*<!-- Producto 13 -->*/}
          <div class="product-card">
            <div class="product-thumb">
              <span class="thumb-tag">Micrófonos</span>
              <svg viewBox="0 0 24 24" fill="none" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><path d="M12 17v5M9 22h6"/></svg>
            </div>
            <div class="product-body">
              <span class="product-brand">Shure</span>
              <h3 class="product-name">SM58</h3>
              <span class="product-model">Micrófono dinámico vocal</span>
              <span class="product-sku">MIC-SHR-004</span>
              <div class="product-meta-row">
                <span class="product-price">$195.000</span>
                <span class="product-stock">44 uds.</span>
              </div>
              <div class="product-footer">
                <span class="badge badge-green"><span class="badge-dot"></span>Disponible</span>
              </div>
              <button class="btn btn-outline">Ver detalle</button>
            </div>
          </div>

          {/*<!-- Producto 14 -->*/}
          <div class="product-card">
            <div class="product-thumb">
              <span class="thumb-tag">Audio</span>
              <svg viewBox="0 0 24 24" fill="none" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2"/><circle cx="12" cy="8" r="2.5"/><circle cx="12" cy="16" r="1.3"/></svg>
            </div>
            <div class="product-body">
              <span class="product-brand">Yamaha</span>
              <h3 class="product-name">HS5</h3>
              <span class="product-model">Monitor de estudio activo</span>
              <span class="product-sku">AUD-YAM-014</span>
              <div class="product-meta-row">
                <span class="product-price">$340.000</span>
                <span class="product-stock">7 uds.</span>
              </div>
              <div class="product-footer">
                <span class="badge badge-green"><span class="badge-dot"></span>Disponible</span>
              </div>
              <button class="btn btn-outline">Ver detalle</button>
            </div>
          </div>

          {/*<!-- Producto 15 -->*/}
          <div class="product-card">
            <div class="product-thumb">
              <span class="thumb-tag">Accesorios</span>
              <svg viewBox="0 0 24 24" fill="none" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v0a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v0Z"/><path d="M8 11V9a4 4 0 0 1 8 0v2"/></svg>
            </div>
            <div class="product-body">
              <span class="product-brand">Dunlop</span>
              <h3 class="product-name">Correa + Púas Kit</h3>
              <span class="product-model">Set accesorios guitarra</span>
              <span class="product-sku">ACC-DUN-015</span>
              <div class="product-meta-row">
                <span class="product-price">$28.000</span>
                <span class="product-stock">70 uds.</span>
              </div>
              <div class="product-footer">
                <span class="badge badge-green"><span class="badge-dot"></span>Disponible</span>
              </div>
              <button class="btn btn-outline">Ver detalle</button>
            </div>
          </div>

          {/*<!-- Producto 16 -->*/}
          <div class="product-card">
            <div class="product-thumb">
              <span class="thumb-tag">Instrumentos de viento</span>
              <svg viewBox="0 0 24 24" fill="none" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h11l3-3 3 3-3 3-3-3"/><circle cx="6" cy="12" r="2.5"/></svg>
            </div>
            <div class="product-body">
              <span class="product-brand">Yamaha</span>
              <h3 class="product-name">YTR-2330</h3>
              <span class="product-model">Trompeta Bb estudiante</span>
              <span class="product-sku">VIE-YAM-016</span>
              <div class="product-meta-row">
                <span class="product-price">$890.000</span>
                <span class="product-stock">3 uds.</span>
              </div>
              <div class="product-footer">
                <span class="badge badge-amber"><span class="badge-dot"></span>Stock bajo</span>
              </div>
              <button class="btn btn-outline">Ver detalle</button>
            </div>
          </div>

        </div>



        </main>

    );

}

export default Catalogo_de_productos;