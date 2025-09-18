const mongoose = require('mongoose');
const Grid = require('gridfs-stream');
const { GridFSBucket } = require('mongodb');

/**
 * GridFS Service for handling large files (videos, etc.)
 * Solves MongoDB 16MB document limit and Base64 corruption issues
 */
class GridFSService {
  constructor() {
    this.bucket = null;
    this.initialized = false;
  }

  /**
   * Initialize GridFS bucket
   */
  async initialize() {
    try {
      if (this.initialized) return;

      const connection = mongoose.connection;
      if (connection.readyState !== 1) {
        throw new Error('MongoDB connection not ready');
      }

      // Create GridFS bucket for file storage
      this.bucket = new GridFSBucket(connection.db, {
        bucketName: 'capstation_files'
      });

      this.initialized = true;
      console.log('✅ GridFS Service initialized');
    } catch (error) {
      console.error('❌ GridFS initialization failed:', error);
      throw error;
    }
  }

  /**
   * Store file buffer in GridFS
   * @param {Buffer} fileBuffer - File buffer to store
   * @param {Object} metadata - File metadata
   * @returns {Promise<String>} GridFS file ID
   */
  async storeFile(fileBuffer, metadata) {
    try {
      await this.initialize();

      const { originalName, mimeType, documentType, capstoneCategory } = metadata;

      return new Promise((resolve, reject) => {
        const uploadStream = this.bucket.openUploadStream(originalName, {
          metadata: {
            originalName,
            mimeType,
            documentType,
            capstoneCategory,
            uploadedAt: new Date(),
            fileSize: fileBuffer.length
          }
        });

        uploadStream.on('error', reject);
        uploadStream.on('finish', () => {
          console.log('✅ File stored in GridFS:', uploadStream.id);
          resolve(uploadStream.id.toString());
        });

        // Write buffer to GridFS
        uploadStream.end(fileBuffer);
      });
    } catch (error) {
      throw new Error(`Failed to store file in GridFS: ${error.message}`);
    }
  }

  /**
   * Retrieve file buffer from GridFS
   * @param {String} fileId - GridFS file ID
   * @returns {Promise<Object>} File buffer and metadata
   */
  async retrieveFile(fileId) {
    try {
      await this.initialize();

      const objectId = new mongoose.Types.ObjectId(fileId);

      // Get file metadata
      const fileInfo = await this.bucket.find({ _id: objectId }).toArray();
      if (!fileInfo || fileInfo.length === 0) {
        throw new Error('File not found in GridFS');
      }

      const metadata = fileInfo[0];

      // Download file as buffer
      return new Promise((resolve, reject) => {
        const chunks = [];
        const downloadStream = this.bucket.openDownloadStream(objectId);

        downloadStream.on('data', (chunk) => {
          chunks.push(chunk);
        });

        downloadStream.on('error', reject);

        downloadStream.on('end', () => {
          const fileBuffer = Buffer.concat(chunks);
          resolve({
            fileBuffer,
            metadata: {
              originalName: metadata.filename,
              mimeType: metadata.metadata.mimeType,
              fileSize: metadata.length,
              documentType: metadata.metadata.documentType,
              capstoneCategory: metadata.metadata.capstoneCategory
            }
          });
        });
      });
    } catch (error) {
      throw new Error(`Failed to retrieve file from GridFS: ${error.message}`);
    }
  }

  /**
   * Delete file from GridFS
   * @param {String} fileId - GridFS file ID
   */
  async deleteFile(fileId) {
    try {
      await this.initialize();
      const objectId = new mongoose.Types.ObjectId(fileId);
      await this.bucket.delete(objectId);
      console.log('✅ File deleted from GridFS:', fileId);
    } catch (error) {
      throw new Error(`Failed to delete file from GridFS: ${error.message}`);
    }
  }

  /**
   * Check if file is large enough to require GridFS
   * @param {Number} fileSize - File size in bytes
   * @returns {Boolean} Whether to use GridFS
   */
  shouldUseGridFS(fileSize) {
    // Use GridFS for files > 10MB to avoid Base64 overhead
    const GRIDFS_THRESHOLD = 10 * 1024 * 1024; // 10MB
    return fileSize > GRIDFS_THRESHOLD;
  }

  /**
   * Get file statistics
   */
  async getStatistics() {
    try {
      await this.initialize();
      
      const files = await this.bucket.find({}).toArray();
      const totalSize = files.reduce((sum, file) => sum + file.length, 0);
      
      return {
        totalFiles: files.length,
        totalSize,
        totalSizeFormatted: `${(totalSize / 1024 / 1024).toFixed(2)} MB`
      };
    } catch (error) {
      throw new Error(`Failed to get GridFS statistics: ${error.message}`);
    }
  }
}

module.exports = GridFSService;