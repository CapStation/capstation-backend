/**
 * File Validation Middleware for Base64 Storage
 * Menvalidasi file yang akan diupload dengan base64 storage
 * capstone-specific document types dan size limits
 */

const validateCapstoneDocumentType = (req, res, next) => {
  try {
    const { documentType, capstoneType } = req.body;

    // Validasi wajib document type dan capstone type
    if (!documentType) {
      return res.status(400).json({
        success: false,
        message: 'Document type wajib diisi',
        data: null
      });
    }

    if (!capstoneType) {
      return res.status(400).json({
        success: false,
        message: 'Capstone type wajib diisi',
        data: null
      });
    }

    // Validasi capstone type
    const validCapstoneTypes = ['capstone1', 'capstone2'];
    if (!validCapstoneTypes.includes(capstoneType)) {
      return res.status(400).json({
        success: false,
        message: 'Capstone type harus capstone1 atau capstone2',
        data: null
      });
    }

    // Definisi document types untuk setiap capstone
    const capstone1DocumentTypes = ['proposal_capstone1', 'ppt_sidang_capstone1'];
    const capstone2DocumentTypes = ['gambar_alat_capstone2', 'desain_poster_capstone2', 'video_demo_capstone2'];

    // Validasi kesesuaian document type dengan capstone type
    if (capstoneType === 'capstone1' && !capstone1DocumentTypes.includes(documentType)) {
      return res.status(400).json({
        success: false,
        message: `Document type ${documentType} tidak valid untuk capstone1. Gunakan: ${capstone1DocumentTypes.join(', ')}`,
        data: null
      });
    }

    if (capstoneType === 'capstone2' && !capstone2DocumentTypes.includes(documentType)) {
      return res.status(400).json({
        success: false,
        message: `Document type ${documentType} tidak valid untuk capstone2. Gunakan: ${capstone2DocumentTypes.join(', ')}`,
        data: null
      });
    }

    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Validation error: ${error.message}`,
      data: null
    });
  }
};

const validateRequiredFields = (req, res, next) => {
  try {
    const { title, description, project } = req.body;

    // Validasi field wajib
    const requiredFields = ['title', 'description', 'project'];
    const missingFields = [];

    requiredFields.forEach(field => {
      if (!req.body[field]) {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Field wajib tidak ada: ${missingFields.join(', ')}`,
        data: null
      });
    }

    // Validasi panjang field
    if (title.length < 3 || title.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Title harus antara 3-200 karakter',
        data: null
      });
    }

    if (description.length < 10 || description.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Description harus antara 10-1000 karakter',
        data: null
      });
    }

    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Validation error: ${error.message}`,
      data: null
    });
  }
};

const validateFilePresence = (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: 'File wajib diupload',
        data: null
      });
    }

    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `File validation error: ${error.message}`,
      data: null
    });
  }
};

const validateUpdateFields = (req, res, next) => {
  try {
    const { title, description } = req.body;

    // Untuk update, field tidak wajib tapi jika ada harus valid
    if (title !== undefined) {
      if (typeof title !== 'string' || title.length < 3 || title.length > 200) {
        return res.status(400).json({
          success: false,
          message: 'Title harus string antara 3-200 karakter',
          data: null
        });
      }
    }

    if (description !== undefined) {
      if (typeof description !== 'string' || description.length < 10 || description.length > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Description harus string antara 10-1000 karakter',
          data: null
        });
      }
    }

    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Update validation error: ${error.message}`,
      data: null
    });
  }
};

const validateBulkDelete = (req, res, next) => {
  try {
    const { documentIds } = req.body;

    if (!Array.isArray(documentIds)) {
      return res.status(400).json({
        success: false,
        message: 'documentIds harus berupa array',
        data: null
      });
    }

    if (documentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'documentIds tidak boleh kosong',
        data: null
      });
    }

    if (documentIds.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Maksimal 50 dokumen untuk bulk delete',
        data: null
      });
    }

    // Validasi format ID
    const invalidIds = documentIds.filter(id => {
      return typeof id !== 'string' || id.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(id);
    });

    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Format ID dokumen tidak valid',
        data: null
      });
    }

    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Bulk delete validation error: ${error.message}`,
      data: null
    });
  }
};

const validateCapstoneTypeParam = (req, res, next) => {
  try {
    const { capstoneType } = req.params;

    const validTypes = ['capstone1', 'capstone2'];
    if (!validTypes.includes(capstoneType)) {
      return res.status(400).json({
        success: false,
        message: 'Capstone type harus capstone1 atau capstone2',
        data: null
      });
    }

    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Capstone validation error: ${error.message}`,
      data: null
    });
  }
};

const validatePaginationParams = (req, res, next) => {
  try {
    const { page, limit } = req.query;

    if (page !== undefined) {
      const pageNum = parseInt(page);
      if (isNaN(pageNum) || pageNum < 1) {
        return res.status(400).json({
          success: false,
          message: 'Page harus berupa angka positif',
          data: null
        });
      }
    }

    if (limit !== undefined) {
      const limitNum = parseInt(limit);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({
          success: false,
          message: 'Limit harus berupa angka antara 1-100',
          data: null
        });
      }
    }

    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Pagination validation error: ${error.message}`,
      data: null
    });
  }
};

module.exports = {
  validateCapstoneDocumentType,
  validateRequiredFields,
  validateFilePresence,
  validateUpdateFields,
  validateBulkDelete,
  validateCapstoneTypeParam,
  validatePaginationParams
};