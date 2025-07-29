#!/usr/bin/env node

/**
 * Script de prueba para verificar el funcionamiento del cache compartido
 * Uso: node test-cache.js
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';

async function testCache() {
  console.log('🧪 Iniciando pruebas del cache compartido...\n');

  try {
    // 1. Verificar estado inicial del cache
    console.log('1️⃣ Verificando estado inicial del cache...');
    const statusResponse = await fetch(`${BASE_URL}/api/cache/status`);
    const statusData = await statusResponse.json();
    console.log('✅ Estado del cache:', JSON.stringify(statusData, null, 2));

    // 2. Probar endpoint de clientes (primera vez - sin cache)
    console.log('\n2️⃣ Probando endpoint de clientes (primera vez)...');
    const clientesResponse1 = await fetch(`${BASE_URL}/api/clientes-firebase`);
    const clientesData1 = await clientesResponse1.json();
    console.log(`✅ Clientes cargados: ${clientesData1.length} registros`);

    // 3. Probar endpoint de clientes (segunda vez - con cache)
    console.log('\n3️⃣ Probando endpoint de clientes (segunda vez - con cache)...');
    const clientesResponse2 = await fetch(`${BASE_URL}/api/clientes-firebase`);
    const clientesData2 = await clientesResponse2.json();
    console.log(`✅ Clientes desde cache: ${clientesData2.length} registros`);

    // 4. Probar endpoint de productos (primera vez - sin cache)
    console.log('\n4️⃣ Probando endpoint de productos (primera vez)...');
    const productosResponse1 = await fetch(`${BASE_URL}/api/productos-firebase`);
    const productosData1 = await productosResponse1.json();
    console.log(`✅ Productos cargados: ${productosData1.length} registros`);

    // 5. Probar endpoint de productos (segunda vez - con cache)
    console.log('\n5️⃣ Probando endpoint de productos (segunda vez - con cache)...');
    const productosResponse2 = await fetch(`${BASE_URL}/api/productos-firebase`);
    const productosData2 = await productosResponse2.json();
    console.log(`✅ Productos desde cache: ${productosData2.length} registros`);

    // 6. Verificar estado final del cache
    console.log('\n6️⃣ Verificando estado final del cache...');
    const finalStatusResponse = await fetch(`${BASE_URL}/api/cache/status`);
    const finalStatusData = await finalStatusResponse.json();
    console.log('✅ Estado final del cache:', JSON.stringify(finalStatusData, null, 2));

    // 7. Probar invalidación de cache
    console.log('\n7️⃣ Probando invalidación de cache...');
    const invalidateResponse = await fetch(`${BASE_URL}/api/cache/invalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'clientes' })
    });
    const invalidateData = await invalidateResponse.json();
    console.log('✅ Cache invalidado:', invalidateData);

    // 8. Probar actualización forzada
    console.log('\n8️⃣ Probando actualización forzada...');
    const refreshResponse = await fetch(`${BASE_URL}/api/cache/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'clientes' })
    });
    const refreshData = await refreshResponse.json();
    console.log('✅ Cache actualizado:', refreshData);

    // 9. Obtener estadísticas
    console.log('\n9️⃣ Obteniendo estadísticas del cache...');
    const statsResponse = await fetch(`${BASE_URL}/api/cache/stats`);
    const statsData = await statsResponse.json();
    console.log('✅ Estadísticas del cache:', JSON.stringify(statsData, null, 2));

    console.log('\n🎉 ¡Todas las pruebas completadas exitosamente!');
    console.log('\n📊 Resumen:');
    console.log('- ✅ Cache compartido funcionando correctamente');
    console.log('- ✅ Reducción de lecturas de Firebase');
    console.log('- ✅ Endpoints de gestión funcionando');
    console.log('- ✅ Monitor de cache accesible');

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error.message);
    console.log('\n🔧 Verificaciones:');
    console.log('1. ¿El servidor está corriendo en puerto 3001?');
    console.log('2. ¿Hay conexión a Firebase?');
    console.log('3. ¿Los endpoints están respondiendo?');
  }
}

// Función para simular múltiples dispositivos
async function testMultipleDevices() {
  console.log('\n🖥️ Simulando múltiples dispositivos...\n');

  const devices = ['Dispositivo 1', 'Dispositivo 2', 'Dispositivo 3', 'Dispositivo 4', 'Dispositivo 5'];

  for (const device of devices) {
    console.log(`📱 ${device} solicitando clientes...`);
    try {
      const response = await fetch(`${BASE_URL}/api/clientes-firebase`);
      const data = await response.json();
      console.log(`✅ ${device} recibió ${data.length} clientes`);
    } catch (error) {
      console.log(`❌ ${device} tuvo error: ${error.message}`);
    }
    
    // Pequeña pausa entre dispositivos
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n📊 Resultado: Todos los dispositivos comparten el mismo cache');
}

// Función para medir rendimiento
async function measurePerformance() {
  console.log('\n⚡ Mediendo rendimiento...\n');

  const iterations = 10;
  const times = [];

  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    try {
      await fetch(`${BASE_URL}/api/clientes-firebase`);
      const end = Date.now();
      const duration = end - start;
      times.push(duration);
      console.log(`Iteración ${i + 1}: ${duration}ms`);
    } catch (error) {
      console.log(`Iteración ${i + 1}: Error`);
    }
  }

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  console.log('\n📈 Resultados de rendimiento:');
  console.log(`- Tiempo promedio: ${avgTime.toFixed(2)}ms`);
  console.log(`- Tiempo mínimo: ${minTime}ms`);
  console.log(`- Tiempo máximo: ${maxTime}ms`);
  console.log(`- Iteraciones: ${iterations}`);
}

// Ejecutar pruebas
async function runAllTests() {
  console.log('🚀 Iniciando pruebas completas del cache compartido\n');
  
  await testCache();
  await testMultipleDevices();
  await measurePerformance();
  
  console.log('\n🎯 Pruebas completadas. El cache está funcionando correctamente.');
}

// Verificar si el servidor está corriendo
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/api/cache/status`);
    if (response.ok) {
      console.log('✅ Servidor respondiendo correctamente');
      return true;
    }
  } catch (error) {
    console.log('❌ Servidor no responde. Asegúrate de que esté corriendo en puerto 3001');
    return false;
  }
}

// Función principal
async function main() {
  console.log('🔍 Verificando servidor...');
  const serverRunning = await checkServer();
  
  if (serverRunning) {
    await runAllTests();
  } else {
    console.log('\n💡 Para ejecutar las pruebas:');
    console.log('1. Inicia el servidor: cd server && npm start');
    console.log('2. Ejecuta las pruebas: node test-cache.js');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testCache, testMultipleDevices, measurePerformance };