const Cloud = require('@google-cloud/storage')
const path = require('path')
const serviceKey = {
  "type": process.ENV.TYPE,
  "project_id": process.ENV.PROJECT_ID,
  "private_key_id": process.ENV.PRIVATE_KEY_ID,
  "private_key": process.ENV.PRIVATE_KEY,
  "client_email": process.ENV.CLIENT_EMAIL,
  "client_id": process.ENV.CLIENT_ID,
  "auth_uri": process.ENV.AUTH_URI,
  "token_uri": process.ENV.TOKEN_URI,
  "auth_provider_x509_cert_url": process.ENV.AUTH_PROVIDER_X509_CERT_URL,
  "client_x509_cert_url": process.ENV.CLIENT_X509_CERT_URL,
}


const { Storage } = Cloud
const storage = new Storage({
  keyFilename: serviceKey,
  projectId: 'flavor-theory',
})

module.exports = storage