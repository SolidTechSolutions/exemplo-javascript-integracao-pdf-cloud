# 🇧🇷 SolidSign API - Exemplo de Integração: Assinatura PAdES (PDF) com HSM/Nuvem (JavaScript)

## Requisitos

- Express / Node.js (`npm install`)
- Um token JWT válido (`POST /solidsign/auth/token`)
- Front-end de referência (opcional): [`exemplo-react-pdf-cloud`](https://github.com/SolidTechSolutions/exemplo-react-pdf-cloud)

## Como rodar

```bash
npm install
node src/index.js  (or: npm start)
```

O serviço sobe em `http://localhost:8090`.

## Como funciona

Este back-end expõe o endpoint abaixo, que recebe um formulário (`multipart/form-data`, CORS liberado) e repassa os dados pra SolidSign API real, devolvendo o resultado:

- `POST /api/pdf/sign-cloud/form`

## Variáveis do formulário

| Campo | Significado | Default |
|---|---|---|
| `document[i]` | Documento(s) a assinar | — |
| `authorization` | Token JWT (Bearer) | — |
| `baseUrl` | URL base da SolidSign API | `https://www.solidsign.com.br` |
| `cloudCredentials` | Credenciais do HSM/PSC de nuvem (JSON: hsmUrl, hsmToken, uuidCert) | — |
| `signatureImage[i]` | Imagem da estampa visual (opcional) | (nenhuma) |
| `profile` | Perfil de assinatura PBAD/ETSI | `ADRB` |
| `hashAlgorithm` | Algoritmo de hash | `SHA256` |
| `reason / location / contact` | Metadados da assinatura (opcionais) | (vazio) |

---

# 🇬🇧 SolidSign API - Integration Example: PAdES (PDF) Signing with HSM/Cloud (JavaScript)

## Requirements

- Express / Node.js (`npm install`)
- A valid JWT token (`POST /solidsign/auth/token`)
- Reference front-end (optional): [`exemplo-react-pdf-cloud`](https://github.com/SolidTechSolutions/exemplo-react-pdf-cloud)

## Running

```bash
npm install
node src/index.js  (or: npm start)
```

The service starts on `http://localhost:8090`.

## How it works

This backend exposes the endpoint below, which accepts a form (`multipart/form-data`, CORS-enabled) and forwards the data to the real SolidSign API, returning the result:

- `POST /api/pdf/sign-cloud/form`

## Form fields

| Field | Meaning | Default |
|---|---|---|
| `document[i]` | Document(s) to sign | — |
| `authorization` | JWT (Bearer) token | — |
| `baseUrl` | SolidSign API base URL | `https://www.solidsign.com.br` |
| `cloudCredentials` | Cloud HSM/PSC credentials (JSON: hsmUrl, hsmToken, uuidCert) | — |
| `signatureImage[i]` | Visual stamp image (optional) | (none) |
| `profile` | PBAD/ETSI signature profile | `ADRB` |
| `hashAlgorithm` | Hash algorithm | `SHA256` |
| `reason / location / contact` | Signature metadata (optional) | (empty) |
