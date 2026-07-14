'use strict';

/**
 * [EN]    Service that signs PDF (PAdES) documents using a cloud HSM certificate.
 *         Calls the SolidSign API endpoint: POST /solidsign/dsig/pdf/sign-hsm-cloud
 *
 * [PT-BR] Serviço que assina documentos PDF (PAdES) usando certificado em nuvem (HSM).
 *         Chama o endpoint da API SolidSign: POST /solidsign/dsig/pdf/sign-hsm-cloud
 */

const axios = require('axios');
const FormData = require('form-data');
const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');

class PdfCloudService {
  constructor() {
    this.baseUrl = (process.env.SOLIDSIGN_API_BASE_URL || '').replace(/\/$/, '');
    this.authorization = process.env.SOLIDSIGN_API_AUTHORIZATION || '';
    this.cloudCredentials = process.env.SOLIDSIGN_CLOUD_CREDENTIALS || '';
    this.profile = process.env.SOLIDSIGN_SIG_PROFILE || 'ADRB';
    this.hashAlgorithm = process.env.SOLIDSIGN_SIG_HASH_ALGORITHM || 'SHA256';
    this.policyVersion = process.env.SOLIDSIGN_SIG_POLICY_VERSION || '';
    this.sigFieldMeasurementUnit = process.env.SOLIDSIGN_SIG_FIELD_MEASUREMENT_UNIT || 'PIXELS';
    this.signatureFieldConfig = process.env.SOLIDSIGN_SIG_FIELD_CONFIG || '';
    this.reason = process.env.SOLIDSIGN_SIG_REASON || '';
    this.location = process.env.SOLIDSIGN_SIG_LOCATION || '';
    this.contact = process.env.SOLIDSIGN_SIG_CONTACT || '';
    this.signatureImagePaths = (process.env.SOLIDSIGN_SIG_IMAGE_PATHS || '')
      .split(',').map(p => p.trim()).filter(Boolean);
  }

  async signWithCloud(pdfFiles, outputDir) {
    console.info(`Starting PAdES Cloud signing for ${pdfFiles.length} PDF(s).`);
    const signUrl = `${this.baseUrl}/solidsign/dsig/pdf/sign-hsm-cloud`;
    const form = new FormData();

    for (let i = 0; i < pdfFiles.length; i++) {
      form.append(`document[${i}]`, fs.createReadStream(pdfFiles[i]), { filename: path.basename(pdfFiles[i]) });
    }
    for (let i = 0; i < this.signatureImagePaths.length; i++) {
      const img = this.signatureImagePaths[i];
      if (fs.existsSync(img)) {
        form.append(`signatureImage[${i}]`, fs.createReadStream(img), { filename: path.basename(img) });
      }
    }

    form.append('cloudCredentials', this.cloudCredentials);
    form.append('profile', this.profile);
    form.append('hashAlgorithm', this.hashAlgorithm);
    form.append('sigFieldMeasurementUnit', this.sigFieldMeasurementUnit);
    appendIndexedJson(form, 'signatureFieldConfig', this.signatureFieldConfig);
    form.append('reason', this.reason);
    form.append('location', this.location);
    form.append('contact', this.contact);
    if (this.policyVersion) form.append('policyVersion', this.policyVersion);

    // [EN]    Optional parameters — uncomment to use
    // [PT-BR] Parâmetros opcionais — descomente para usar
    // form.append('signatureFieldName',     'SignatureField1');
    // appendIndexedJson(form, 'signatureTextConfig', '[...]');
    // form.append('mdpPermissionLevel',     '1');
    // form.append('passwordsForDecryption', '["password"]');
    // form.append('documentInfoMetadata',   '{"title":"My Doc"}');
    // appendIndexedJson(form, 'signatureQrCodeConfig', '[...]');

    try {
      const resp = await axios.post(signUrl, form, {
        headers: { Authorization: this.authorization, ...form.getHeaders() },
        timeout: 120000,
      });
      const zipBuffer = await this._downloadAndZip(resp.data, pdfFiles.map(f => path.basename(f)), this.authorization);
      fs.mkdirSync(outputDir, { recursive: true });
      const outPath = path.join(outputDir, `signed_pdf_cloud_${Date.now()}.zip`);
      fs.writeFileSync(outPath, zipBuffer);
      console.info(`PAdES Cloud signing complete. Output: ${outPath}`);
      return outPath;
    } catch (err) {
      this._logError('PAdES Cloud signing', err);
      return null;
    }
  }

