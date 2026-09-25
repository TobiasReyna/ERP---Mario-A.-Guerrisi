const { supabaseAdmin } = require('../config/supabase');

class StockService {
    /**
     * Registra una transferencia de stock entre dos depósitos
     */
    static async transferirStock(payload) {
        const { articulo_id, deposito_origen_id, deposito_destino_id, cantidad, usuario_id, ip_origen } = payload;

        const { data, error } = await supabaseAdmin
            .from('transferencias_stock')
            .insert([
                {
                    articulo_id,
                    deposito_origen_id,
                    deposito_destino_id,
                    cantidad,
                    usuario_id,
                    ip_origen: ip_origen || '127.0.0.1'
                }
            ])
            .select()
            .single();

        if (error) {
            throw new Error(`Error en base de datos: ${error.message}`);
        }

        return data;
    }

    /**
     * Registra un ajuste de stock manual (merma, rotura, inventario físico)
     */
    static async ajustarStock(payload) {
        const { articulo_id, deposito_id, cantidad_anterior, cantidad_nueva, motivo_id, usuario_id, ip_origen } = payload;

        const { data, error } = await supabaseAdmin
            .from('ajustes_stock')
            .insert([
                {
                    articulo_id,
                    deposito_id,
                    cantidad_anterior,
                    cantidad_nueva,
                    motivo_id,
                    usuario_id,
                    ip_origen: ip_origen || '127.0.0.1'
                }
            ])
            .select()
            .single();

        if (error) {
            throw new Error(`Error en base de datos: ${error.message}`);
        }

        return data;
    }

    /**
     * Consulta la disponibilidad consolidada y por depósito de un artículo
     */
    static async obtenerDisponibilidad(articulo_id) {
        const { data, error } = await supabaseAdmin
            .from('existencias')
            .select(`
                cantidad,
                depositos (
                    id,
                    nombre
                )
            `)
            .eq('articulo_id', articulo_id);

        if (error) {
            throw new Error(`Error consultando disponibilidad: ${error.message}`);
        }

        let stock_consolidado = 0;
        const desglose = (data || []).map(item => {
            stock_consolidado += item.cantidad;
            return {
                deposito_id: item.depositos?.id,
                deposito_nombre: item.depositos?.nombre || 'Depósito Desconocido',
                cantidad: item.cantidad
            };
        });

        return {
            articulo_id,
            stock_consolidado,
            desglose
        };
    }

    /**
     * Historial unificado de movimientos:
     * Combina Ajustes de inventario, Transferencias y Ventas mostrador confirmadas.
     * Si no se envía articulo_id, devuelve el historial global.
     */
    static async obtenerHistorial(articulo_id = null) {
        // 1. Diccionarios auxiliares para mapeo rápido en memoria
        const [{ data: depositos }, { data: motivos }, { data: articulos }] = await Promise.all([
            supabaseAdmin.from('depositos').select('id, nombre'),
            supabaseAdmin.from('motivos_ajustes').select('id, nombre'),
            supabaseAdmin.from('articulos').select('id, descripcion, codigo_interno')
        ]);
        
        const depDict = depositos ? depositos.reduce((acc, d) => ({ ...acc, [d.id]: d.nombre }), {}) : {};
        const motDict = motivos ? motivos.reduce((acc, m) => ({ ...acc, [m.id]: m.nombre }), {}) : {};
        const artDict = articulos ? articulos.reduce((acc, a) => ({ ...acc, [a.id]: a }), {}) : {};

        // 2. Armado de consultas en paralelo
        let queryAjustes = supabaseAdmin.from('ajustes_stock').select('*');
        let queryTransferencias = supabaseAdmin.from('transferencias_stock').select('*');
        let queryVentas = supabaseAdmin
            .from('ventas_detalle')
            .select(`
                id,
                articulo_id,
                cantidad,
                ventas!inner (
                    id,
                    numero_comprobante,
                    estado,
                    deposito_id,
                    usuario_id,
                    fecha_hora_registro
                )
            `)
            .eq('ventas.estado', 'Confirmada');

        if (articulo_id) {
            queryAjustes = queryAjustes.eq('articulo_id', articulo_id);
            queryTransferencias = queryTransferencias.eq('articulo_id', articulo_id);
            queryVentas = queryVentas.eq('articulo_id', articulo_id);
        }

        const [{ data: ajustes }, { data: transferencias }, { data: ventasDetalle }] = await Promise.all([
            queryAjustes,
            queryTransferencias,
            queryVentas
        ]);

        let historial = [];

        // 3. Mapear Ajustes
        if (ajustes) {
            historial = historial.concat(ajustes.map(a => {
                const nombreMotivo = motDict[a.motivo_id] || 'Ajuste manual';
                const deposito = depDict[a.deposito_id] || 'Depósito Desconocido';
                const artInfo = artDict[a.articulo_id] || {};
                const diff = a.cantidad_nueva - a.cantidad_anterior;

                return {
                    id: a.id,
                    fecha: a.fecha_hora_registro,
                    tipo_movimiento: 'AJUSTE',
                    articulo_id: a.articulo_id,
                    articulo_descripcion: artInfo.descripcion || 'Sin descripción',
                    articulo_codigo: artInfo.codigo_interno || '—',
                    cantidad_afectada: diff,
                    deposito_nombre: deposito,
                    detalle: `Ajuste (${nombreMotivo}): ${a.cantidad_anterior} → ${a.cantidad_nueva} un.`,
                    usuario_id: a.usuario_id
                };
            }));
        }

        // 4. Mapear Transferencias
        if (transferencias) {
            historial = historial.concat(transferencias.map(t => {
                const origen = depDict[t.deposito_origen_id] || 'Origen Desconocido';
                const destino = depDict[t.deposito_destino_id] || 'Destino Desconocido';
                const artInfo = artDict[t.articulo_id] || {};

                return {
                    id: t.id,
                    fecha: t.fecha_hora_registro,
                    tipo_movimiento: 'TRANSFERENCIA',
                    articulo_id: t.articulo_id,
                    articulo_descripcion: artInfo.descripcion || 'Sin descripción',
                    articulo_codigo: artInfo.codigo_interno || '—',
                    cantidad_afectada: t.cantidad,
                    deposito_nombre: `${origen} → ${destino}`,
                    detalle: `Transferencia entre depósitos`,
                    usuario_id: t.usuario_id
                };
            }));
        }

        // 5. Mapear Salidas por Ventas Confirmadas
        if (ventasDetalle) {
            historial = historial.concat(ventasDetalle.map(vd => {
                const v = vd.ventas;
                const deposito = depDict[v.deposito_id] || 'Depósito Desconocido';
                const artInfo = artDict[vd.articulo_id] || {};

                return {
                    id: vd.id,
                    fecha: v.fecha_hora_registro,
                    tipo_movimiento: 'VENTA',
                    articulo_id: vd.articulo_id,
                    articulo_descripcion: artInfo.descripcion || 'Sin descripción',
                    articulo_codigo: artInfo.codigo_interno || '—',
                    cantidad_afectada: -Number(vd.cantidad),
                    deposito_nombre: deposito,
                    detalle: `Venta mostrador (${v.numero_comprobante || 'S/N'})`,
                    usuario_id: v.usuario_id
                };
            }));
        }

        // 6. Ordenar del más reciente al más antiguo
        historial.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        return historial;
    }

