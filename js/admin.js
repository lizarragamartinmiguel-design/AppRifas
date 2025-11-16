// admin.js - Panel de administración con Parse CORREGIDO
class AdminSystem {
    constructor() {
        this.currentUser = null;
        this.isLoggedIn = false;
        this.rifas = [];
        this.init();
    }

    async init() {
        console.log('🚀 Iniciando panel de administración con Parse...');
        
        // Configurar Parse (reemplaza con tus credenciales)
        Parse.initialize("TU_APP_ID", "TU_JAVASCRIPT_KEY");
        Parse.serverURL = "https://parseapi.back4app.com/";
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Verificar autenticación
        await this.checkAuth();
        
        console.log('✅ Panel de administración inicializado');
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
        document.querySelectorAll('.nav-btn').forEach(btn => {
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
    }

    async login() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            // Login directo con Parse
            this.currentUser = await Parse.User.logIn(username, password);
            this.isLoggedIn = true;
            
            this.showSection('dashboard');
            this.showNotification('success', '✅ Inicio de sesión exitoso');
            
            // Cargar datos del dashboard
            await this.cargarRifas();
            
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
            
            // Cargar datos del dashboard
            await this.cargarRifas();
        } else {
            this.showSection('login');
            console.log('🔒 Mostrando formulario de login');
        }
    }

    showSection(sectionName) {
        // Ocultar todas las secciones
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
        } catch (error) {
            console.error('Error cargando rifas:', error);
            this.showNotification('error', 'Error al cargar las rifas');
        }
    }

    mostrarRifas() {
        const container = document.getElementById('rifasList');
        
        if (!container) {
            console.log('❌ No se encontró el contenedor rifasList');
            return;
        }

        if (this.rifas.length === 0) {
            container.innerHTML = '<p>No hay rifas creadas. Crea la primera rifa.</p>';
            return;
        }

        container.innerHTML = this.rifas.map((rifa, index) => `
            <div class="rifa-admin-card">
                <div class="rifa-header">
                    <h3>${rifa.titulo}</h3>
                    <div class="rifa-actions">
                        <button class="btn-edit" onclick="adminSystem.editarRifa('${rifa.id}')">✏️ Editar</button>
                        <button class="btn-delete" onclick="adminSystem.eliminarRifa('${rifa.id}')">🗑️ Eliminar</button>
                    </div>
                </div>
                <p class="rifa-desc">${rifa.descripcion}</p>
                <div class="rifa-stats">
                    <div class="stat">
                        <span class="stat-value">${rifa.numerosVendidos || 0}</span>
                        <span class="stat-label">Vendidos</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${rifa.totalNumeros - (rifa.numerosVendidos || 0)}</span>
                        <span class="stat-label">Disponibles</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">$${((rifa.numerosVendidos || 0) * rifa.precioNumero).toFixed(2)}</span>
                        <span class="stat-label">Recaudado</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${rifa.estado}</span>
                        <span class="stat-label">Estado</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async guardarRifa() {
        const form = document.getElementById('rifaConfigForm');
        if (!form) {
            console.error('❌ No se encontró el formulario de rifa');
            return;
        }
        
        const formData = new FormData(form);
        
        const rifaData = {
            titulo: formData.get('titulo'),
            descripcion: formData.get('descripcion'),
            precioNumero: parseFloat(formData.get('precioNumero')),
            totalNumeros: parseInt(formData.get('totalNumeros')),
            fechaSorteo: new Date(formData.get('fechaSorteo')),
            metaRecaudacion: parseFloat(formData.get('metaRecaudacion')),
            estado: 'activa',
            numerosVendidos: 0
        };

        try {
            const Rifa = Parse.Object.extend("Rifa");
            const rifa = new Rifa();
            
            await rifa.save(rifaData);
            this.showNotification('success', '✅ Rifa guardada correctamente');
            form.reset();
            await this.cargarRifas();
        } catch (error) {
            console.error('Error guardando rifa:', error);
            this.showNotification('error', '❌ Error al guardar la rifa: ' + error.message);
        }
    }

    async eliminarRifa(rifaId) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta rifa?')) {
            return;
        }

        try {
            const Rifa = Parse.Object.extend("Rifa");
            const query = new Parse.Query(Rifa);
            const rifa = await query.get(rifaId);
            
            await rifa.destroy();
            this.showNotification('success', '✅ Rifa eliminada correctamente');
            await this.cargarRifas();
        } catch (error) {
            console.error('Error eliminando rifa:', error);
            this.showNotification('error', '❌ Error al eliminar la rifa');
        }
    }

    async editarRifa(rifaId) {
        // Implementar edición de rifa
        this.showNotification('info', '✏️ Funcionalidad de edición en desarrollo');
    }

    switchTab(tabName) {
        // Actualizar navegación
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        // Mostrar contenido
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const activeTab = document.getElementById(`tab-${tabName}`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
    }

    loadDashboard() {
        this.updateQuickStats();
        this.switchTab('rifas');
    }

    updateQuickStats() {
        const totalVendidos = this.rifas.reduce((sum, rifa) => sum + (rifa.numerosVendidos || 0), 0);
        const totalRecaudado = this.rifas.reduce((sum, rifa) => sum + ((rifa.numerosVendidos || 0) * rifa.precioNumero), 0);
        
        const quickSold = document.getElementById('quickSold');
        const quickRaised = document.getElementById('quickRaised');
        const quickAvailable = document.getElementById('quickAvailable');
        
        if (quickSold) quickSold.textContent = totalVendidos;
        if (quickRaised) quickRaised.textContent = `$${totalRecaudado.toFixed(2)}`;
        if (quickAvailable) quickAvailable.textContent = this.rifas.length;
    }

    showNotification(type, message) {
        // Crear notificación simple
        alert(message); // Temporal - reemplazar con sistema de notificaciones bonito
        
        // Para un sistema de notificaciones más elaborado:
        /*
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
            background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
            z-index: 10000;
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
        */
    }
}

// Inicializar el sistema
document.addEventListener('DOMContentLoaded', () => {
    window.adminSystem = new AdminSystem();
});