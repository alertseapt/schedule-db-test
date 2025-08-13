const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Configuração do banco MySQL (hardcoded para teste)
const dbConfig = {
  host: 'mercocamp.ip.odhserver.com',
  port: 33101,
  user: 'projetos',
  password: 'masterkey'
};

console.log('🧪 API de Teste MySQL');
console.log('===================');
console.log(`📡 Host: ${dbConfig.host}:${dbConfig.port}`);
console.log(`👤 User: ${dbConfig.user}`);
console.log(`🔑 Password: ***`);
console.log(`🌐 Porta API: ${PORT}`);

// Função para testar TCP
const testTCP = async (host, port) => {
  return new Promise((resolve, reject) => {
    const net = require('net');
    const socket = new net.Socket();
    const start = Date.now();
    
    socket.setTimeout(10000);
    
    socket.on('connect', () => {
      const duration = Date.now() - start;
      socket.destroy();
      resolve({ success: true, duration });
    });
    
    socket.on('error', (err) => {
      const duration = Date.now() - start;
      socket.destroy();
      resolve({ success: false, error: err.message, duration });
    });
    
    socket.on('timeout', () => {
      const duration = Date.now() - start;
      socket.destroy();
      resolve({ success: false, error: 'Timeout', duration });
    });
    
    socket.connect(port, host);
  });
};

// Função para testar MySQL
const testMySQL = async (database) => {
  let connection = null;
  const start = Date.now();
  
  try {
    connection = await mysql.createConnection({
      ...dbConfig,
      database,
      connectTimeout: 30000,
      ssl: false
    });
    
    const [rows] = await connection.execute('SELECT 1 as test, COUNT(*) as total FROM information_schema.tables WHERE table_schema = ?', [database]);
    const duration = Date.now() - start;
    
    return {
      success: true,
      duration,
      database,
      tables: rows[0].total,
      test: rows[0].test
    };
    
  } catch (error) {
    const duration = Date.now() - start;
    return {
      success: false,
      duration,
      database,
      error: {
        code: error.code,
        errno: error.errno,
        message: error.message
      }
    };
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (e) {}
    }
  }
};

// ROTAS DA API

// Health check
app.get('/', (req, res) => {
  res.json({
    name: 'MySQL Test API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      tcp: '/test/tcp',
      mysql: '/test/mysql',
      databases: '/test/databases',
      users: '/test/users'
    }
  });
});

// Teste TCP básico
app.get('/test/tcp', async (req, res) => {
  console.log('🔌 Testando conectividade TCP...');
  
  try {
    const result = await testTCP(dbConfig.host, dbConfig.port);
    
    console.log(`TCP resultado: ${result.success ? '✅' : '❌'} (${result.duration}ms)`);
    
    res.json({
      test: 'TCP Connection',
      timestamp: new Date().toISOString(),
      config: {
        host: dbConfig.host,
        port: dbConfig.port
      },
      result
    });
  } catch (error) {
    console.error('❌ Erro no teste TCP:', error);
    res.status(500).json({
      error: 'Erro no teste TCP',
      details: error.message
    });
  }
});

// Teste MySQL básico
app.get('/test/mysql', async (req, res) => {
  console.log('🗄️ Testando conexão MySQL básica...');
  
  try {
    let connection = await mysql.createConnection({
      ...dbConfig,
      connectTimeout: 30000,
      ssl: false
    });
    
    const start = Date.now();
    const [rows] = await connection.execute('SELECT 1 as test, NOW() as timestamp, VERSION() as version');
    const duration = Date.now() - start;
    
    await connection.end();
    
    console.log(`✅ MySQL conectado (${duration}ms)`);
    
    res.json({
      test: 'MySQL Connection',
      timestamp: new Date().toISOString(),
      config: {
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user
      },
      result: {
        success: true,
        duration,
        data: rows[0]
      }
    });
    
  } catch (error) {
    console.error('❌ Erro no MySQL:', error.message);
    res.status(500).json({
      test: 'MySQL Connection',
      timestamp: new Date().toISOString(),
      result: {
        success: false,
        error: {
          code: error.code,
          errno: error.errno,
          message: error.message
        }
      }
    });
  }
});