    /**
     * Actualiza o crea políticas de stock mínimo y máximo
     */
    static async actualizarPoliticas(articulo_id, payload) {
        const { deposito_id, stock_minimo, stock_maximo, usuario_id } = payload;
        
        let targetDepositos = [];

        if (deposito_id && deposito_id !== 'TODOS') {
            targetDepositos = [deposito_id];
        } else {
            const { data: depositos, error: depError } = await supabaseAdmin
                .from('depositos')
                .select('id');

            if (depError) {
                throw new Error(`Error obteniendo depósitos: ${depError.message}`);
            }

            targetDepositos = (depositos || []).map(d => d.id);
        }

        if (targetDepositos.length === 0) {
            throw new Error('No se encontraron depósitos disponibles en el sistema.');
        }

        const recordsToUpsert = targetDepositos.map(depId => {
            const item = {
                articulo_id,
                deposito_id: depId,
                stock_minimo: Number(stock_minimo),
                stock_maximo: Number(stock_maximo)
            };
            if (usuario_id) {
                item.actualizado_por = usuario_id;
            }
            return item;
        });

        const { data, error } = await supabaseAdmin
            .from('politicas_reposicion_deposito')
            .upsert(recordsToUpsert, { onConflict: 'articulo_id, deposito_id' })
            .select();

        if (error) {
            throw new Error(`Error al actualizar políticas: ${error.message}`);
        }

        return data;
    }

