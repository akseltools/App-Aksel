const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public/favicon.png');

try {
  const buffer = fs.readFileSync(filePath);
  
  // Check PNG signature
  if (buffer.toString('hex', 0, 8) !== '89504e470d0a1a0a') {
    console.log('Not a valid PNG file');
    process.exit(1);
  }

  // IHDR chunk starts at offset 12. 
  // Length (4 bytes), Chunk Type (4 bytes: "IHDR"), Width (4 bytes), Height (4 bytes), Bit Depth (1 byte), Color Type (1 byte)
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const bitDepth = buffer[24];
  const colorType = buffer[25];

  console.log(`PNG Info:`);
  console.log(`Dimensions: ${width}x${height}`);
  console.log(`Color Type: ${colorType} (6 means RGBA / has alpha channel)`);
  console.log(`File Size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
} catch (err) {
  console.error('Error reading favicon.png:', err);
}
