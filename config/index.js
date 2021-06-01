const Cloud = require('@google-cloud/storage')
const path = require('path')
const serviceKey = path.join(__dirname, './flavor-theory-26ffb238e4da.json')

const { Storage } = Cloud
const storage = new Storage({
  keyFilename: serviceKey,
  projectId: 'flavor-theory',
})

module.exports = storage