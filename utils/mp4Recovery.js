/**
 * MIGRATION SCRIPT: Fix Corrupted MP4 Base64 Documents
 * 
 * Masalah yang diatasi:
 * 1. Base64 string corrupt di MongoDB
 * 2. Document size limit 16MB
 * 3. String field limitations
 * 
 * Solusi:
 * 1. Skip dokumen dengan Base64 corrupt
 * 2. Migrate ke GridFS untuk file besar
 * 3. Implement proper error handling
 */

// Import ALL models to avoid schema errors
const Document = require('../models/Document');
const Project = require('../models/Project');
const User = require('../models/User');
const Group = require('../models/Group');
const ContinuationRequest = require('../models/ContinuationRequest');
const GridFSService = require('../services/GridFSService');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

async function fixCorruptedMP4Document(documentId) {
  console.log('🔧 Starting MP4 document fix for:', documentId);
  
  try {
    // Mark document as having corrupted data
    const updateResult = await Document.findByIdAndUpdate(
      documentId,
      {
        $set: {
          fileDataCorrupted: true,
          fileData: null, // Clear corrupted Base64
          needsReupload: true,
          corruptionDetectedAt: new Date()
        }
      },
      { new: true }
    );

    if (updateResult) {
      console.log('✅ Document marked as corrupted and needs re-upload');
      return {
        success: true,
        message: 'Document marked for re-upload due to corruption',
        documentId: documentId
      };
    } else {
      throw new Error('Document not found');
    }
  } catch (error) {
    console.error('❌ Failed to fix corrupted document:', error);
    throw error;
  }
}

/**
 * Alternative: Try to recover MP4 using original file
 */
async function attemptMP4Recovery(documentId, originalFilePath) {
  console.log('🔄 Attempting MP4 recovery for:', documentId);
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Check if original file exists
    if (!fs.existsSync(originalFilePath)) {
      throw new Error('Original MP4 file not found for recovery');
    }
    
    // Read original file
    const fileBuffer = fs.readFileSync(originalFilePath);
    const fileStats = fs.statSync(originalFilePath);
    
    console.log('📁 Original file found:');
    console.log('- File size:', fileStats.size, 'bytes');
    console.log('- File path:', originalFilePath);
    
    // Use GridFS for large files
    const gridfsService = new GridFSService();
    const shouldUseGridFS = gridfsService.shouldUseGridFS(fileStats.size);
    
    console.log('- Will use GridFS:', shouldUseGridFS);
    
    if (shouldUseGridFS) {
      // Store in GridFS
      const gridfsFileId = await gridfsService.storeFile(fileBuffer, {
        originalName: path.basename(originalFilePath),
        mimeType: 'video/mp4',
        documentType: 'video_demo',
        capstoneCategory: 'capstone2'
      });
      
      // Update document to use GridFS
      await Document.findByIdAndUpdate(documentId, {
        $set: {
          fileData: null,
          gridfsFileId: gridfsFileId,
          useGridFS: true,
          fileDataCorrupted: false,
          needsReupload: false,
          recoveredAt: new Date()
        }
      });
      
      console.log('✅ MP4 successfully recovered using GridFS');
      return { success: true, method: 'gridfs', fileId: gridfsFileId };
    } else {
      // Use Base64 for smaller files
      const base64Data = fileBuffer.toString('base64');
      
      await Document.findByIdAndUpdate(documentId, {
        $set: {
          fileData: base64Data,
          gridfsFileId: null,
          useGridFS: false,
          fileDataCorrupted: false,
          needsReupload: false,
          recoveredAt: new Date()
        }
      });
      
      console.log('✅ MP4 successfully recovered using Base64');
      return { success: true, method: 'base64' };
    }
  } catch (error) {
    console.error('❌ MP4 recovery failed:', error);
    throw error;
  }
}

module.exports = {
  fixCorruptedMP4Document,
  attemptMP4Recovery
};