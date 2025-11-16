// admin.js - Panel de administración con Parse + Back4App + Reservas - COMPLETAMENTE CORREGIDO

/* ---------- CONFIGURACIÓN DE PARSE ---------- */
Parse.initialize("NNxoqUEYiTkyO1MxAmxF6lGPeHhmqXUxG8bZGyPr", "hO0qRKANPmDLu3spkcDLLTBTeYIQSfCNJg8T0dUH");
Parse.serverURL = "https://parseapi.back4app.com/";

/* ---------- CLASES AUXILIARES ---------- */
class SistemaSorteo {
  async realizarSorteo(rifaId) {
    try {
      console.log('🎰 Iniciando sorteo para rifa:', rifaId);
      
      const Numeros = Parse.Object.extend("Numeros");
      const query = new Parse.Query(Numeros);
      
      // CORREGIDO: Usar Pointer para la relación
      const Rifa = Parse.Object.extend("Rifa");
      const rifaPointer = new Rifa();
      rifaPointer.id = rifaId;
      query.equalTo("rifaId", rifaPointer);
      
      query.equalTo("vendido", true);
      const numerosVendidos = await query.find();
      
      console.log('📊 Números vendidos encontrados:', numerosVendidos.length);
      
      if (numerosVendidos.length === 0) {
        throw new Error("No hay números vendidos para realizar el sorteo");
      }
      
      // Seleccionar ganador aleatorio
      const ganadorIndex = Math.floor(Math.random() * numerosVendidos.length);
      const numeroGanador = numerosVendidos[ganadorIndex];
      
      console.log('🎉 Número ganador:', numeroGanador.get('numero'));
      console.log('👤 Ganador:', numeroGanador.get('comprador'));
      
      // Crear registro del sorteo
      const Sorteo = Parse.Object.extend("Sorteo");
      const sorteo = new Sorteo();
      
      await sorteo.save({
        rifaId: rifaPointer, // CORREGIDO: Usar Pointer aquí también
        numeroGanador: numeroGanador.get('numero'),
        ganador: numeroGanador.get('comprador'),
        telefono: numeroGanador.get('telefono'),
        email: numeroGanador.get('email'),
        fechaSorteo: new Date(),
        totalParticipantes: numerosVendidos.length,
        estado: 'completado'
      });
      
      // Actualizar estado de la rifa
      const rifaQuery = new Parse.Query(Rifa);
      const rifa = await rifaQuery.get(rifaId);
      rifa.set('estado', 'sorteada');
      await rifa.save();
      
      console.log('✅ Sorteo completado exitosamente');
      
      return {
        ganador: numeroGanador.get('comprador'),
        numero: numeroGanador.get('numero'),
        telefono: numeroGanador.get('telefono'),
        email: numeroGanador.get('email'),
        fecha: new Date(),
        totalParticipantes: numerosVendidos.length
      };
      
    } catch (error) {
      console.error('❌ Error en realizarSorteo:', error);
      throw error;
    }
  }

  async obtenerHistorialSorteos() {
    const Sorteo = Parse.Object.extend("Sorteo");
    const query = new Parse.Query(Sorteo);
    query.include("rifaId");
    query.descending("fechaSorteo");
    const sorteos = await query.find();
    
    return sorteos.map(sorteo => ({
      id: sorteo.id,
      rifa: sorteo.get('rifaId') ? sorteo.get('rifaId').get('titulo') : 'Rifa no encontrada',
      ganador: sorteo.get('ganador'),
      numero: sorteo.get('numeroGanador'),
      telefono: sorteo.get('telefono'),
      fecha: sorteo.get('fechaSorteo'),
      participantes: sorteo.get('totalParticipantes')
    }));
  }
}

/* ---------- ADMIN SYSTEM COMPLETAMENTE CORREGIDO ---------- */
class AdminSystem {
  constructor() {
    this.currentUser = null;
    this.isLoggedIn = false;
    this.rifas = [];
    this.sorteos = [];
    this.sistemaSorteo = new SistemaSorteo();
    this.init();
  }

