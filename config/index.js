const Cloud = require('@google-cloud/storage')
const path = require('path')
const serviceKey = path.dirname("./gcpconfig.json");

const { Storage } = Cloud
const storage = new Storage({
  keyFilename: serviceKey,
  projectId: 'flavor-theory',
})

module.exports = storage