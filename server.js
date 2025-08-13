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

// Configurações adicionais para ambientes cloud
const cloudDbConfig = {
  ...dbConfig,
  connectTimeout: 60000,        // Aumentado para 60s
  acquireTimeout: 60000,        // Timeout para adquirir conexão
  timeout: 60000,               // Timeout geral
  ssl: false,                   // SSL desabilitado
  multipleStatements: false,    // Segurança
  charset: 'utf8mb4',           // Charset padrão
  timezone: '+00:00',           // Timezone UTC
  dateStrings: false,           // Manter tipos de data nativos
  supportBigNumbers: true,      // Suporte a números grandes
  bigNumberStrings: false,      // Não converter números grandes para string
  connectionLimit: 10,          // Limite de conexões
  queueLimit: 0,                // Sem limite na fila
  acquireTimeout: 60000,        // Timeout para pool
  waitForConnections: true,     // Aguardar conexões disponíveis
  debug: false                  // Debug desabilitado
};

console.log('🧪 API de Teste MySQL');
console.log('===================');
console.log(`📡 Host: ${dbConfig.host}:${dbConfig.port}`);
console.log(`👤 User: ${dbConfig.user}`);
console.log(`🔑 Password: ***`);
console.log(`🌐 Porta API: ${PORT}`);
console.log(`☁️  Ambiente: ${process.env.NODE_ENV || 'development'}`);
console.log(`🌍 Railway: ${process.env.RAILWAY_ENVIRONMENT ? 'Sim' : 'Não'}`);

// Função para testar TCP
const testTCP = async (host, port) => {
  return new Promise((resolve, reject) => {
    const net = require('net');
    const socket = new net.Socket();
    const start = Date.now();
    
    console.log(`🔌 Tentando conexão TCP para ${host}:${port}...`);
    
    socket.setTimeout(30000); // Aumentado para 30s
    
    socket.on('connect', () => {
      const duration = Date.now() - start;
      console.log(`✅ TCP conectado em ${duration}ms`);
      socket.destroy();
      resolve({ success: true, duration });
    });
    
    socket.on('error', (err) => {
      const duration = Date.now() - start;
      console.log(`❌ Erro TCP após ${duration}ms:`, err.message);
      socket.destroy();
      resolve({ success: false, error: err.message, duration, code: err.code });
    });
    
    socket.on('timeout', () => {
      const duration = Date.now() - start;
      console.log(`⏰ Timeout TCP após ${duration}ms`);
      socket.destroy();
      resolve({ success: false, error: 'Timeout', duration });
    });
    
    socket.on('close', (hadError) => {
      if (hadError) {
        console.log(`🔒 Conexão TCP fechada com erro`);
      }
    });
    
    try {
      socket.connect(port, host);
      console.log(`📡 Socket TCP criado, aguardando conexão...`);
    } catch (error) {
      console.log(`💥 Erro ao criar socket TCP:`, error.message);
      resolve({ success: false, error: error.message, duration: 0 });
    }
  });
};

