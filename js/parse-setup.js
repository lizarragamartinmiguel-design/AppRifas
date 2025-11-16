// parse-setup.js - Configuración inicial automática
class ParseSetup {
    static async initialize() {
        console.log('🔄 Iniciando configuración automática...');
        
        try {
            // 1. Verificar conexión
            const connected = await ParseConfig.testConnection();
            if (!connected) {
                throw new Error('No se pudo conectar a Back4App');
            }
            
            // 2. Crear usuario admin
            await this.createDefaultAdmin();
            
            // 3. Crear rifas de ejemplo
            await this.createDefaultRifas();
            
            console.log('🎉 Configuración completada exitosamente');
            return true;
            
        } catch (error) {
            console.error('❌ Error en configuración:', error);
            return false;
        }
    }

    static async createDefaultAdmin() {
        try {
            // Verificar si ya existe el usuario admin
            const query = new Parse.Query(Parse.User);
            query.equalTo("username", "admin");
            const existingUser = await query.first();
            
            if (existingUser) {
                console.log('✅ Usuario admin ya existe');
                return;
            }
            
            // Crear nuevo usuario admin
            await ParseConfig.createAdminUser();
            console.log('✅ Usuario admin creado exitosamente');
            
        } catch (error) {
            console.log('ℹ️ Info usuario admin:', error.message);
        }
    }

    static async createDefaultRifas() {
        try {
            const existingRifas = await ParseConfig.getRifas();
            
            if (existingRifas.length === 0) {
                console.log('📝 Creando rifas de ejemplo...');
                
                const rifasEjemplo = [
                    {
                        titulo: "Rifa Solidaria Escuela Primaria",
                        descripcion: "Ayuda a mejorar las instalaciones de nuestra escuela local para brindar mejor educación",
                        precioNumero: 10,
                        totalNumeros: 100,
                        numerosVendidos: 0,
                        fechaSorteo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        metaRecaudacion: 1000,
                        estado: "activa",
                        orden: 1
                    },
                    {
                        titulo: "Rifa Comunitaria Deportes", 
                        descripcion: "Recaudación para equipamiento deportivo del barrio - pelotas, redes, implementos",
                        precioNumero: 5,
                        totalNumeros: 200,
                        numerosVendidos: 0,
                        fechaSorteo: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        metaRecaudacion: 1000,
                        estado: "activa",
                        orden: 2
                    }
                ];

                for (const rifaData of rifasEjemplo) {
                    await ParseConfig.createRifa(rifaData);
                }
                
                console.log('✅ Rifas de ejemplo creadas');
            } else {
                console.log(`✅ Ya existen ${existingRifas.length} rifas`);
            }
        } catch (error) {
            console.error('Error creando rifas:', error);
        }
    }
}