  async init() {
    console.log('🚀 Iniciando panel de administración con Parse...');
    await this.crearUsuarioAdmin();
    this.setupEventListeners();
    await this.checkAuth();
    await this.cargarConfiguracion();
    await this.cargarReservasPendientes();
    console.log('✅ Panel de administración inicializado');
  }

  async crearUsuarioAdmin() {
    try {
      await Parse.User.logIn("admin", "pagos10");
      console.log('✅ Usuario admin ya existe');
    } catch (loginError) {
      console.log('🔧 Creando usuario admin...');
      const user = new Parse.User();
      user.set("username", "admin");
      user.set("password", "pagos10");
      user.set("email", "admin@rifa-solidaria.com");
      try {
        await user.signUp();
        console.log('✅ Usuario admin creado exitosamente');
      } catch (signUpError) {
        console.log('ℹ️ Usuario admin ya existe o no se pudo crear:', signUpError.message);
      }
    }
  }

  setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.login();
      });
    }

    // Logout
    const logoutBtn = document.getElementById('btnLogout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        this.logout();
      });
    }

    // Navegación entre pestañas
    document.querySelectorAll('.nav-tabs li').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.target.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });

    // Configuración de rifas
    const rifaForm = document.getElementById('rifaConfigForm');
    if (rifaForm) {
      rifaForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.guardarRifa();
      });
    }

    // Botón realizar sorteo
    const btnRealizarSorteo = document.getElementById('btnRealizarSorteo');
    if (btnRealizarSorteo) {
      btnRealizarSorteo.addEventListener('click', () => {
        this.realizarSorteo();
      });
    }

    // Botón guardar configuración
    const btnGuardarConfig = document.getElementById('btnGuardarConfig');
    if (btnGuardarConfig) {
      btnGuardarConfig.addEventListener('click', () => {
        this.guardarConfiguracion();
      });
    }

    // Botón sincronizar contadores
    const btnSync = document.getElementById('btnSync');
    if (btnSync) {
      btnSync.addEventListener('click', () => {
        this.sincronizarVendidos();
      });
    }

    // Modal sorteo
    const closeModal = document.querySelector('.close-modal');
    if (closeModal) {
      closeModal.addEventListener('click', () => {
        this.cerrarModalSorteo();
      });
    }
  }

  async login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
      this.currentUser = await Parse.User.logIn(username, password);
      this.isLoggedIn = true;
      this.showSection('dashboard');
      this.showNotification('success', '✅ Inicio de sesión exitoso');
      await this.cargarRifas();
      await this.cargarSorteos();
    } catch (error) {
      console.error('❌ Error en login:', error);
      this.showNotification('error', '❌ Usuario o contraseña incorrectos');
    }
  }

  async logout() {
    try {
      await Parse.User.logOut();
      this.currentUser = null;
      this.isLoggedIn = false;
      this.showSection('login');
      this.showNotification('info', '👋 Sesión cerrada correctamente');
    } catch (error) {
      console.error('Error en logout:', error);
    }
  }

  async checkAuth() {
    const currentUser = Parse.User.current();
    if (currentUser) {
      this.currentUser = currentUser;
      this.isLoggedIn = true;
      this.showSection('dashboard');
      console.log('✅ Usuario ya autenticado:', currentUser.get("username"));
      await this.cargarRifas();
      await this.cargarSorteos();
    } else {
      this.showSection('login');
      console.log('🔒 Mostrando formulario de login');
    }
  }

  showSection(sectionName) {
    const loginSection = document.getElementById('loginSection');
    const dashboard = document.getElementById('dashboard');
    
    if (loginSection) loginSection.style.display = 'none';
    if (dashboard) dashboard.style.display = 'none';
    
    if (sectionName === 'login' && loginSection) {
      loginSection.style.display = 'flex';
    } else if (sectionName === 'dashboard' && dashboard) {
      dashboard.style.display = 'block';
      this.loadDashboard();
    }
  }

  async cargarRifas() {
    try {
      const Rifa = Parse.Object.extend("Rifa");
      const query = new Parse.Query(Rifa);
      query.ascending('createdAt');
      const results = await query.find();
      
      this.rifas = results.map(rifa => ({
        id: rifa.id,
        titulo: rifa.get('titulo') || 'Sin título',
        descripcion: rifa.get('descripcion') || '',
        precioNumero: rifa.get('precioNumero') || 0,
        totalNumeros: rifa.get('totalNumeros') || 0,
        numerosVendidos: rifa.get('numerosVendidos') || 0,
        fechaSorteo: rifa.get('fechaSorteo'),
        metaRecaudacion: rifa.get('metaRecaudacion') || 0,
        estado: rifa.get('estado') || 'activa'
      }));
      
      this.mostrarRifas();
      this.actualizarSelectSorteo();
      this.updateQuickStats();
    } catch (error) {
      console.error('Error cargando rifas:', error);
      this.showNotification('error', 'Error al cargar las rifas');
    }
  }

  mostrarRifas() {
    const container = document.getElementById('rifasList');
    const dashboardContainer = document.getElementById('rifasListDashboard');
    
    if (!container && !dashboardContainer) return;

    if (this.rifas.length === 0) {
      const emptyMsg = '<p>No hay rifas creadas. Crea la primera rifa.</p>';
      if (container) container.innerHTML = emptyMsg;
      if (dashboardContainer) dashboardContainer.innerHTML = emptyMsg;
      return;
    }

    const html = this.rifas.map(rifa => `
      <div class="rifa-admin-card">
        <div class="rifa-header">
          <h3>${rifa.titulo}</h3>
          <div class="rifa-actions">
            <button class="btn-sorteo" ${rifa.estado === 'sorteada' || rifa.numerosVendidos === 0 ? 'disabled' : ''} onclick="adminSystem.prepararSorteo('${rifa.id}')">🎰 Sorteo</button>
            <button class="btn-edit" onclick="adminSystem.editarRifa('${rifa.id}')">✏️ Editar</button>
            <button class="btn-delete" onclick="adminSystem.eliminarRifa('${rifa.id}')">🗑️ Eliminar</button>
            <button class="btn-vender" onclick="adminSystem.marcarComoVendido('${rifa.id}')">💰 Marcar Nº Vendido</button>
            <button class="btn-debug" onclick="adminSystem.verificarNumerosRifa('${rifa.id}')">🐛 Debug</button>
          </div>
        </div>
        <p class="rifa-desc">${rifa.descripcion}</p>
        <div class="rifa-stats">
          <div class="stat"><span class="stat-value">${rifa.numerosVendidos}</span><span class="stat-label">Vendidos</span></div>
          <div class="stat"><span class="stat-value">${rifa.totalNumeros - rifa.numerosVendidos}</span><span class="stat-label">Disponibles</span></div>
          <div class="stat"><span class="stat-value">$${(rifa.numerosVendidos * rifa.precioNumero).toFixed(2)}</span><span class="stat-label">Recaudado</span></div>
          <div class="stat"><span class="stat-value">${rifa.estado}</span><span class="stat-label">Estado</span></div>
        </div>
      </div>
    `).join('');
    
    if (container) container.innerHTML = html;
    if (dashboardContainer) dashboardContainer.innerHTML = html;
  }

  editarRifa(rifaId) {
    this.showNotification('info', '✏️ Función de edición en desarrollo');
  }

  async guardarRifa() {
    const titulo = document.getElementById('titulo')?.value.trim();
    const descripcion = document.getElementById('descripcion')?.value.trim();
    const precioNumero = parseFloat(document.getElementById('precioNumero')?.value) || 0;
    const totalNumeros = parseInt(document.getElementById('totalNumeros')?.value) || 0;
    const rawFecha = document.getElementById('fechaSorteo')?.value;
    const metaRecaudacion = parseFloat(document.getElementById('metaRecaudacion')?.value) || 0;

    if (!titulo || !descripcion || !rawFecha) {
      this.showNotification('error', '❌ Título, descripción y fecha son obligatorios');
      return;
    }
    if (precioNumero <= 0 || totalNumeros <= 0 || metaRecaudacion <= 0) {
      this.showNotification('error', '❌ Precio, cantidad de números y meta deben ser mayores a 0');
      return;
    }

    const rifaData = {
      titulo,
      descripcion,
      precioNumero,
      totalNumeros,
      fechaSorteo: new Date(rawFecha).toISOString(),
      metaRecaudacion,
      estado: 'activa',
      numerosVendidos: 0
    };

    try {
      const Rifa = Parse.Object.extend("Rifa");
      const rifa = new Rifa();
      await rifa.save(rifaData);
      await this.crearNumerosParaRifa(rifa.id, totalNumeros);
      this.showNotification('success', '✅ Rifa y números creados correctamente');
      if (document.getElementById('rifaConfigForm')) {
        document.getElementById('rifaConfigForm').reset();
      }
      await this.cargarRifas();
    } catch (err) {
      console.error('❌ Error guardando rifa:', err);
      this.showNotification('error', '❌ Error al crear la rifa: ' + err.message);
    }
  }

  async crearNumerosParaRifa(rifaId, totalNumeros) {
    try {
      const Numeros = Parse.Object.extend("Numeros");
      const Rifa = Parse.Object.extend("Rifa");
      const rifaPointer = new Rifa();
      rifaPointer.id = rifaId;

      const numeros = [];
      for (let i = 1; i <= totalNumeros; i++) {
        const numero = new Numeros();
        numero.set('rifaId', rifaPointer); // CORREGIDO: Usar Pointer en lugar de string
        numero.set('numero', i);
        numero.set('vendido', false);
        numero.set('comprador', '');
        numero.set('telefono', '');
        numero.set('email', '');
        numeros.push(numero);
      }
      
      const batchSize = 50;
      for (let i = 0; i < numeros.length; i += batchSize) {
        await Parse.Object.saveAll(numeros.slice(i, i + batchSize));
      }
      
      console.log(`✅ ${totalNumeros} números creados para la rifa ${rifaId}`);
    } catch (error) {
      console.error('Error creando números:', error);
      throw error;
    }
  }

  async eliminarRifa(rifaId) {
    if (!confirm('¿Estás seguro de eliminar esta rifa y todos sus números?')) return;
    try {
      const Numeros = Parse.Object.extend("Numeros");
      const queryNumeros = new Parse.Query(Numeros);
      
      // CORREGIDO: Usar Pointer para la búsqueda
      const Rifa = Parse.Object.extend("Rifa");
      const rifaPointer = new Rifa();
      rifaPointer.id = rifaId;
      queryNumeros.equalTo("rifaId", rifaPointer);
      
      const numeros = await queryNumeros.find();
      if (numeros.length > 0) await Parse.Object.destroyAll(numeros);
      
      const RifaClass = Parse.Object.extend("Rifa");
      const queryRifa = new Parse.Query(RifaClass);
      const rifa = await queryRifa.get(rifaId);
      await rifa.destroy();
      
      this.showNotification('success', '✅ Rifa y números eliminados');
      await this.cargarRifas();
    } catch (error) {
      this.showNotification('error', '❌ Error al eliminar la rifa');
    }
  }

  actualizarSelectSorteo() {
    const select = document.getElementById('selectRifaSorteo');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Selecciona una rifa --</option>';
    this.rifas
      .filter(r => r.estado === 'activa' && r.numerosVendidos > 0)
      .forEach(r => {
        const option = document.createElement('option');
        option.value = r.id;
        option.textContent = `${r.titulo} (${r.numerosVendidos} vendidos)`;
        select.appendChild(option);
      });
  }

  prepararSorteo(rifaId) {
    const select = document.getElementById('selectRifaSorteo');
    if (select) {
      select.value = rifaId;
    }
    this.switchTab('sorteos');
  }

  async realizarSorteo() {
    const select = document.getElementById('selectRifaSorteo');
    if (!select) return;
    
    const rifaId = select.value;
    if (!rifaId) return this.showNotification('error', '❌ Selecciona una rifa primero');
    
    const rifa = this.rifas.find(r => r.id === rifaId);
    if (!rifa) return this.showNotification('error', '❌ Rifa no encontrada');
    
    if (rifa.numerosVendidos === 0) {
      return this.showNotification('error', '❌ No hay números vendidos para sortear');
    }
    
    if (!confirm(`¿Estás seguro de realizar el sorteo para "${rifa.titulo}"? Esta acción no se puede deshacer.`)) return;

    try {
      this.showNotification('info', '🎰 Realizando sorteo...');
      
      // AGREGADO: Verificación adicional antes del sorteo
      const verificacion = await this.verificarNumerosRifa(rifaId);
      if (verificacion.vendidos === 0) {
        return this.showNotification('error', '❌ No se encontraron números vendidos. Revisa la sincronización.');
      }
      
      console.log(`🔍 Verificación - Rifas vendidos: ${verificacion.vendidos}`);
      
      // Proceder con el sorteo
      const resultado = await this.sistemaSorteo.realizarSorteo(rifaId);
      this.mostrarResultadoSorteo(resultado, rifa);
      await this.cargarRifas();
      await this.cargarSorteos();
      
    } catch (error) {
      console.error('❌ Error en el sorteo:', error);
      this.showNotification('error', '❌ Error en el sorteo: ' + error.message);
    }
  }

  mostrarResultadoSorteo(resultado, rifa) {
    const modal = document.getElementById('modalSorteo');
    const content = document.getElementById('resultadoSorteoContent');
    if (!modal || !content) return;
    
    content.innerHTML = `
      <div class="resultado-sorteo">
        <h4>🎉 ¡Tenemos un ganador!</h4>
        <div class="ganador-info"><strong>${resultado.ganador}</strong></div>
        <p>Número ganador: <strong>${resultado.numero}</strong></p>
        <p>Teléfono: <strong>${resultado.telefono}</strong></p>
        <p>Email: <strong>${resultado.email || 'No proporcionado'}</strong></p>
        <p>Rifa: <strong>${rifa.titulo}</strong></p>
        <p>Total participantes: <strong>${resultado.totalParticipantes}</strong></p>
        <p>Fecha: <strong>${new Date(resultado.fecha).toLocaleString()}</strong></p>
      </div>
      <div style="text-align: center; margin-top: 20px;"><button class="btn-login" onclick="adminSystem.cerrarModalSorteo()">Cerrar</button></div>
    `;
    modal.style.display = 'flex';
  }

  cerrarModalSorteo() {
    const modal = document.getElementById('modalSorteo');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  async cargarSorteos() {
    try {
      this.sorteos = await this.sistemaSorteo.obtenerHistorialSorteos();
      this.mostrarHistorialSorteos();
    } catch (error) {
      console.error('Error cargando sorteos:', error);
    }
  }

  mostrarHistorialSorteos() {
    const container = document.getElementById('historialSorteos');
    if (!container) return;
    
    container.innerHTML = this.sorteos.length === 0
      ? '<p>No hay sorteos realizados.</p>'
      : this.sorteos.map(sorteo => `
        <div class="rifa-admin-card">
          <div class="rifa-header"><h3>${sorteo.rifa}</h3><span class="stat-value">#${sorteo.numero}</span></div>
          <div class="rifa-stats">
            <div class="stat"><span class="stat-value">${sorteo.ganador}</span><span class="stat-label">Ganador</span></div>
            <div class="stat"><span class="stat-value">${sorteo.telefono}</span><span class="stat-label">Teléfono</span></div>
            <div class="stat"><span class="stat-value">${sorteo.participantes}</span><span class="stat-label">Participantes</span></div>
            <div class="stat"><span class="stat-value">${new Date(sorteo.fecha).toLocaleDateString()}</span><span class="stat-label">Fecha</span></div>
          </div>
        </div>
      `).join('');
  }

  async cargarConfiguracion() {
    try {
      const Config = Parse.Object.extend("Config");
      const query = new Parse.Query(Config);
      const config = await query.first();
      if (config) {
        if (document.getElementById('whatsappNumber')) {
          document.getElementById('whatsappNumber').value = config.get('whatsappNumber') || '';
        }
        if (document.getElementById('whatsappMessage')) {
          document.getElementById('whatsappMessage').value = config.get('whatsappMessage') || '';
        }
        if (document.getElementById('sorteoGrabacion')) {
          document.getElementById('sorteoGrabacion').value = config.get('sorteoGrabacion') || 'si';
        }
        if (document.getElementById('mensajeGanador')) {
          document.getElementById('mensajeGanador').value = config.get('mensajeGanador') || '';
        }
      }
    } catch (error) {
      console.log('No hay configuración guardada o error:', error.message);
    }
  }

  async guardarConfiguracion() {
    try {
      const Config = Parse.Object.extend("Config");
      const query = new Parse.Query(Config);
      let config = await query.first();
      if (!config) config = new Config();
      await config.save({
        whatsappNumber: document.getElementById('whatsappNumber')?.value || '',
        whatsappMessage: document.getElementById('whatsappMessage')?.value || '',
        sorteoGrabacion: document.getElementById('sorteoGrabacion')?.value || 'si',
        mensajeGanador: document.getElementById('mensajeGanador')?.value || ''
      });
      this.showNotification('success', '✅ Configuración guardada');
    } catch (error) {
      this.showNotification('error', '❌ Error guardando configuración');
    }
  }

  switchTab(tabName) {
    document.querySelectorAll('.nav-tabs li').forEach(li => li.classList.remove('active'));
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeTab) {
      activeTab.classList.add('active');
    }

    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) {
      targetTab.classList.add('active');
    }
  }

  loadDashboard() {
    this.updateQuickStats();
    this.switchTab('dashboard');
  }

  updateQuickStats() {
    const totalVendidos = this.rifas.reduce((sum, rifa) => sum + rifa.numerosVendidos, 0);
    const totalRecaudado = this.rifas.reduce((sum, rifa) => sum + (rifa.numerosVendidos * rifa.precioNumero), 0);
    
    const quickSold = document.getElementById('quickSold');
    const quickRaised = document.getElementById('quickRaised');
    const quickAvailable = document.getElementById('quickAvailable');
    const quickParticipants = document.getElementById('quickParticipants');
    
    if (quickSold) quickSold.textContent = totalVendidos;
    if (quickRaised) quickRaised.textContent = `$${totalRecaudado.toFixed(2)}`;
    if (quickAvailable) quickAvailable.textContent = this.rifas.filter(r => r.estado === 'activa').length;
    if (quickParticipants) quickParticipants.textContent = this.rifas.length * 10;
  }

  showNotification(type, message) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 5px;
      color: white;
      z-index: 10000;
      font-weight: bold;
      max-width: 300px;
      ${type === 'success' ? 'background: #4CAF50;' : ''}
      ${type === 'error' ? 'background: #f44336;' : ''}
      ${type === 'info' ? 'background: #2196F3;' : ''}
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  /* ---------- SINCRONIZAR VENDIDOS ---------- */
  async sincronizarVendidos() {
    try {
      for (const rifa of this.rifas) {
        const Numeros = Parse.Object.extend("Numeros");
        const query = new Parse.Query(Numeros);
        
        // CORREGIDO: Usar Pointer para la búsqueda
        const Rifa = Parse.Object.extend("Rifa");
        const rifaPointer = new Rifa();
        rifaPointer.id = rifa.id;
        query.equalTo("rifaId", rifaPointer);
        
        query.equalTo("vendido", true);
        const vendidos = await query.count();

        if (vendidos !== rifa.numerosVendidos) {
          const RifaClass = Parse.Object.extend("Rifa");
          const obj = await new Parse.Query(RifaClass).get(rifa.id);
          obj.set("numerosVendidos", vendidos);
          await obj.save();
          rifa.numerosVendidos = vendidos;
        }
      }
      this.mostrarRifas();
      this.updateQuickStats();
      this.showNotification('success', "✅ Contadores sincronizados");
    } catch (e) {
      this.showNotification('error', "❌ Error: " + e.message);
    }
  }

  /* ---------- RESERVAS ---------- */
  async marcarComoVendido(rifaId) {
    const numero = prompt("¿Qué número querés marcar como vendido? (1-N)");
    if (!numero || isNaN(numero)) return;
    try {
      const Numeros = Parse.Object.extend("Numeros");
      const query = new Parse.Query(Numeros);
      
      // CORREGIDO: Usar Pointer para la búsqueda
      const Rifa = Parse.Object.extend("Rifa");
      const rifaPointer = new Rifa();
      rifaPointer.id = rifaId;
      query.equalTo("rifaId", rifaPointer);
      
      query.equalTo("numero", parseInt(numero));
      const numeroObj = await query.first();
      
      if (!numeroObj) return this.showNotification('error', "❌ Número no encontrado");
      if (numeroObj.get('vendido')) return this.showNotification('info', "❌ Ese número ya está vendido");
      
      numeroObj.set('vendido', true);
      numeroObj.set('comprador', 'Admin Manual');
      numeroObj.set('telefono', '+5490000000000');
      numeroObj.set('email', 'admin@manual.com');
      await numeroObj.save();
      
      const RifaClass = Parse.Object.extend("Rifa");
      const rifaObj = await new Parse.Query(RifaClass).get(rifaId);
      rifaObj.increment('numerosVendidos', 1);
      await rifaObj.save();
      
      this.showNotification('success', "✅ Número marcado como vendido");
      await this.cargarRifas();
    } catch (err) {
      this.showNotification('error', "❌ Error: " + err.message);
    }
  }

  async cargarReservasPendientes() {
    try {
      const Reserva = Parse.Object.extend("Reserva");
      const query = new Parse.Query(Reserva);
      query.equalTo('estado', 'pendiente');
      query.include('numeroId');
      query.ascending('fechaReserva');
      const reservas = await query.find();
      
      const container = document.getElementById('reservasList');
      if (!container) return;
      
      container.innerHTML = reservas.map(res => {
        const numero = res.get('numeroId');
        return `
          <div class="reserva-card">
            <div class="reserva-info">
              <strong>Número:</strong> #${numero?.get('numero') || 'N/A'}<br>
              <strong>Nombre:</strong> ${res.get('nombre')}<br>
              <strong>Teléfono:</strong> ${res.get('telefono')}<br>
              <strong>Fecha:</strong> ${new Date(res.get('fechaReserva')).toLocaleString()}<br>
            </div>
            <div class="reserva-actions">
              <button class="btn-confirmar" onclick="adminSystem.confirmarReserva('${res.id}')">✅ Confirmar</button>
              <button class="btn-cancelar" onclick="adminSystem.cancelarReserva('${res.id}')">❌ Cancelar</button>
            </div>
          </div>
        `;
      }).join('');
      
      if (reservas.length === 0) container.innerHTML = '<p>No hay reservas pendientes.</p>';
    } catch (err) {
      console.error('Error cargando reservas:', err);
    }
  }

  async confirmarReserva(reservaId) {
    if (!confirm('¿Confirmás este número como vendido?')) return;
    try {
      const Reserva = Parse.Object.extend("Reserva");
      const reserva = await new Parse.Query(Reserva).get(reservaId);
      const numeroObj = reserva.get('numeroId');
      
      numeroObj.set('vendido', true);
      numeroObj.set('comprador', reserva.get('nombre'));
      numeroObj.set('telefono', reserva.get('telefono'));
      numeroObj.set('email', reserva.get('email'));
      await numeroObj.save();
      
      reserva.set('estado', 'confirmado');
      await reserva.save();
      
      // CORREGIDO: Obtener la rifa del número y actualizar contador
      const rifa = numeroObj.get('rifaId');
      if (rifa) {
        const rifaActualizada = await new Parse.Query(Parse.Object.extend("Rifa")).get(rifa.id);
        const nuevosVendidos = await new Parse.Query(Parse.Object.extend("Numeros"))
          .equalTo("rifaId", rifa)
          .equalTo("vendido", true)
          .count();
          
        rifaActualizada.set("numerosVendidos", nuevosVendidos);
        await rifaActualizada.save();
      }
      
      this.showNotification('success', "✅ Reserva confirmada");
      await this.cargarReservasPendientes();
      await this.cargarRifas();
    } catch (err) {
      this.showNotification('error', "❌ Error: " + err.message);
    }
  }

  async cancelarReserva(reservaId) {
    if (!confirm('¿Cancelás esta reserva? El número quedará disponible.')) return;
    try {
      const Reserva = Parse.Object.extend("Reserva");
      const reserva = await new Parse.Query(Reserva).get(reservaId);
      const numeroObj = reserva.get('numeroId');
      
      numeroObj.set('vendido', false);
      numeroObj.unset('comprador');
      numeroObj.unset('telefono');
      numeroObj.unset('email');
      await numeroObj.save();
      
      reserva.set('estado', 'cancelado');
      await reserva.save();
      
      // CORREGIDO: Obtener la rifa del número y actualizar contador
      const rifa = numeroObj.get('rifaId');
      if (rifa) {
        const rifaActualizada = await new Parse.Query(Parse.Object.extend("Rifa")).get(rifa.id);
        const nuevosVendidos = await new Parse.Query(Parse.Object.extend("Numeros"))
          .equalTo("rifaId", rifa)
          .equalTo("vendido", true)
          .count();
          
        rifaActualizada.set("numerosVendidos", nuevosVendidos);
        await rifaActualizada.save();
      }
      
      this.showNotification('success', "✅ Reserva cancelada");
      await this.cargarReservasPendientes();
      await this.cargarRifas();
    } catch (err) {
      this.showNotification('error', "❌ Error: " + err.message);
    }
  }

  /* ---------- FUNCIÓN DE DEBUG AGREGADA ---------- */
  async verificarNumerosRifa(rifaId) {
    try {
      console.log('🔍 Iniciando verificación para rifa:', rifaId);
      
      const Numeros = Parse.Object.extend("Numeros");
      const Rifa = Parse.Object.extend("Rifa");
      const rifaPointer = new Rifa();
      rifaPointer.id = rifaId;
      
      // Consultar todos los números
      const queryTodos = new Parse.Query(Numeros);
      queryTodos.equalTo("rifaId", rifaPointer);
      const todosNumeros = await queryTodos.find();
      
      // Consultar números vendidos
      const queryVendidos = new Parse.Query(Numeros);
      queryVendidos.equalTo("rifaId", rifaPointer);
      queryVendidos.equalTo("vendido", true);
      const numerosVendidos = await queryVendidos.find();
      
      console.log('🔍 DEBUG - Todos los números:', todosNumeros.length);
      console.log('🔍 DEBUG - Números vendidos:', numerosVendidos.length);
      
      // Mostrar detalles de los números vendidos
      if (numerosVendidos.length > 0) {
        console.log('🔍 DEBUG - Detalle números vendidos:');
        numerosVendidos.forEach(numero => {
          console.log(`   - Número: ${numero.get('numero')}, Comprador: ${numero.get('comprador')}, Vendido: ${numero.get('vendido')}`);
        });
      } else {
        console.log('🔍 DEBUG - No se encontraron números vendidos');
        
        // Mostrar algunos números disponibles para referencia
        const numerosDisponibles = todosNumeros.slice(0, 5);
        console.log('🔍 DEBUG - Primeros 5 números disponibles:');
        numerosDisponibles.forEach(numero => {
          console.log(`   - Número: ${numero.get('numero')}, Vendido: ${numero.get('vendido')}`);
        });
      }
      
      const resultado = {
        todos: todosNumeros.length,
        vendidos: numerosVendidos.length,
        detalles: numerosVendidos.map(n => ({
          numero: n.get('numero'),
          comprador: n.get('comprador'),
          vendido: n.get('vendido')
        }))
      };
      
      // Mostrar notificación con el resultado
      this.showNotification('info', `🔍 Debug: ${resultado.vendidos} vendidos de ${resultado.todos} totales`);
      
      return resultado;
      
    } catch (error) {
      console.error('❌ Error en verificación:', error);
      this.showNotification('error', '❌ Error en verificación: ' + error.message);
      return { todos: 0, vendidos: 0, detalles: [] };
    }
  }
}

/* ---------- INICIALIZAR ---------- */
document.addEventListener('DOMContentLoaded', () => {
  window.adminSystem = new AdminSystem();
});