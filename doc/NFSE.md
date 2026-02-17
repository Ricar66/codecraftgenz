# NFS-e - Nota Fiscal de Servico Eletronica

## Visao Geral

O sistema emite NFS-e automaticamente apos pagamentos aprovados, integrando com o sistema da prefeitura via SOAP/XML.

## Arquitetura

```
Payment Approved
       │
       ▼
nfse.service.ts ──── Logica de negocio
       │
       ▼
nfse-xml.service.ts ──── Gera XML + Assinatura digital
       │
       ▼
nfse-soap.service.ts ──── Envia via SOAP para prefeitura
       │
       ▼
Invoice (DB) ──── Armazena XML envio/retorno + status
```

## Fluxo de Emissao

### 1. Geracao da Nota

```
POST /api/nfse/gerar
{
  "paymentId": 42,
  "descricaoServico": "Licenca de software - CodeCraft Hub",
  "valorServico": 29.90,
  "tomadorDoc": "12345678909",
  "tomadorNome": "Nome do Comprador"
}

Processamento:
1. Busca dados do pagamento
2. Gera numero sequencial de RPS
3. Monta XML conforme ABRASF
4. Assina digitalmente (xml-crypto)
5. Salva Invoice no banco (status: pending)
6. Retorna dados da invoice
```

### 2. Envio para Prefeitura

```
POST /api/nfse/:id/enviar

Processamento:
1. Busca invoice com XML gerado
2. Envia lote RPS via SOAP
3. Recebe protocolo da prefeitura
4. Salva XML de retorno
5. Atualiza status: submitted
```

### 3. Consulta de Status

```
GET /api/nfse/:id/consultar

Processamento:
1. Busca protocolo da invoice
2. Consulta status via SOAP
3. Se aprovada: atualiza numero NFS-e
4. Atualiza status: approved ou error
```

### 4. Cancelamento

```
POST /api/nfse/:id/cancelar

Processamento:
1. Verifica se nota esta aprovada
2. Envia cancelamento via SOAP
3. Atualiza status: cancelled
```

## Status da Invoice

| Status | Descricao |
|--------|-----------|
| `pending` | XML gerado, aguardando envio |
| `submitted` | Enviado para prefeitura |
| `approved` | Aprovado, numero NFS-e gerado |
| `cancelled` | Cancelado |
| `error` | Erro no processamento |

## Emissao Automatica

Quando um pagamento e aprovado (via webhook ou direto):

```typescript
// No payment.service.ts (apos aprovar pagamento)
// Emissao assincrona - nao bloqueia o fluxo de compra
nfseService.emitirAutomatica(payment.id).catch(err => {
  logger.error({ err }, 'Falha na emissao automatica NFS-e');
});
```

Se a emissao falhar, o pagamento continua valido. A nota pode ser emitida manualmente depois pelo admin.

## Configuracao

### Variaveis de Ambiente

```env
# Dados da empresa emissora
NFSE_CNPJ=12345678000100
NFSE_INSCRICAO_MUNICIPAL=12345
NFSE_RAZAO_SOCIAL=CodeCraft Gen-Z Ltda
NFSE_REGIME_TRIBUTARIO=1        # 1=Simples Nacional

# Certificado digital
NFSE_CERT_PATH=/path/to/cert.pfx
NFSE_CERT_PASSWORD=senha_certificado

# Endpoint SOAP da prefeitura
NFSE_WSDL_URL=https://nfse.prefeitura.gov.br/...
NFSE_AMBIENTE=2                  # 1=Producao, 2=Homologacao
```

## Endpoints da API

| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/api/nfse` | Listar notas (paginado) |
| GET | `/api/nfse/:id` | Detalhes da nota |
| GET | `/api/nfse/:id/xml` | XML gerado |
| POST | `/api/nfse/gerar` | Gerar nova nota |
| POST | `/api/nfse/:id/enviar` | Enviar para prefeitura |
| GET | `/api/nfse/:id/consultar` | Consultar status |
| POST | `/api/nfse/:id/cancelar` | Cancelar nota |

Todos os endpoints requerem role `admin`.
