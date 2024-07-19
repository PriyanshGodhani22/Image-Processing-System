require('dotenv').config();
const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const axios = require('axios');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const { Request } = require('./models');
const app = express();
const port = process.env.PORT || 3000;
const fs = require('fs');
const csvParser = require('csv-parser');
const path = require('path');

// Configure Multer for file uploads
const upload = multer({ dest: 'uploads/' });

const cleanHeader = (header) => {
  return String(header).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
};


// Endpoint to upload CSV
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const requestId = uuidv4();
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const csvFilePath = path.join(__dirname, file.path);
    try {
      const products = await validateCSV(csvFilePath);
      fs.unlinkSync(csvFilePath);
      const newRequest = new Request({
        requestId,
        status: 'Pending',
        images: products.flatMap(product => product.inputImageUrls.map(url => ({
          serialNumber: product.serialNumber,
          productName: product.productName,
          inputImageUrl: url,
          outputImageUrl: null
        })))
      });
      await newRequest.save();

      // Call the image processing service
      await axios.post('http://localhost:4000/process-images', {
        requestId,
        products,
        webhookUrl: `http://localhost:3000/webhook`
      });
      return res.json({ requestId });
    } catch (err) {
      return res.status(400).json({ error: err });
    }
  } catch (error) {
    return res.status(500).json({ error: error });
  }
});

// Endpoint to check status
app.get('/status/:requestId', async (req, res) => {
  const { requestId } = req.params;
  const request = await Request.findOne({ requestId });

  if (!request) {
    return res.status(404).json({ error: 'Request not found' });
  }

  res.json({ status: request.status, processedImages: request.processedImages });
});

app.post('/webhook', express.json(), async (req, res) => {
  const { requestId, images } = req.body;

  if (!requestId || !images) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  try {
    const request = await Request.findOne({ requestId });

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Update the images in the request
    request.images = images.map(image => ({
      serialNumber: image.serialNumber,
      productName: image.productName,
      inputImageUrl: image.inputImageUrl,
      outputImageUrl: image.outputImageUrl
    }));

    request.status = 'Completed';
    request.updatedAt = new Date();

    await request.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const validateCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    let cleanedHeaders = [];
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('headers', (headers) => {
        // Clean headers
        cleanedHeaders = headers.map(header => cleanHeader(header));

        // Check if the cleaned headers contain the required columns
        if (!cleanedHeaders.includes('sno') || !cleanedHeaders.includes('productname') || !cleanedHeaders.includes('inputimageurls')) {
          return reject('Invalid CSV format: Required columns missing');
        }
      })
      .on('data', (row) => {
        // Create a new object with cleaned headers as keys
        const cleanedRow = {};
        cleanedHeaders.forEach((header, index) => {
          if (String(row[Object.keys(row)[index]]).trim()) {
            cleanedRow[header] = row[Object.keys(row)[index]];
          } else {
            return reject('Invalid CSV format: Required columns missing');
          }
        });
        results.push({
          serialNumber: cleanedRow['sno'],
          productName: cleanedRow['productname'],
          inputImageUrls: cleanedRow['inputimageurls'].split(',').map(url => url.trim())
        });
      })
      .on('end', () => {
        // Example validation: Check if the required columns are present
        if (!results.length) {
          return reject('Invalid CSV format');
        } else {
          return resolve(results);
        }
      })
      .on('error', (error) => {
        return reject(error)
      });
  });
};
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


