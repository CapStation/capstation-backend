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
      
      const hash = this.generateFileHash(fileBuffer);
      const base64String = fileBuffer.toString("base64");

      return {
        base64: base64String,
        hash: hash,
        originalSize: fileBuffer.length,
        base64Size: base64String.length
      };
    } catch (error) {
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

      const fileBuffer = Buffer.from(cleanBase64, "base64");

      if (expectedHash) {
        const actualHash = this.generateFileHash(fileBuffer);
        if (actualHash !== expectedHash) {
          throw new Error("File integrity check failed: hash mismatch");
        }
      }

      return fileBuffer;
    } catch (error) {
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
