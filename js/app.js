// app.js - Sistema de múltiples rifas con Parse
class RifaSystem {
    constructor() {
        this.rifas = [];
        this.rifaActual = null;
        this.numerosVendidos = [];
        this.currentUser = null;
        this.init();
    }

    async init() {
        console.log('🚀 Iniciando sistema de rifas con Parse...');
        
        // Inicializar Parse
        ParseConfig.init();
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Cargar rifas disponibles
        await this.cargarRifas();
        
        console.log('✅ Sistema de rifas inicializado');
    }

    setupEventListeners() {
        // Botón volver
        document.getElementById('btnBack').addEventListener('click', () => {
            this.mostrarSelectorRifas();
        });

        // Modal de compra
        document.querySelector('.close-modal')?.addEventListener('click', () => {
            this.ocultarModal();
        });

        document.getElementById('btnCancelarCompra')?.addEventListener('click', () => {
            this.ocultarModal();
        });

        // Formulario de compra
        document.getElementById('compraForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.procesarCompra();
        });

        // Cerrar modal al hacer clic fuera
        document.getElementById('compraModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'compraModal') {
                this.ocultarModal();
            }
        });
    }

    async cargarRifas() {
        try {
            console.log('📥 Cargando rifas desde Parse...');
            
            this.rifas = await ParseConfig.getRifas();
            console.log(`✅ ${this.rifas.length} rifas cargadas`);
            this.mostrarRifas();
            
        } catch (error) {
            console.error('❌ Error cargando rifas:', error);
            this.mostrarError('Error al cargar las rifas disponibles');
        }
    }

    mostrarRifas() {
        const grid = document.getElementById('rifasGrid');
        
        if (this.rifas.length === 0) {
            grid.innerHTML = '<div class="error-message">No hay rifas disponibles en este momento</div>';
            return;
        }

        grid.innerHTML = this.rifas.map(rifa => `
            <div class="rifa-card" data-rifa-id="${rifa.id}">
                <div class="rifa-status ${this.getStatusClass(rifa.estado)}">
                    ${this.getStatusText(rifa.estado)}
                </div>
                <h3>${rifa.titulo}</h3>
                <p class="rifa-desc">${rifa.descripcion}</p>
                <div class="rifa-meta">
                    <span class="meta-item">🎫 $${rifa.precioNumero}</span>
                    <span class="meta-item">📅 ${this.formatearFecha(rifa.fechaSorteo)}</span>
                    <span class="meta-item">🎯 $${rifa.metaRecaudacion}</span>
                </div>
                <div class="rifa-stats">
                    <div class="stat-mini">
                        <span class="number">${rifa.numerosVendidos || 0}</span>
                        <span class="label">Vendidos</span>
                    </div>
                    <div class="stat-mini">
                        <span class="number">${this.calcularDisponibles(rifa)}</span>
                        <span class="label">Disponibles</span>
                    </div>
                </div>
                <button class="btn-primary" onclick="rifaSystem.seleccionarRifa('${rifa.id}')" 
                        ${rifa.estado !== 'activa' ? 'disabled' : ''}>
                    ${rifa.estado === 'activa' ? '🎯 Participar' : '⏳ Próximamente'}
                </button>
            </div>
        `).join('');
    }

    getStatusClass(estado) {
        const statusMap = {
            'activa': 'status-active',
            'proximamente': 'status-pending',
            'finalizada': 'status-finished'
        };
        return statusMap[estado] || 'status-pending';
    }

    getStatusText(estado) {
        const textMap = {
            'activa': '🟢 Activa',
            'proximamente': '🟡 Próximamente',
            'finalizada': '🔴 Finalizada'
        };
        return textMap[estado] || estado;
    }

    calcularDisponibles(rifa) {
        const vendidos = rifa.numerosVendidos || 0;
        return rifa.totalNumeros - vendidos;
    }

    formatearFecha(fechaString) {
        const fecha = new Date(fechaString);
        return fecha.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    async seleccionarRifa(rifaId) {
        console.log('🎯 Seleccionando rifa:', rifaId);
        
        this.rifaActual = this.rifas.find(r => r.id === rifaId);
        
        if (!this.rifaActual) {
            this.mostrarError('Rifa no encontrada');
            return;
        }

        if (this.rifaActual.estado !== 'activa') {
            this.mostrarError('Esta rifa no está activa en este momento');
            return;
        }

        // Mostrar contenido de la rifa
        this.mostrarContenidoRifa();
        
        // Cargar números vendidos
        await this.cargarNumerosVendidos();
        
        // Actualizar interfaz
        this.actualizarInterfazRifa();
    }

    mostrarContenidoRifa() {
        document.getElementById('rifaContent').style.display = 'block';
        document.querySelector('.rifa-selector').style.display = 'none';
    }

    mostrarSelectorRifas() {
        document.getElementById('rifaContent').style.display = 'none';
        document.querySelector('.rifa-selector').style.display = 'block';
        this.rifaActual = null;
        this.numerosVendidos = [];
    }

    async cargarNumerosVendidos() {
        if (!this.rifaActual) return;
        
        try {
            this.numerosVendidos = await ParseConfig.getNumerosVendidos(this.rifaActual.id);
            console.log(`✅ ${this.numerosVendidos.length} números vendidos cargados`);
            
        } catch (error) {
            console.error('❌ Error cargando números vendidos:', error);
        }
    }

    actualizarInterfazRifa() {
        if (!this.rifaActual) return;

        // Actualizar información básica
        document.getElementById('rifaTitle').textContent = this.rifaActual.titulo;
        document.getElementById('rifaDescription').textContent = this.rifaActual.descripcion;
        document.getElementById('rifaPrecio').textContent = this.rifaActual.precioNumero;
        document.getElementById('rifaFecha').textContent = this.formatearFecha(this.rifaActual.fechaSorteo);
        document.getElementById('rifaMeta').textContent = this.rifaActual.metaRecaudacion;

        // Calcular estadísticas
        const vendidos = this.numerosVendidos.length;
        const disponibles = this.rifaActual.totalNumeros - vendidos;
        const recaudado = vendidos * this.rifaActual.precioNumero;
        const porcentaje = (recaudado / this.rifaActual.metaRecaudacion * 100).toFixed(1);

        // Actualizar estadísticas
        document.getElementById('statVendidos').textContent = vendidos;
        document.getElementById('statDisponibles').textContent = disponibles;
        document.getElementById('statRecaudado').textContent = `$${recaudado}`;
        document.getElementById('statPorcentaje').textContent = `${porcentaje}%`;

        // Actualizar barra de progreso
        document.getElementById('progressFill').style.width = `${Math.min(porcentaje, 100)}%`;
        document.getElementById('progressText').textContent = `${porcentaje}% completado`;

        // Generar grid de números
        this.generarGridNumeros();
    }

    generarGridNumeros() {
        const grid = document.getElementById('numbersGrid');
        const numeros = [];
        
        for (let i = 1; i <= this.rifaActual.totalNumeros; i++) {
            const vendido = this.numerosVendidos.includes(i);
            numeros.push(`
                <div class="number-item ${vendido ? 'sold' : 'available'}" 
                     data-numero="${i}"
                     onclick="rifaSystem.seleccionarNumero(${i})">
                    ${i}
                    ${vendido ? '<div class="sold-badge">✗</div>' : ''}
                </div>
            `);
        }
        
        grid.innerHTML = numeros.join('');
    }

    seleccionarNumero(numero) {
        if (this.numerosVendidos.includes(numero)) {
            this.mostrarError('Este número ya está vendido');
            return;
        }

        // Quitar selección anterior
        document.querySelectorAll('.number-item.selected').forEach(item => {
            item.classList.remove('selected');
        });

        // Seleccionar nuevo número
        const numeroElement = document.querySelector(`[data-numero="${numero}"]`);
        numeroElement.classList.add('selected');

        // Mostrar modal de compra
        this.mostrarModalCompra(numero);
    }

    mostrarModalCompra(numero) {
        document.getElementById('modalNumero').textContent = numero;
        document.getElementById('numeroSeleccionado').value = numero;
        document.getElementById('compraModal').classList.add('active');
        
        // Limpiar formulario
        document.getElementById('compraForm').reset();
    }

    ocultarModal() {
        document.getElementById('compraModal').classList.remove('active');
        
        // Quitar selección del número
        document.querySelectorAll('.number-item.selected').forEach(item => {
            item.classList.remove('selected');
        });
    }

    async procesarCompra() {
        const numero = parseInt(document.getElementById('numeroSeleccionado').value);
        const nombre = document.getElementById('nombreComprador').value.trim();
        const telefono = document.getElementById('telefonoComprador').value.trim();
        const email = document.getElementById('emailComprador').value.trim();

        // Validaciones básicas
        if (!nombre || !telefono) {
            this.mostrarError('Por favor completa todos los campos obligatorios');
            return;
        }

        if (this.numerosVendidos.includes(numero)) {
            this.mostrarError('Este número ya fue vendido. Por favor elige otro.');
            this.ocultarModal();
            return;
        }

        try {
            console.log('🔄 Procesando compra...', { numero, nombre, telefono, email });

            // Guardar en Parse
            await ParseConfig.saveNumeroVendido(
                this.rifaActual.id,
                numero,
                nombre,
                telefono,
                email
            );

            // Actualizar estadísticas
            await ParseConfig.updateRifaStats(this.rifaActual.id);

            console.log('✅ Compra procesada exitosamente');

            // Mostrar confirmación
            this.mostrarMensaje('success', `¡Felicidades! Has reservado el número ${numero}. Te contactaremos pronto.`);

            // Actualizar interfaz
            this.ocultarModal();
            await this.cargarNumerosVendidos();
            this.actualizarInterfazRifa();

        } catch (error) {
            console.error('❌ Error procesando compra:', error);
            this.mostrarError('Error al procesar la compra. Intenta nuevamente.');
        }
    }

    mostrarMensaje(tipo, mensaje) {
        const mensajeDiv = document.createElement('div');
        mensajeDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            z-index: 10000;
            background: ${tipo === 'success' ? '#27ae60' : '#e74c3c'};
            animation: slideIn 0.3s ease;
        `;
        mensajeDiv.textContent = mensaje;
        document.body.appendChild(mensajeDiv);

        setTimeout(() => {
            mensajeDiv.remove();
        }, 5000);
    }

    mostrarError(mensaje) {
        this.mostrarMensaje('error', '❌ ' + mensaje);
    }
}

// Inicializar el sistema cuando la página cargue
document.addEventListener('DOMContentLoaded', () => {
    window.rifaSystem = new RifaSystem();
});