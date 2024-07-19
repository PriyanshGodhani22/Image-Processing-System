const express = require('express');
const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const B2 = require('backblaze-b2');

const app = express();
const port = 4000; // Different port for the image processing service

app.use(express.json());

const b2 = new B2({
  applicationKeyId: '8028830e014f',
  applicationKey: '005798214b4c3a74696b6eb4a41f2b242344560e60'
});

async function authorizeB2() {
  await b2.authorize();
}

app.post('/process-images', async (req, res) => {
  const { requestId, products, webhookUrl } = req.body;

  if (!requestId || !products || !webhookUrl) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  try {
    (async () => {
      try {
        const bucketName = "f8c062e89853c0ae9001041f";
        const processedImages = [];

        await authorizeB2()
        for (const product of products) {
          const processedUrls = await Promise.all(product.inputImageUrls.map(async (url, index) => {
            const response = await axios({
              url,
              responseType: 'arraybuffer'
            });

            const buffer = Buffer.from(response.data, 'binary');
            const metaData = await sharp(buffer).metadata();

            // Resize the image
            const resizedBuffer = await sharp(buffer)
              .resize({ width: Math.floor(metaData.width / 2) })
              .toBuffer();

            // Upload the resized image to Backblaze B2
            const fileExtension = metaData.format;
            const fileName = `${requestId + product.productName}-${index}.${fileExtension}`;

            try {
              const uploadUrlResponse = await b2.getUploadUrl({ bucketId: bucketName });
              const uploadUrl = uploadUrlResponse.data.uploadUrl;
              const uploadAuthToken = uploadUrlResponse.data.authorizationToken;

              const uploadResponse = await b2.uploadFile({
                uploadUrl: uploadUrl,
                uploadAuthToken: uploadAuthToken,
                fileName: fileName,
                data: resizedBuffer
              });

              const outputImageUrl = `https://f000.backblazeb2.com/file/image-s1/${fileName}`;

              processedImages.push({
                serialNumber: product.serialNumber,
                productName: product.productName,
                inputImageUrl: url,
                outputImageUrl: outputImageUrl
              });

              return outputImageUrl; // Return the processed image URL
            } catch (error) {
              console.error(`Error uploading file to B2: ${error.message}`);
              throw error;
            }
          }));
        }
        // Send the processed image URLs back to the main application via webhook
        await axios.post(webhookUrl, { requestId, images: processedImages });
      } catch (err) {
        console.log('process-images------------>', err);
      }
    })()
    res.json({ success: true });
  } catch (error) {
    console.error('Error processing images:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Image processing service is running on port ${port}`);
});