// Função para testar MySQL
const testMySQL = async (database) => {
  let connection = null;
  const start = Date.now();
  
  console.log(`🗄️ Tentando conectar ao banco ${database}...`);
  
  try {
    connection = await mysql.createConnection({
      ...cloudDbConfig,
      database,
    });
    
    console.log(`✅ Conectado ao ${database}, executando query...`);
    
    const [rows] = await connection.execute('SELECT 1 as test, COUNT(*) as total FROM information_schema.tables WHERE table_schema = ?', [database]);
    const duration = Date.now() - start;
    
    console.log(`✅ Query executada em ${database}: ${rows[0].total} tabelas encontradas`);
    
    return {
      success: true,
      duration,
      database,
      tables: rows[0].total,
      test: rows[0].test
    };
    
  } catch (error) {
    const duration = Date.now() - start;
    console.log(`❌ Erro ao conectar ao ${database} após ${duration}ms:`, error.message);
    console.log(`   Código: ${error.code}, Errno: ${error.errno}`);
    
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
        console.log(`🔒 Conexão com ${database} fechada`);
      } catch (e) {
        console.log(`⚠️ Erro ao fechar conexão com ${database}:`, e.message);
      }
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
    environment: {
      node_env: process.env.NODE_ENV || 'development',
      railway: !!process.env.RAILWAY_ENVIRONMENT,
      platform: process.platform,
      arch: process.arch
    },
    endpoints: {
      tcp: '/test/tcp',
      mysql: '/test/mysql',
      'mysql-direct': '/test/mysql-direct',
      databases: '/test/databases',
      users: '/test/users',
      complete: '/test/complete'
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
      ...cloudDbConfig
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
    console.error('   Código:', error.code, 'Errno:', error.errno);
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
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`☁️  Railway: ${process.env.RAILWAY_ENVIRONMENT ? 'Sim' : 'Não'}`);
  console.log(`📡 Host: ${dbConfig.host}:${dbConfig.port}`);
  
  const startTime = Date.now();
  const results = {};
  
  try {
    // 1. TCP
    console.log('\n1️⃣ Testando conectividade TCP...');
    results.tcp = await testTCP(dbConfig.host, dbConfig.port);
    
    if (!results.tcp.success) {
      console.log(`❌ TCP falhou: ${results.tcp.error}`);
      console.log(`   Código: ${results.tcp.code || 'N/A'}`);
      console.log(`   Tempo: ${results.tcp.duration}ms`);
      
      // Mesmo com TCP falhando, vamos tentar MySQL direto
      console.log('⚠️ TCP falhou, mas tentando MySQL direto...');
    } else {
      console.log(`✅ TCP: ${results.tcp.duration}ms`);
    }
    
    // 2. MySQL básico
    console.log('\n2️⃣ Testando MySQL básico...');
    try {
      let connection = await mysql.createConnection({
        ...cloudDbConfig
      });
      const [basic] = await connection.execute('SELECT 1 as test, VERSION() as version');
      await connection.end();
      results.mysql_basic = { success: true, data: basic[0] };
      console.log(`✅ MySQL básico: OK (versão ${basic[0].version})`);
    } catch (error) {
      console.log(`❌ MySQL básico falhou: ${error.message}`);
      results.mysql_basic = { 
        success: false, 
        error: {
          code: error.code,
          errno: error.errno,
          message: error.message
        }
      };
    }
    
    // 3. Bancos específicos
    console.log('\n3️⃣ Testando bancos específicos...');
    const databases = ['dbusers', 'dbcheckin', 'dbmercocamp'];
    results.databases = {};
    
    for (const db of databases) {
      console.log(`   📊 Testando ${db}...`);
      results.databases[db] = await testMySQL(db);
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`\n🏁 Teste completo finalizado em ${totalTime}ms`);
    
    res.json({
      test: 'Complete Test Suite',
      timestamp: new Date().toISOString(),
      duration: totalTime,
      environment: {
        node_env: process.env.NODE_ENV || 'development',
        railway: !!process.env.RAILWAY_ENVIRONMENT,
        platform: process.platform,
        arch: process.arch
      },
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
    console.error('   Stack:', error.stack);
    
    res.status(500).json({
      test: 'Complete Test Suite',
      timestamp: new Date().toISOString(),
      duration: totalTime,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      partial_results: results
    });
  }
});

// Teste MySQL direto (sem TCP)
app.get('/test/mysql-direct', async (req, res) => {
  console.log('🗄️ Testando MySQL direto (pulando TCP)...');
  
  const startTime = Date.now();
  const results = {};
  
  try {
    // 1. MySQL básico
    console.log('1️⃣ MySQL básico...');
    try {
      let connection = await mysql.createConnection({
        ...cloudDbConfig
      });
      const [basic] = await connection.execute('SELECT 1 as test, VERSION() as version, NOW() as timestamp');
      await connection.end();
      results.mysql_basic = { success: true, data: basic[0] };
      console.log(`✅ MySQL básico: OK (versão ${basic[0].version})`);
    } catch (error) {
      console.log(`❌ MySQL básico falhou: ${error.message}`);
      results.mysql_basic = { 
        success: false, 
        error: {
          code: error.code,
          errno: error.errno,
          message: error.message
        }
      };
    }
    
    // 2. Bancos específicos
    console.log('2️⃣ Bancos específicos...');
    const databases = ['dbusers', 'dbcheckin', 'dbmercocamp'];
    results.databases = {};
    
    for (const db of databases) {
      console.log(`   📊 Testando ${db}...`);
      results.databases[db] = await testMySQL(db);
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`🏁 Teste MySQL direto finalizado em ${totalTime}ms`);
    
    res.json({
      test: 'MySQL Direct Test',
      timestamp: new Date().toISOString(),
      duration: totalTime,
      environment: {
        node_env: process.env.NODE_ENV || 'development',
        railway: !!process.env.RAILWAY_ENVIRONMENT,
        platform: process.platform,
        arch: process.arch
      },
      config: {
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user
      },
      results
    });
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('❌ Teste MySQL direto falhou:', error.message);
    
    res.status(500).json({
      test: 'MySQL Direct Test',
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
  console.log(`   MySQL Direto: http://localhost:${PORT}/test/mysql-direct`);
  console.log(`   Bancos: http://localhost:${PORT}/test/databases`);
  console.log(`   Usuários: http://localhost:${PORT}/test/users`);
  console.log(`   Completo: http://localhost:${PORT}/test/complete`);
  console.log('\n✨ Pronto para testar conectividade MySQL!');
  console.log(`💡 Dica: Use /test/mysql-direct se o teste TCP falhar no Railway\n`);
});

module.exports = app;