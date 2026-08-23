function Perfil() {
  return (
    <div>
      <div className="section-heading">
        <div>
          <h2>Mi perfil</h2>
          <span className="desc">Información de la cuenta y el depósito asignado</span>
        </div>
      </div>

      <div className="profile-card">
        <div className="profile-head">
          <div className="profile-avatar">JP</div>
          <div>
            <div className="profile-head-name">Juan Pérez</div>
            <div className="profile-head-role">Encargado de Depósito</div>
          </div>
        </div>
        <div className="profile-body">
          <div className="spec-list">
            <div className="spec-row">
              <span className="k">Nombre</span>
              <span className="v">Juan Pérez</span>
            </div>
            <div className="spec-row">
              <span className="k">Rol</span>
              <span className="v">Encargado de Depósito</span>
            </div>
            <div className="spec-row">
              <span className="k">Email</span>
              <span className="v">juan.perez@marioaguerrisi.com</span>
            </div>
            <div className="spec-row">
              <span className="k">Último acceso</span>
              <span className="v">21/08/2026 · 09:05</span>
            </div>
            <div className="spec-row">
              <span className="k">Depósito asignado</span>
              <span className="v">Tienda Central</span>
            </div>
          </div>

          <div style={{ marginTop: '18px' }}>
            <button className="btn btn-outline" onClick={() => alert('Sesión cerrada.')}>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Perfil;