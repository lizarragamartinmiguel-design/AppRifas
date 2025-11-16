// parse-config.js - Configuración con TUS credenciales de Back4App
class ParseConfig {
    static init() {
        // ✅ USA TUS CREDENCIALES AQUÍ:
        Parse.initialize(
            "NNxoqUEYiTkyO1MxAmxF6lGPeHhmqXUxG8bZGyPr",      // Tu Application ID
            "hO0qRKANPmDLu3spkcDLLTBTeYIQSfCNJg8T0dUH"       // Tu JavaScript Key
        );
        Parse.serverURL = "https://parseapi.back4app.com/";
        
        console.log('✅ Parse Platform inicializado con Back4App');
        
        // Verificar conexión
        this.testConnection();
    }

    static async testConnection() {
        try {
            const Test = Parse.Object.extend('TestConnection');
            const testObject = new Test();
            await testObject.save({ 
                test: true, 
                timestamp: new Date(),
                message: 'Conexión exitosa a Back4App'
            });
            await testObject.destroy();
            console.log('✅ Conexión a Back4App: EXITOSA');
            return true;
        } catch (error) {
            console.error('❌ Error conectando a Back4App:', error);
            this.showError('Error de conexión con el servidor: ' + error.message);
            return false;
        }
    }

    static showError(message) {
        // Solo mostrar en consola para no interrumpir la UI
        console.error('🔴 Error:', message);
    }

    // Método para crear usuario admin
    static async createAdminUser() {
        try {
            const user = new Parse.User();
            user.set("username", "admin");
            user.set("password", "pagos10");
            user.set("email", "admin@rifa.com");

            const userResult = await user.signUp();
            console.log('✅ Usuario admin creado:', userResult.get("username"));
            return userResult;
        } catch (error) {
            if (error.code === 202) { // Username already taken
                console.log('✅ Usuario admin ya existe');
                return null;
            } else {
                console.error('Error creando usuario admin:', error);
                throw error;
            }
        }
    }

    // Método para login
    static async login(username, password) {
        try {
            const user = await Parse.User.logIn(username, password);
            console.log('✅ Login exitoso:', user.get("username"));
            return user;
        } catch (error) {
            console.error('Error en login:', error);
            throw error;
        }
    }

    // Método para crear rifas
    static async createRifa(rifaData) {
        try {
            const Rifa = Parse.Object.extend("Rifa");
            const rifa = new Rifa();
            
            Object.keys(rifaData).forEach(key => {
                rifa.set(key, rifaData[key]);
            });
            
            const result = await rifa.save();
            console.log('✅ Rifa creada:', result.id);
            return result;
        } catch (error) {
            console.error('Error creando rifa:', error);
            throw error;
        }
    }

    // Método para obtener todas las rifas
    static async getRifas() {
        try {
            const Rifa = Parse.Object.extend("Rifa");
            const query = new Parse.Query(Rifa);
            query.ascending("orden");
            
            const results = await query.find();
            console.log(`✅ ${results.length} rifas cargadas`);
            
            return results.map(rifa => ({
                id: rifa.id,
                ...rifa.attributes
            }));
        } catch (error) {
            console.error('Error cargando rifas:', error);
            return [];
        }
    }

    // Método para guardar número vendido
    static async saveNumeroVendido(rifaId, numero, comprador, telefono, email) {
        try {
            const NumeroVendido = Parse.Object.extend("NumeroVendido");
            const numeroObj = new NumeroVendido();
            
            numeroObj.set("rifaId", rifaId);
            numeroObj.set("numero", numero);
            numeroObj.set("comprador", comprador);
            numeroObj.set("telefono", telefono);
            numeroObj.set("email", email);
            numeroObj.set("fecha", new Date());
            numeroObj.set("estado", "reservado");
            
            const result = await numeroObj.save();
            console.log('✅ Número vendido guardado:', numero);
            return result;
        } catch (error) {
            console.error('Error guardando número:', error);
            throw error;
        }
    }

    // Método para obtener números vendidos de una rifa
    static async getNumerosVendidos(rifaId) {
        try {
            const NumeroVendido = Parse.Object.extend("NumeroVendido");
            const query = new Parse.Query(NumeroVendido);
            query.equalTo("rifaId", rifaId);
            
            const results = await query.find();
            return results.map(item => item.get("numero"));
        } catch (error) {
            console.error('Error cargando números vendidos:', error);
            return [];
        }
    }

    // Método para actualizar estadísticas de rifa
    static async updateRifaStats(rifaId) {
        try {
            const numerosVendidos = await this.getNumerosVendidos(rifaId);
            
            const Rifa = Parse.Object.extend("Rifa");
            const rifa = new Rifa();
            rifa.id = rifaId;
            
            rifa.set("numerosVendidos", numerosVendidos.length);
            
            await rifa.save();
            console.log('✅ Estadísticas actualizadas para rifa:', rifaId);
        } catch (error) {
            console.error('Error actualizando estadísticas:', error);
            throw error;
        }
    }
}