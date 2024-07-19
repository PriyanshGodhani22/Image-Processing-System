const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  serialNumber: String,
  productName: String,
  inputImageUrl: String,
  outputImageUrl: String
});
// Define a schema for tracking requests
const requestSchema = new mongoose.Schema({
  requestId: { type: String, unique: true },
  status: { type: String, enum: ['Pending', 'Processing', 'Completed', 'Failed'], default: 'Pending' },
  images: [imageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = requestSchema;