    /**
     * Obtiene artículos en estado crítico o que alcanzaron el punto de reposición
     */
    static async obtenerAlertas() {
        const [{ data: articulos }, { data: existencias }, { data: politicas }, { data: depositos }] = await Promise.all([
            supabaseAdmin.from('articulos').select('id, codigo_interno, descripcion').eq('estado', true),
            supabaseAdmin.from('existencias').select('articulo_id, deposito_id, cantidad'),
            supabaseAdmin.from('politicas_reposicion_deposito').select('articulo_id, deposito_id, stock_minimo, stock_maximo'),
            supabaseAdmin.from('depositos').select('id, nombre')
        ]);

        if (!articulos || !depositos) {
            throw new Error('Error al obtener datos básicos para alertas.');
        }

        const politicasMap = new Map();
        if (politicas) {
            politicas.forEach(p => politicasMap.set(`${p.articulo_id}_${p.deposito_id}`, p));
        }

        const existenciasMap = new Map();
        if (existencias) {
            existencias.forEach(e => existenciasMap.set(`${e.articulo_id}_${e.deposito_id}`, e.cantidad));
        }

        const alertas = [];

        articulos.forEach(art => {
            depositos.forEach(dep => {
                const key = `${art.id}_${dep.id}`;
                const stock_actual = existenciasMap.get(key) || 0;
                let pol = politicasMap.get(key);
                
                let stock_minimo = 5;
                let stock_maximo = 20;

                if (pol) {
                    stock_minimo = pol.stock_minimo;
                    stock_maximo = pol.stock_maximo;
                }

                if (stock_actual <= stock_minimo) {
                    const reposicion_sugerida = stock_maximo - stock_actual;
                    alertas.push({
                        articulo_id: art.id,
                        codigo_interno: art.codigo_interno,
                        articulo_descripcion: art.descripcion,
                        deposito_id: dep.id,
                        deposito_nombre: dep.nombre,
                        stock_actual,
                        stock_minimo,
                        stock_maximo,
                        reposicion_sugerida
                    });
                }
            });
        });

        return alertas;
    }

    /**
     * Catálogo completo para POS: Devuelve TODOS los artículos activos,
     * calculando disponible real (cantidad - reservada) para el depósito seleccionado.
     * Si no tiene fila en existencias, se reporta con disponible = 0.
     */
    static async obtenerCatalogoPOS(depositoId) {
        if (!depositoId) {
            throw new Error('depositoId es obligatorio para consultar el catálogo del POS.');
        }

        // 1. Traer todos los artículos activos del catálogo maestro
        const { data: articulos, error: errArt } = await supabaseAdmin
            .from('articulos')
            .select(`
                id,
                descripcion,
                codigo_ean13,
                precio_actual,
                categoria_id,
                categorias (id, nombre)
            `)
            .eq('estado', true)
            .order('descripcion', { ascending: true });

        if (errArt) {
            throw new Error(`Error consultando artículos: ${errArt.message}`);
        }

        // 2. Traer las existencias registradas en el depósito activo
        const { data: existencias, error: errEx } = await supabaseAdmin
            .from('existencias')
            .select('articulo_id, cantidad, cantidad_reservada')
            .eq('deposito_id', depositoId);

        if (errEx) {
            throw new Error(`Error consultando existencias: ${errEx.message}`);
        }

        const existenciasMap = new Map(
            (existencias || []).map((e) => [e.articulo_id, e])
        );

        // 3. Mapear: Si no tiene existencias registradas, su disponible es 0
        return (articulos || []).map((art) => {
            const ex = existenciasMap.get(art.id);
            const cantidad = ex ? Number(ex.cantidad) || 0 : 0;
            const reservada = ex ? Number(ex.cantidad_reservada) || 0 : 0;
            const disponible = Math.max(0, cantidad - reservada);

            return {
                id: art.id,
                descripcion: art.descripcion,
                codigoEan13: art.codigo_ean13,
                precioActual: Number(art.precio_actual),
                categoriaId: art.categoria_id,
                categoria: art.categorias?.nombre || 'Sin categoría',
                disponible,
            };
        });
    }

    /**
     * Inventario General para vista ERP
     */
    static async obtenerInventarioGeneral() {
        const { data: articulosActivos, error: errArticulos } = await supabaseAdmin
            .from('articulos')
            .select(`
                id,
                descripcion,
                modelo,
                codigo_interno,
                categoria_id,
                marcas(id, nombre),
                categorias(id, nombre),
                existencias (
                    cantidad,
                    deposito_id,
                    depositos (id, nombre)
                )
            `)
            .eq('estado', true);

        if (errArticulos) {
            throw new Error(`Error consultando inventario general: ${errArticulos.message}`);
        }

        const inventario = (articulosActivos || []).map(art => {
            let central = 0;
            let margalef = 0;
            const stocksPorDeposito = {};

            if (art.existencias) {
                for (const ex of art.existencias) {
                    const depId = ex.deposito_id || ex.depositos?.id;
                    const depNombre = ex.depositos?.nombre;
                    if (depId) stocksPorDeposito[depId] = ex.cantidad;
                    if (depNombre) stocksPorDeposito[depNombre] = ex.cantidad;
                    if (depNombre === 'Tienda Central') {
                        central += ex.cantidad;
                    } else if (depNombre === 'Galería Margalef') {
                        margalef += ex.cantidad;
                    }
                }
            }

            const totalStock = central + margalef;
            let status = 'Normal';
            if (totalStock === 0) status = 'Crítico';
            else if (totalStock <= 3) status = 'Reposición';

            return {
                id: art.id,
                name: art.descripcion,
                marca: art.marcas?.nombre,
                modelo: art.modelo,
                code: art.codigo_interno,
                category: art.categorias?.nombre || 'Sin categoría',
                categoria_id: art.categoria_id,
                central,
                margalef,
                stocksPorDeposito,
                status
            };
        });

        return inventario;
    }
}

module.exports = StockService;