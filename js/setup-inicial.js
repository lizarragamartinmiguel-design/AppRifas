// setup-inicial.js - Ejecutar una vez para configurar las clases en Back4app

Parse.initialize("NNxoqUEYiTkyO1MxAmxF6lGPeHhmqXUxG8bZGyPr", "hO0qRKANPmDLu3spkcDLLTBTeYIQSfCNJg8T0dUH");
Parse.serverURL = "https://parseapi.back4app.com/";

async function setupInicial() {
    console.log('🚀 Configurando sistema de rifas...');
    
    try {
        // 1. Crear configuración por defecto
        const Config = Parse.Object.extend("Config");
        const config = new Config();
        await config.save({
            whatsappNumber: '+5491112345678',
            whatsappMessage: 'Hola! Quiero comprar el número {numero} de la rifa {rifa}. Mi nombre es {nombre}',
            sorteoGrabacion: 'si',
            mensajeGanador: '¡Felicidades {nombre}! Ganaste la rifa {rifa} con el número {numero}'
        });
        console.log('✅ Configuración creada');

        // 2. Crear rifa de ejemplo
        const Rifa = Parse.Object.extend("Rifa");
        const rifa = new Rifa();
        await rifa.save({
            titulo: "Rifa Solidaria de Ejemplo",
            descripcion: "Rifa de ejemplo para probar el sistema. Todos los fondos serán destinados a causas benéficas.",
            precioNumero: 10.00,
            totalNumeros: 100,
            numerosVendidos: 0,
            fechaSorteo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días desde hoy
            metaRecaudacion: 1000.00,
            estado: 'activa'
        });
        console.log('✅ Rifa de ejemplo creada');

        // 3. Crear números para la rifa
        const Numeros = Parse.Object.extend("Numeros");
        const numeros = [];
        for (let i = 1; i <= 100; i++) {
            const numero = new Numeros();
            numero.set('rifaId', rifa.id);
            numero.set('numero', i);
            numero.set('vendido', false);
            numeros.push(numero);
        }
        await Parse.Object.saveAll(numeros);
        console.log('✅ 100 números creados para la rifa');

        console.log('🎉 Configuración inicial completada exitosamente!');
        console.log('📱 Ahora puedes:');
        console.log('   1. Acceder a admin.html con usuario: admin, contraseña: pagos10');
        console.log('   2. Ver la página principal en index.html');
        console.log('   3. Configurar tu número de WhatsApp en el panel de administración');

    } catch (error) {
        console.log('❌ Error en configuración:', error.message);
    }
}

// Ejecutar setup
setupInicial();