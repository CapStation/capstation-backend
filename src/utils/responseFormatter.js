/**
 * Utility untuk memformat data response API
 * lebih buat debug sama test api buat file data biar ga panjang
 */

/**
 * Mempersingkat Base64 fileData untuk preview
 * @param {String} fileData - Full Base64 string
 * @param {Number} previewLength - Jumlah karakter untuk preview (default: 50)
 * @returns {String} Shortened fileData dengan ellipsis
 */
function truncateFileData(fileData, previewLength = 50) {
  if (!fileData || typeof fileData !== 'string') {
    return fileData;
  }
  
  if (fileData.length <= previewLength) {
    return fileData;
  }
  
  return `${fileData.substring(0, previewLength)}...`;
}

/**
 * Memformat documents array untuk response API
 * Mempersingkat fileData pada setiap dokumen
 * @param {Array} documents - Array of document objects
 * @returns {Array} Formatted documents dengan fileData yang diperpendek
 */
function formatDocumentsForResponse(documents) {
  if (!documents || !Array.isArray(documents)) {
    return [];
  }
  
  return documents.map(doc => {
    if (!doc) return doc;
    
    const docObj = doc.toObject ? doc.toObject() : doc;
    
    if (docObj.fileData) {
      return {
        ...docObj,
        fileData: truncateFileData(docObj.fileData),
        _originalFileDataLength: docObj.fileData.length
      };
    }
    return docObj;
  });
}

/**
 * Memformat project response dengan documents yang diperpendek
 * @param {Object} project - Project object dari database
 * @returns {Object} Formatted project dengan shortened documents
 */
function formatProjectForResponse(project) {
  if (!project) {
    return project;
  }
  
  const projectObj = project.toObject ? project.toObject() : project;
  
  // Format documents array
  if (projectObj.documents && Array.isArray(projectObj.documents)) {
    projectObj.documents = formatDocumentsForResponse(projectObj.documents);
  } else {
    projectObj.documents = [];
  }
  
  return projectObj;
}

module.exports = {
  truncateFileData,
  formatDocumentsForResponse,
  formatProjectForResponse
};