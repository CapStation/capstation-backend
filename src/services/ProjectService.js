const Project = require('../models/Project');
const User = require('../models/userModel'); // Use real auth system
const { formatProjectForResponse } = require('../utils/responseFormatter');
const { getValidThemes } = require('../configs/themes');

/**
 * ProjectService Class
 * Mengelola operasi CRUD dan filtering untuk project capstone
 */
class ProjectService {
  constructor() {
    this.model = Project;
  }

  /**
   * Membuat project baru
   * @param {Object} projectData - Data project yang akan dibuat
   * @param {String} ownerId - ID user yang membuat project
   * @returns {Promise<Object>} Project yang telah dibuat
   */
  async createProject(projectData, ownerId) {
    try {
      // Validasi owner
      const owner = await User.findById(ownerId);
      if (!owner) {
        throw new Error('Owner tidak ditemukan');
      }

      // Set group sama dengan owner ID
      const newProject = new this.model({
        ...projectData,
        owner: ownerId,
        group: ownerId  // Group ID sama dengan owner ID
      });

      const savedProject = await newProject.save();
      
      return await this.getProjectById(savedProject._id);
    } catch (error) {
      throw new Error(`Gagal membuat project: ${error.message}`);
    }
  }

  /**
   * Mendapatkan semua project dengan filtering berdasarkan kategori/tema
   * @param {Object} filters - Filter options
   * @param {String} filters.category - Kategori project (kesehatan, smart_city, dll)
   * @param {String} filters.capstoneType - Tipe capstone (capstone1, capstone2)
   * @param {String} filters.status - Status project (bisa_dilanjutkan, ditutup)
   * @param {String} filters.academicYear - Tahun ajaran
   * @param {String} filters.search - Keyword untuk pencarian
   * @param {Number} filters.page - Halaman (default: 1)
   * @param {Number} filters.limit - Limit per halaman (default: 10)
   * @returns {Promise<Object>} Result dengan projects dan pagination info
   */
  async getProjectsByFilter(filters = {}) {
    try {
      console.log('🔍 ProjectService.getProjectsByFilter called with:', filters);
      
      const {
        tema,           // Ganti category dengan tema
        status,
        academicYear,
        search,
        page = 1,
        limit = 10,
        capstoneType,   // Added missing field
        category,       // Added missing field
        owner           // Added owner filter for my-projects
      } = filters;

      const query = { isActive: true };

      // Filter berdasarkan owner (untuk my-projects)
      if (owner) {
        query.owner = owner;
        console.log('🔍 Filtering by owner:', owner);
        console.log('🔍 Query object:', JSON.stringify(query, null, 2));
      }

      // Filter berdasarkan tema project
      if (tema) {
        query.tema = tema;
      }

      // Filter berdasarkan category (legacy support)
      if (category && !tema) {
        query.tema = category; // Map category to tema for backwards compatibility
      }

      // Filter berdasarkan capstone type
      if (capstoneType) {
        query.capstoneType = capstoneType;
      }

      // Filter berdasarkan status
      if (status) {
        query.status = status;
      }

      // Filter berdasarkan tahun ajaran
      if (academicYear) {
        query.academicYear = academicYear;
      }

      // Filter berdasarkan pencarian (title dan description)
      if (search) {
        query.$text = { $search: search };
      }

      // Pagination
      const skip = (page - 1) * limit;
      
      try {
        console.log('🔍 Final query:', JSON.stringify(query, null, 2));
        const projects = await this.model.find(query).limit(parseInt(limit));
        console.log('📊 Found projects:', projects.length);
        
        return {
          projects,
          pagination: {
            currentPage: page,
            totalPages: 1,
            totalProjects: projects.length,
            hasNextPage: false,
            hasPrevPage: false
          }
        };
        
      } catch (stepError) {
        console.error('❌ Step error:', stepError);
        throw stepError;
      }

      // Count total documents  
      const total = await this.model.countDocuments(query);
      console.log(`Total projects: ${total}`);
      const totalPages = Math.ceil(total / limit);

      return {
        projects,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalProjects: total,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Gagal mengambil data project: ${error.message}`);
    }
  }

  /**
   * Mendapatkan project berdasarkan tema tertentu
   * @param {String} tema - Tema project
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Projects dengan pagination
   */
  async getProjectsByTema(tema, options = {}) {
    try {
      console.log(`🔍 Getting projects by tema: ${tema}`);
      
      return await this.getProjectsByFilter({
        tema,
        ...options
      });
    } catch (error) {
      throw new Error(`Gagal mengambil project berdasarkan tema: ${error.message}`);
    }
  }

  /**
   * Mendapatkan project berdasarkan kategori tertentu
   * @param {String} category - Kategori project
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} Array project
   */
  async getProjectsByCategory(category, options = {}) {
    try {
      const validCategories = getValidThemes();

      if (!validCategories.includes(category)) {
        throw new Error('Kategori tidak valid');
      }

      return await this.getProjectsByFilter({
        category,
        ...options
      });
    } catch (error) {
      throw new Error(`Gagal mengambil project berdasarkan kategori: ${error.message}`);
    }
  }

  /**
   * Mendapatkan project berdasarkan tipe capstone
   * @param {String} capstoneType - Tipe capstone (capstone1, capstone2)
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Project capstone dengan pagination
   */
  async getProjectsByCapstoneType(capstoneType, options = {}) {
    try {
      const validTypes = ['capstone1', 'capstone2'];

      if (!validTypes.includes(capstoneType)) {
        throw new Error('Tipe capstone tidak valid. Harus capstone1 atau capstone2');
      }

      return await this.getProjectsByFilter({
        capstoneType,
        ...options
      });
    } catch (error) {
      throw new Error(`Gagal mengambil project berdasarkan tipe capstone: ${error.message}`);
    }
  }

  /**
   * Mendapatkan project capstone 1 yang tersedia
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object>} Capstone 1 projects
   */
  async getCapstone1Projects(filters = {}) {
    try {
      return await this.getProjectsByFilter({
        capstoneType: 'capstone1',
        status: 'bisa_dilanjutkan',
        ...filters
      });
    } catch (error) {
      throw new Error(`Gagal mengambil project capstone 1: ${error.message}`);
    }
  }

  /**
   * Mendapatkan project capstone 2 yang tersedia
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object>} Capstone 2 projects
   */
  async getCapstone2Projects(filters = {}) {
    try {
      return await this.getProjectsByFilter({
        capstoneType: 'capstone2',
        status: 'bisa_dilanjutkan',
        ...filters
      });
    } catch (error) {
      throw new Error(`Gagal mengambil project capstone 2: ${error.message}`);
    }
  }

  /**
   * Mendapatkan project berdasarkan kategori dan tipe capstone
   * @param {String} category - Kategori project
   * @param {String} capstoneType - Tipe capstone
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Filtered projects
   */
  async getProjectsByCategoryAndCapstone(category, capstoneType, options = {}) {
    try {
      return await this.getProjectsByFilter({
        category,
        capstoneType,
        ...options
      });
    } catch (error) {
      throw new Error(`Gagal mengambil project berdasarkan kategori dan capstone: ${error.message}`);
    }
  }

  /**
   * Mendapatkan project yang bisa dilanjutkan
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object>} Available projects dengan pagination
   */
  async getAvailableProjects(filters = {}) {
    try {
      return await this.getProjectsByFilter({
        status: 'bisa_dilanjutkan',
        ...filters
      });
    } catch (error) {
      throw new Error(`Gagal mengambil project yang tersedia: ${error.message}`);
    }
  }

  /**
   * Mendapatkan project berdasarkan ID
   * @param {String} projectId - ID project
   * @returns {Promise<Object>} Project detail
   */
  async getProjectById(projectId) {
    try {
      const project = await this.model
        .findById(projectId)
        .populate('owner', 'name email')
        .populate('group', 'name email')
        .populate('documents');

      if (!project) {
        throw new Error('Project tidak ditemukan');
      }

      // Format response untuk mempersingkat fileData
      return formatProjectForResponse(project);
    } catch (error) {
      throw new Error(`Gagal mengambil detail project: ${error.message}`);
    }
  }

  /**
   * Update project
   * @param {String} projectId - ID project
   * @param {Object} updateData - Data yang akan diupdate
   * @param {String} userId - ID user yang melakukan update
   * @returns {Promise<Object>} Updated project
   */
  async updateProject(projectId, updateData, userId) {
    try {
      console.log('🔍 ProjectService updateProject:', { projectId, updateData, userId });

      const project = await this.model.findById(projectId);
      if (!project) {
        throw new Error('Project tidak ditemukan');
      }

      // Permission check with null safety
      if (project.owner && project.owner.toString() !== userId.toString()) {
        // Check if user is admin or dosen (using real auth system)
        const user = await User.findById(userId);
        if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
          throw new Error('Tidak memiliki izin untuk mengupdate project ini');
        }
        console.log('✅ Admin/Dosen access granted for project update');
      }

      // Update project
      Object.assign(project, updateData);
      const updatedProject = await project.save();

      return await this.getProjectById(updatedProject._id);
    } catch (error) {
      console.error('❌ ProjectService updateProject error:', error);
      throw new Error(`Gagal update project: ${error.message}`);
    }
  }

  /**
   * Update status project (bisa_dilanjutkan/ditutup)
   * @param {String} projectId - ID project
   * @param {String} status - Status baru
   * @param {String} userId - ID user yang melakukan update
   * @returns {Promise<Object>} Updated project
   */
  async updateProjectStatus(projectId, status, userId) {
    try {
      const validStatuses = ['bisa_dilanjutkan', 'ditutup'];
      if (!validStatuses.includes(status)) {
        throw new Error('Status tidak valid');
      }

      return await this.updateProject(projectId, { status }, userId);
    } catch (error) {
      throw new Error(`Gagal update status project: ${error.message}`);
    }
  }

  /**
   * Delete project (soft delete)
   * @param {String} projectId - ID project
   * @param {String} userId - ID user yang melakukan delete
   * @returns {Promise<Boolean>} Success status
   */
  async deleteProject(projectId, userId) {
    try {
      const project = await this.model.findById(projectId);
      if (!project) {
        throw new Error('Project tidak ditemukan');
      }

      // Hanya owner atau admin yang bisa delete
      const user = await User.findById(userId);
      if (project.owner.toString() !== userId.toString() && !user.isAdmin) {
        throw new Error('Tidak memiliki izin untuk menghapus project');
      }

      project.isActive = false;
      await project.save();

      return true;
    } catch (error) {
      throw new Error(`Gagal hapus project: ${error.message}`);
    }
  }

  /**
   * Mendapatkan project berdasarkan owner
   * @param {String} ownerId - ID owner
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object>} Projects with pagination
   */
  async getProjectsByOwner(ownerId, filters = {}) {
    try {
      const query = {
        owner: ownerId,
        isActive: true,
        ...filters
      };

      const projects = await this.model
        .find(query)
        .populate('owner', 'name email')
        .populate('group', 'name email')
        .populate('documents', 'title filename fileSize mimeType createdAt')
        .sort({ createdAt: -1 });

      return projects;
    } catch (error) {
      throw new Error(`Gagal mengambil project owner: ${error.message}`);
    }
  }

  /**
   * Mendapatkan statistik project berdasarkan kategori
   * @returns {Promise<Object>} Statistics data
   */
  async getProjectStatistics() {
    try {
      const stats = await this.model.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            availableCount: {
              $sum: { $cond: [{ $eq: ['$status', 'bisa_dilanjutkan'] }, 1, 0] }
            },
            closedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'ditutup'] }, 1, 0] }
            }
          }
        },
        {
          $project: {
            category: '$_id',
            total: '$count',
            available: '$availableCount',
            closed: '$closedCount',
            _id: 0
          }
        }
      ]);

      // Total keseluruhan
      const totalStats = await this.model.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            totalProjects: { $sum: 1 },
            availableProjects: {
              $sum: { $cond: [{ $eq: ['$status', 'bisa_dilanjutkan'] }, 1, 0] }
            },
            closedProjects: {
              $sum: { $cond: [{ $eq: ['$status', 'ditutup'] }, 1, 0] }
            }
          }
        }
      ]);

      return {
        categoryStats: stats,
        totalStats: totalStats[0] || {
          totalProjects: 0,
          availableProjects: 0,
          closedProjects: 0
        }
      };
    } catch (error) {
      throw new Error(`Gagal mengambil statistik project: ${error.message}`);
    }
  }

  /**
   * Search projects dengan advanced filtering
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Object>} Search results
   */
  async advancedSearch(searchParams) {
    try {
      const {
        keyword,
        categories = [],
        statuses = [],
        academicYears = [],
        tags = [],
        dateRange = {},
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 10
      } = searchParams;

      const query = { isActive: true };

      // Keyword search
      if (keyword) {
        query.$or = [
          { title: { $regex: keyword, $options: 'i' } },
          { description: { $regex: keyword, $options: 'i' } },
          { tags: { $in: [new RegExp(keyword, 'i')] } }
        ];
      }

      // Categories filter
      if (categories.length > 0) {
        query.category = { $in: categories };
      }

      // Status filter
      if (statuses.length > 0) {
        query.status = { $in: statuses };
      }

      // Academic years filter
      if (academicYears.length > 0) {
        query.academicYear = { $in: academicYears };
      }

      // Tags filter
      if (tags.length > 0) {
        query.tags = { $in: tags };
      }

      // Date range filter
      if (dateRange.start || dateRange.end) {
        query.createdAt = {};
        if (dateRange.start) {
          query.createdAt.$gte = new Date(dateRange.start);
        }
        if (dateRange.end) {
          query.createdAt.$lte = new Date(dateRange.end);
        }
      }

      // Sorting
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Pagination
      const skip = (page - 1) * limit;

      const projects = await this.model
        .find(query)
        .populate('owner', 'name email')
        .populate('group', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      const total = await this.model.countDocuments(query);
      const totalPages = Math.ceil(total / limit);

      return {
        projects,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalProjects: total,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        searchParams
      };
    } catch (error) {
      throw new Error(`Gagal melakukan pencarian advanced: ${error.message}`);
    }
  }
}

module.exports = ProjectService;