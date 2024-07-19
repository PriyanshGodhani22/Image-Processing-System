# Image-Processing-System

# Image Data Processing System

This Node.js application processes image data from CSV files, validates the data, compresses images, stores processed data in MongoDB, and provides APIs for upload and status checking. This documentation covers the setup, usage, and detailed design of the application.(require Node16)

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)

## Features

- Accept CSV files containing image URLs and product information.
- Validate the CSV data format and headers.
- Compress images asynchronously.
- Store processed image data and associated product information in MongoDB.
- Provide unique request IDs and status checking via API endpoints.
- Clean up uploaded files after processing.

## Tech Stack

- **Node.js**: JavaScript runtime for building the application.
- **Express**: Web framework for Node.js.
- **Multer**: Middleware for handling file uploads.
- **csv-parser**: Stream-based CSV parser for Node.js.
- **MongoDB**: NoSQL database for storing processed data.
- **Sharp**: Image processing library for compressing images.

## Installation

1. **Clone the Repository**:
   ```sh
   git clone https://github.com/PriyanshGodhani22/Image-Processing-System.git
   cd Image-Processing-System
2. **Install Dependecies**:
   ```sh
   npm i
3. **Start Application**:
   run commands in two different terminals
   ```sh
   npm start
   node imageProcessingService.js
   
