const fs=require("fs"); 
fs.writeFile(process.env.GCP_KEYFILE, process.env.GOOGLE_CREDENTIALS, (err) => {});