const Cloud = require('@google-cloud/storage')
const path = require('path')
const serviceKey = {
  type: process.ENV.type,
  project_id: process.ENV.project_id,
  private_key_id: process.ENV.private_key_id,
  private_key: process.ENV.private_key,
  client_email: process.ENV.client_email,
  client_id: process.ENV.client_id,
  auth_uri: process.ENV.auth_uri,
  token_uri: process.ENV.token_uri,
  auth_provider_x509_cert_url: process.ENV.auth_provider_x509_cert_url,
  client_x509_cert_url: process.ENV.auth_provider_x509_cert_url,
}


const { Storage } = Cloud
const storage = new Storage({
  keyFilename: serviceKey,
  projectId: 'flavor-theory',
})

module.exports = storage