// Teste dos 3 bancos específicos
app.get('/test/databases', async (req, res) => {
  console.log('🏢 Testando bancos específicos...');
  
  const databases = ['dbusers', 'dbcheckin', 'dbmercocamp'];
  const results = {};
  
  for (const db of databases) {
    console.log(`📊 Testando ${db}...`);
    results[db] = await testMySQL(db);
    console.log(`${results[db].success ? '✅' : '❌'} ${db}: ${results[db].success ? 'OK' : results[db].error.message}`);
  }
  
  const successful = Object.values(results).filter(r => r.success).length;
  console.log(`📈 Resultado: ${successful}/${databases.length} bancos acessíveis`);
  
  res.json({
    test: 'Database Access',
    timestamp: new Date().toISOString(),
    summary: {
      total: databases.length,
      successful,
      failed: databases.length - successful
    },
    results
  });
});

// Teste específico de usuários
app.get('/test/users', async (req, res) => {
  console.log('👥 Testando tabela de usuários...');
  
  try {
    let connection = await mysql.createConnection({
      ...dbConfig,
      database: 'dbusers',
      connectTimeout: 30000,
      ssl: false
    });
    
    const [users] = await connection.execute('SELECT id, user, name, level_access FROM users LIMIT 5');
    const [count] = await connection.execute('SELECT COUNT(*) as total FROM users');
    
    await connection.end();
    
    console.log(`✅ Usuários encontrados: ${count[0].total}`);
    
    res.json({
      test: 'Users Table',
      timestamp: new Date().toISOString(),
      result: {
        success: true,
        total_users: count[0].total,
        sample_users: users
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao acessar usuários:', error.message);
    res.status(500).json({
      test: 'Users Table',
      timestamp: new Date().toISOString(),
      result: {
        success: false,
        error: {
          code: error.code,
          errno: error.errno,
          message: error.message
        }
      }
    });
  }
});

// Teste completo (todos os testes em sequência)
app.get('/test/complete', async (req, res) => {
  console.log('🚀 Executando teste completo...');
  
  const startTime = Date.now();
  const results = {};
  
  try {
    // 1. TCP
    console.log('1️⃣ TCP...');
    results.tcp = await testTCP(dbConfig.host, dbConfig.port);
    
    if (!results.tcp.success) {
      throw new Error('TCP falhou - parando testes');
    }
    
    // 2. MySQL básico
    console.log('2️⃣ MySQL básico...');
    let connection = await mysql.createConnection({
      ...dbConfig,
      connectTimeout: 30000,
      ssl: false
    });
    const [basic] = await connection.execute('SELECT 1 as test, VERSION() as version');
    await connection.end();
    results.mysql_basic = { success: true, data: basic[0] };
    
    // 3. Bancos específicos
    console.log('3️⃣ Bancos específicos...');
    const databases = ['dbusers', 'dbcheckin', 'dbmercocamp'];
    results.databases = {};
    
    for (const db of databases) {
      results.databases[db] = await testMySQL(db);
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`🏁 Teste completo finalizado em ${totalTime}ms`);
    
    res.json({
      test: 'Complete Test Suite',
      timestamp: new Date().toISOString(),
      duration: totalTime,
      config: {
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user
      },
      results
    });
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('❌ Teste completo falhou:', error.message);
    
    res.status(500).json({
      test: 'Complete Test Suite',
      timestamp: new Date().toISOString(),
      duration: totalTime,
      error: error.message,
      partial_results: results
    });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`\n🚀 API de Teste MySQL rodando!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/`);
  console.log(`🧪 Testes:`);
  console.log(`   TCP: http://localhost:${PORT}/test/tcp`);
  console.log(`   MySQL: http://localhost:${PORT}/test/mysql`);
  console.log(`   Bancos: http://localhost:${PORT}/test/databases`);
  console.log(`   Usuários: http://localhost:${PORT}/test/users`);
  console.log(`   Completo: http://localhost:${PORT}/test/complete`);
  console.log('\n✨ Pronto para testar conectividade MySQL!\n');
});

module.exports = app;