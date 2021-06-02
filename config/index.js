const Cloud = require('@google-cloud/storage')
const path = require('path')
const serviceKey = process.env.GOOGLE_APPLICATION_CREDENTIALS;


const { Storage } = Cloud
const storage = new Storage({
  keyFilename: serviceKey,
  projectId: 'flavor-theory',
})

module.exports = storage