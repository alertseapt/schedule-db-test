# 🚀 Deploy no Railway - MySQL Test API

## 📋 Pré-requisitos
- Conta no Railway
- Projeto configurado no Railway
- Banco MySQL acessível externamente

## 🔧 Configuração

### 1. Variáveis de Ambiente (Railway Dashboard)
```bash
NODE_ENV=production
RAILWAY_ENVIRONMENT=true
```

### 2. Comando de Build
```bash
npm install
```

### 3. Comando de Start
```bash
npm start
```

## 🗄️ Driver MySQL

**Driver:** `mysql` (Oficial) - Mais estável que `mysql2`
- ✅ **Driver oficial** do MySQL
- ✅ **Melhor compatibilidade** com diferentes versões
- ✅ **Mais estável** em ambientes cloud como Railway
- ✅ **Suporte nativo** a Promises (via wrapper)

## 🧪 Endpoints de Teste

### Health Check
```
GET /
```

### Teste TCP (pode falhar no Railway)
```
GET /test/tcp
```

### Teste MySQL Básico
```
GET /test/mysql
```

### 🆕 Teste MySQL Direto (Recomendado para Railway)
```
GET /test/mysql-direct
```

### Teste Completo
```
GET /test/complete
```

## ⚠️ Problemas Comuns no Railway

### 1. Teste TCP Falha
- **Sintoma:** `TCP falhou - parando testes`
- **Causa:** Restrições de rede/firewall do Railway
- **Solução:** Use `/test/mysql-direct` em vez de `/test/complete`

### 2. Timeout de Conexão
- **Sintoma:** `connect ETIMEDOUT`
- **Causa:** Firewall ou rede lenta
- **Solução:** Timeouts aumentados para 60s

### 3. Erro de Autenticação
- **Sintoma:** `ER_ACCESS_DENIED_ERROR`
- **Causa:** Credenciais incorretas ou IP não autorizado
- **Solução:** Verificar credenciais e whitelist de IPs

## 🔍 Logs de Diagnóstico

A API agora inclui logs detalhados:
- ✅ Status de cada teste
- ⏱️ Tempo de execução
- 🌍 Informações do ambiente
- 📊 Detalhes de erro com códigos
- 🔌 Driver MySQL utilizado

## 🚀 Deploy Automático

1. Conecte seu repositório GitHub ao Railway
2. Configure as variáveis de ambiente
3. Deploy automático a cada push
4. Monitore os logs para diagnóstico

## 📊 Monitoramento

- **Health Check:** `/` - Status geral da API
- **Logs:** Console do Railway para diagnóstico
- **Métricas:** Tempo de resposta e status dos testes

## 🆘 Troubleshooting

### Se nada funcionar:
1. Verifique se o banco está acessível externamente
2. Confirme as credenciais no código
3. Teste localmente primeiro
4. Verifique os logs do Railway
5. Use `/test/mysql-direct` para bypass do TCP

### Vantagens do Driver Oficial:
- **Mais estável** em ambientes cloud
- **Melhor compatibilidade** com diferentes versões MySQL
- **Menos problemas** de conectividade
- **Suporte oficial** da Oracle
