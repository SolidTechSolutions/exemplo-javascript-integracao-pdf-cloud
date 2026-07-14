'use strict';

/**
 * [EN]    PAdES (PDF) signing example using a cloud HSM certificate (PSC/HSM).
 *         Start: node src/index.js
 *         Batch: POST http://localhost:8090/api/pdf/sign-cloud
 *         Form:  POST http://localhost:8090/api/pdf/sign-cloud/form
 *
 * [PT-BR] Exemplo de assinatura PAdES (PDF) com certificado em nuvem (PSC/HSM).
 *         Iniciar: node src/index.js
 *         Lote:    POST http://localhost:8090/api/pdf/sign-cloud
 *         Form:    POST http://localhost:8090/api/pdf/sign-cloud/form
 */

require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const PdfCloudService = require('./service');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const service = new PdfCloudService();

app.post('/api/pdf/sign-cloud', async (req, res) => {
  const inputPath = process.env.SOLIDSIGN_BATCH_INPUT_PATH || '';
  const outputPath = process.env.SOLIDSIGN_BATCH_OUTPUT_PATH || '';

  if (!fs.existsSync(inputPath) || !fs.statSync(inputPath).isDirectory()) {
    return res.status(400).json({ error: `Invalid input path: ${inputPath}` });
  }

  const pdfFiles = fs.readdirSync(inputPath)
    .filter(f => f.toLowerCase().endsWith('.pdf'))
    .map(f => path.join(inputPath, f));

  if (pdfFiles.length === 0) return res.json({ message: `No PDF files found in ${inputPath}` });

  const resultPath = await service.signWithCloud(pdfFiles, outputPath);
  if (resultPath) return res.json({ message: `Processing completed! ZIP generated at: ${resultPath}` });
  return res.status(500).json({ error: 'Processing failed. Check logs.' });
});

app.post('/api/pdf/sign-cloud/form',
  upload.fields([{ name: 'document' }, { name: 'signatureImage' }]),
  async (req, res) => {
    const documents = req.files['document'] || [];
    const signatureImages = req.files['signatureImage'] || [];
    const {
      authorization, baseUrl, cloudCredentials, profile, hashAlgorithm, policyVersion,
      sigFieldMeasurementUnit, signatureFieldConfig, reason, location, contact,
      signatureFieldName, signatureTextConfig, mdpPermissionLevel,
      passwordsForDecryption, documentInfoMetadata, signatureQrCodeConfig,
    } = req.body;

    const zipBuffer = await service.signWithCloudForm({
      authorization, baseUrl, cloudCredentials, documents, signatureImages,
      profile, hashAlgorithm, policyVersion, sigFieldMeasurementUnit,
      signatureFieldConfig, reason, location, contact, signatureFieldName,
      signatureTextConfig, mdpPermissionLevel, passwordsForDecryption,
      documentInfoMetadata, signatureQrCodeConfig,
    });

    if (zipBuffer) {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename=signed_pdf.zip');
      return res.send(zipBuffer);
    }
    return res.status(500).json({ error: 'Processing failed. Check logs.' });
  }
);

const PORT = process.env.PORT || 8090;
app.listen(PORT, () => console.info(`SolidSign PDF Cloud example running on port ${PORT}`));
