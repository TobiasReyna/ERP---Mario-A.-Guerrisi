import { useState, useMemo } from 'react';
import Modal from '../components/Modal';

const INITIAL_WAREHOUSES = [
  {
    id: 1,
    name: 'Depósito Central',
    location: 'Salta Capital, Salta',
    distinctProducts: 142,
    totalUnits: 1960,
    activeAlerts: 3,
    manager: 'Juan Pérez',
    capacity: 2500,
  },
  {
    id: 2,
    name: 'Depósito Norte',
    location: 'Jujuy, Argentina',
    distinctProducts: 98,
    totalUnits: 874,
    activeAlerts: 5,
    manager: 'María Gómez',
    capacity: 1500,
  },
  {
    id: 3,
    name: 'Depósito Sur',
    location: 'Tucumán, Argentina',
    distinctProducts: 116,
    totalUnits: 1008,
    activeAlerts: 4,
    manager: 'Carlos Ruiz',
    capacity: 1800,
  },
];

function Depositos() {
  const [warehouses, setWarehouses] = useState(INITIAL_WAREHOUSES);

  // Estados del modal (Creación / Edición)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    manager: 'Juan Pérez',
    capacity: 1000,
  });

  // Cálculo para las barras de distribución
  const maxUnits = useMemo(() => {
    return Math.max(...warehouses.map((w) => w.totalUnits), 1);
  }, [warehouses]);

  const handleOpenCreateModal = () => {
    setEditingWarehouse(null);
    setFormData({
      name: '',
      location: '',
      manager: 'Juan Pérez',
      capacity: 1500,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (wh) => {
    setEditingWarehouse(wh);
    setFormData({
      name: wh.name,
      location: wh.location,
      manager: wh.manager,
      capacity: wh.capacity || 1500,
    });
    setIsModalOpen(true);
  };

  const handleSaveWarehouse = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.location) return;

    if (editingWarehouse) {
      // Actualizar depósito existente
      setWarehouses((prev) =>
        prev.map((w) =>
          w.id === editingWarehouse.id
            ? {
                ...w,
                name: formData.name,
                location: formData.location,
                manager: formData.manager,
                capacity: Number(formData.capacity) || w.capacity,
              }
            : w
        )
      );
    } else {
      // Crear nuevo depósito
      const newWh = {
        id: Date.now(),
        name: formData.name,
        location: formData.location,
        manager: formData.manager,
        distinctProducts: 0,
        totalUnits: 0,
        activeAlerts: 0,
        capacity: Number(formData.capacity) || 1000,
      };
      setWarehouses([...warehouses, newWh]);
    }

    setIsModalOpen(false);
  };

  return (
    <div>
      {/* ENCABEZADO Y BOTÓN NUEVO DEPÓSITO */}
      <div className="section-heading">
        <div>
          <h2>Depósitos</h2>
          <span className="desc">
            Visión general de los {warehouses.length} depósitos operativos
          </span>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreateModal}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nuevo depósito
        </button>
      </div>

      {/* GRILLA DE TARJETAS DE DEPÓSITO */}
      <div className="warehouse-grid">
        {warehouses.map((wh) => (
          <div className="warehouse-card" key={wh.id}>
            <div className="warehouse-card-top">
              <div className="warehouse-icon">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21V9l9-6 9 6v12" />
                  <path d="M9 21v-6h6v6" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div className="warehouse-card-name">{wh.name}</div>
                <div className="warehouse-card-loc">{wh.location}</div>
              </div>
              <button
                className="btn btn-outline btn-sm"
                title="Editar depósito"
                onClick={() => handleOpenEditModal(wh)}
              >
                Editar
              </button>
            </div>

            <div className="warehouse-stat-row">
              <span className="k">Productos distintos</span>
              <span className="v">{wh.distinctProducts}</span>
            </div>
            <div className="warehouse-stat-row">
              <span className="k">Unidades totales</span>
              <span className="v">{wh.totalUnits.toLocaleString('es-AR')}</span>
            </div>
            <div className="warehouse-stat-row">
              <span className="k">Alertas activas</span>
              <span className="v" style={{ color: wh.activeAlerts > 0 ? 'var(--crit)' : 'inherit' }}>
                {wh.activeAlerts}
              </span>
            </div>
            <div className="warehouse-stat-row">
              <span className="k">Responsable</span>
              <span className="v">{wh.manager}</span>
            </div>
          </div>
        ))}
      </div>

      {/* PANEL DE DISTRIBUCIÓN DE STOCK CON BARRAS DINÁMICAS */}
      <div className="panel" style={{ marginTop: '24px' }}>
        <div className="panel-header">
          <h3>Distribución de unidades por depósito</h3>
        </div>
        <div className="panel-body">
          <div className="bar-chart">
            {warehouses.map((wh, idx) => {
              const widthPercentage = Math.round((wh.totalUnits / maxUnits) * 100);
              return (
                <div className="bar-row" key={wh.id}>
                  <span className="bar-row-label">{wh.name}</span>
                  <div className="bar-track">
                    <div
                      className={`bar-fill ${idx % 2 === 1 ? 'alt' : ''}`}
                      style={{ width: `${wh.totalUnits > 0 ? widthPercentage : 0}%` }}
                    ></div>
                  </div>
                  <span className="bar-row-value">{wh.totalUnits.toLocaleString('es-AR')}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MODAL CREAR / EDITAR DEPÓSITO */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingWarehouse ? `Editar: ${editingWarehouse.name}` : 'Crear Nuevo Depósito'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={handleSaveWarehouse}>
              {editingWarehouse ? 'Guardar Cambios' : 'Crear Depósito'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveWarehouse}>
          <div className="form-row">
            <div className="form-field">
              <label>Nombre del Depósito *</label>
              <input
                type="text"
                placeholder="Ej. Depósito Este"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="form-field">
              <label>Ubicación / Ciudad *</label>
              <input
                type="text"
                placeholder="Ej. Orán, Salta"
                required
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Responsable Asignado</label>
              <select
                value={formData.manager}
                onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
              >
                <option>Juan Pérez</option>
                <option>María Gómez</option>
                <option>Carlos Ruiz</option>
                <option>Administrador</option>
              </select>
            </div>

            <div className="form-field">
              <label>Capacidad Máxima (Uds.)</label>
              <input
                type="number"
                min="100"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Depositos;