  async signWithCloudForm({ authorization, baseUrl, cloudCredentials, documents, signatureImages = [],
    profile, hashAlgorithm, policyVersion, sigFieldMeasurementUnit, signatureFieldConfig,
    reason, location, contact, signatureFieldName, signatureTextConfig,
    mdpPermissionLevel, passwordsForDecryption, documentInfoMetadata, signatureQrCodeConfig }) {

    console.info(`PAdES Cloud form signing for ${documents.length} PDF(s).`);
    const signUrl = `${baseUrl.replace(/\/$/, '')}/solidsign/dsig/pdf/sign-hsm-cloud`;
    const form = new FormData();

    for (let i = 0; i < documents.length; i++) {
      form.append(`document[${i}]`, documents[i].buffer, { filename: documents[i].originalname });
    }
    for (let i = 0; i < signatureImages.length; i++) {
      form.append(`signatureImage[${i}]`, signatureImages[i].buffer, { filename: signatureImages[i].originalname });
    }

    form.append('cloudCredentials', cloudCredentials);
    if (profile)                  form.append('profile', profile);
    if (hashAlgorithm)            form.append('hashAlgorithm', hashAlgorithm);
    if (policyVersion)            form.append('policyVersion', policyVersion);
    if (sigFieldMeasurementUnit)  form.append('sigFieldMeasurementUnit', sigFieldMeasurementUnit);
    if (signatureFieldConfig)     appendIndexedJson(form, 'signatureFieldConfig', signatureFieldConfig);
    if (reason)                   form.append('reason', reason);
    if (location)                 form.append('location', location);
    if (contact)                  form.append('contact', contact);
    if (signatureFieldName)       form.append('signatureFieldName', signatureFieldName);
    if (signatureTextConfig)      appendIndexedJson(form, 'signatureTextConfig', signatureTextConfig);
    if (mdpPermissionLevel)       form.append('mdpPermissionLevel', mdpPermissionLevel);
    if (passwordsForDecryption)   form.append('passwordsForDecryption', passwordsForDecryption);
    if (documentInfoMetadata)     form.append('documentInfoMetadata', documentInfoMetadata);
    if (signatureQrCodeConfig)    appendIndexedJson(form, 'signatureQrCodeConfig', signatureQrCodeConfig);

    try {
      const resp = await axios.post(signUrl, form, {
        headers: { Authorization: authorization, ...form.getHeaders() },
        timeout: 120000,
      });
      return this._downloadAndZip(resp.data, documents.map(d => d.originalname), authorization);
    } catch (err) {
      this._logError('PAdES Cloud form signing', err);
      return null;
    }
  }

  async _downloadAndZip(signResponse, originalNames, auth) {
    const zip = new JSZip();
    await Promise.all((signResponse.documents || []).map(async (doc, i) => {
      const selfLink = doc._links?.self || (doc.links || []).find(l => l.rel === 'self');
      if (!selfLink) return;
      const r = await axios.get(selfLink.href, {
        headers: { Authorization: auth },
        responseType: 'arraybuffer',
        timeout: 120000,
      });
      if (r.status === 200) zip.file(`signed_${originalNames[i]}`, r.data);
    }));
    return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  }

  _logError(context, err) {
    if (err.response) {
      console.error(`SolidSign API error ${err.response.status} during ${context}: ${JSON.stringify(err.response.data)}`);
    } else {
      console.error(`Unexpected error during ${context}: ${err.message}`);
    }
  }
}

// [EN]    Sends a visual-signature config as INDEXED fields: key[0], key[1], ...
//         The SolidSign API expects signatureFieldConfig[0]={...} per document,
//         NOT a single signatureFieldConfig=[{...}] — otherwise the field is ignored
//         and the visual stamp never appears.
// [PT-BR] Envia a config de assinatura visual como campos INDEXADOS: key[0], key[1], ...
//         A API espera signatureFieldConfig[0]={...} por documento, e NÃO um único
//         signatureFieldConfig=[{...}] — senão o campo é ignorado e o carimbo não aparece.
function appendIndexedJson(form, key, raw) {
  if (raw === undefined || raw === null || raw === '') return
  let parsed
  try { parsed = JSON.parse(raw) } catch (e) { form.append(`${key}[0]`, String(raw)); return }
  const items = Array.isArray(parsed) ? parsed : [parsed]
  items.forEach((it, i) => form.append(`${key}[${i}]`, typeof it === 'string' ? it : JSON.stringify(it)))
}

module.exports = PdfCloudService;
