const crypto = require("crypto");
const path = require("path");
const FileValidationManager = require("../utils/FileValidationManager");

class Base64FileService {
  constructor() {
    this.validator = FileValidationManager;
  }

  fileToBase64(fileBuffer, options = {}) {
    try {
      if (!Buffer.isBuffer(fileBuffer)) {
        throw new Error("Input harus berupa Buffer");
      }

      console.log(`Converting file to base64 (${fileBuffer.length} bytes)...`);
      
      // Check buffer size and validate boundaries
      const bufferSize = fileBuffer.length;
      if (bufferSize === 0) {
        throw new Error("Buffer kosong tidak dapat dikonversi");
      }

      // For very large files (>16MB), process in chunks to avoid memory issues
      const CHUNK_SIZE = 16 * 1024 * 1024; // 16MB chunks
      let base64String;

      if (bufferSize > CHUNK_SIZE) {
        console.log(`Large file detected (${bufferSize} bytes), processing in chunks...`);
        const chunks = [];
        
        for (let offset = 0; offset < bufferSize; offset += CHUNK_SIZE) {
          const endOffset = Math.min(offset + CHUNK_SIZE, bufferSize);
          const chunk = fileBuffer.subarray(offset, endOffset);
          chunks.push(chunk.toString("base64"));
        }
        
        base64String = chunks.join("");
        console.log(`Processed ${chunks.length} chunks successfully`);
      } else {
        base64String = fileBuffer.toString("base64");
      }
      
      const hash = this.generateFileHash(fileBuffer);

      return {
        base64: base64String,
        hash: hash,
        originalSize: fileBuffer.length,
        base64Size: base64String.length
      };
    } catch (error) {
      console.error(`Error in fileToBase64: ${error.message}`);
      throw new Error(`Error converting file to base64: ${error.message}`);
    }
  }

  base64ToFile(base64String, expectedHash = null) {
    try {
      if (!base64String || typeof base64String !== "string") {
        throw new Error("Base64 string tidak valid");
      }

      let cleanBase64 = base64String;
      if (base64String.includes(",")) {
        cleanBase64 = base64String.split(",")[1];
      }

      // Validate base64 string length before conversion
      if (cleanBase64.length === 0) {
        throw new Error("Base64 string kosong setelah pembersihan");
      }

      // Check if base64 string is properly padded
      const padding = cleanBase64.length % 4;
      if (padding === 1) {
        throw new Error("Base64 string tidak valid: padding incorrect");
      }

      const fileBuffer = Buffer.from(cleanBase64, "base64");

      // Validate buffer was created successfully
      if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
        throw new Error("Gagal membuat buffer dari base64 string");
      }

      if (expectedHash) {
        const actualHash = this.generateFileHash(fileBuffer);
        if (actualHash !== expectedHash) {
          throw new Error("File integrity check failed: hash mismatch");
        }
      }

      return fileBuffer;
    } catch (error) {
      console.error(`Error in base64ToFile: ${error.message}`);
      throw new Error(`Error converting base64 to file: ${error.message}`);
    }
  }

  validateFile(fileBuffer, originalName, mimeType, documentType) {
    try {
      if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
        throw new Error("File buffer tidak valid");
      }

      const fileInfo = {
        originalName: originalName,
        size: fileBuffer.length,
        mimeType: mimeType,
        documentType: documentType
      };

      const validation = this.validator.validateFile(fileInfo);
      
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  generateFileHash(fileBuffer) {
    return crypto.createHash("sha256").update(fileBuffer).digest("hex");
  }

  formatFileSize(bytes) {
    return this.validator.formatFileSize(bytes);
  }

  async processFileForUpload(fileBuffer, fileInfo) {
    try {
      console.log("Processing file for upload:", fileInfo.originalName);

      this.validateFile(fileBuffer, fileInfo.originalName, fileInfo.mimeType, fileInfo.documentType);

      const base64Result = this.fileToBase64(fileBuffer);

      const processedData = {
        originalName: fileInfo.originalName,
        fileSize: fileBuffer.length,
        mimeType: fileInfo.mimeType,
        fileExtension: path.extname(fileInfo.originalName).toLowerCase(),
        base64Data: base64Result.base64, // Fix: change from fileData to base64Data
        fileHash: base64Result.hash,
        documentType: fileInfo.documentType
      };

      console.log("File processing completed successfully");
      return processedData;
    } catch (error) {
      console.error("File processing failed:", error.message);
      throw error;
    }
  }

  async processFileForDownload(base64Data, fileInfo) {
    try {
      console.log("Processing file for download:", fileInfo.originalName);

      // Validate base64 data
      if (!base64Data || typeof base64Data !== 'string') {
        throw new Error('Invalid base64 data for download');
      }

      // Convert base64 to buffer for validation
      const fileBuffer = this.base64ToFile(base64Data);

      // Validate file hash if provided
      if (fileInfo.expectedHash) {
        const actualHash = this.generateFileHash(fileBuffer);
        if (actualHash !== fileInfo.expectedHash) {
          throw new Error('File integrity check failed: hash mismatch');
        }
      }

      const processedData = {
        fileBuffer: fileBuffer,
        originalName: fileInfo.originalName,
        mimeType: fileInfo.mimeType,
        fileSize: fileBuffer.length,
        fileExtension: fileInfo.fileExtension,
        downloadTimestamp: new Date().toISOString()
      };

      console.log("File download processing completed successfully");
      return processedData;
    } catch (error) {
      console.error("File download processing failed:", error.message);
      throw error;
    }
  }
}

module.exports = Base64FileService;
