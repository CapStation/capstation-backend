const Project = require('../models/Project');
const User = require('../models/userModel');
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

      // Normalize tema to dash format for validation
      const { convertToDash } = require('../configs/themes');
      if (projectData.tema) {
        projectData.tema = convertToDash(projectData.tema);
        console.log('Normalized tema:', projectData.tema);
      }

      // Ensure members array includes the owner
      const members = projectData.members || [ownerId];
      if (!members.includes(ownerId)) {
        members.push(ownerId);
      }

      // Create project with owner and members
      const newProject = new this.model({
        ...projectData,
        owner: ownerId,
        members: members, // Ensure members includes owner
        documents: [] // Initialize empty documents array
      });

      const savedProject = await newProject.save();
      
      // Populate and return
      const populatedProject = await this.model.findById(savedProject._id)
        .populate('owner', 'name email role')
        .populate('supervisor', 'name email role')
        .populate('members', 'name email role')
        .populate('group', 'name description')
        .populate('documents');

      return formatProjectForResponse(populatedProject);
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

      const query = {};

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

      // Filter berdasarkan category
      if (category && !tema) {
        query.tema = category; 
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
        const projects = await this.model
          .find(query)
          .populate('owner', 'fullName name username email')
          .populate('supervisor', 'fullName name username email')
          .populate('group')
          .populate('members', 'fullName name username email')
          .populate('competencies', 'name category description')
          .limit(parseInt(limit))
          .sort({ updatedAt: -1 });
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
   * Mendapatkan project berdasarkan tema tertentu
   * @param {String} tema - Tema project  
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} Array project
   */
  async getProjectsByCategory(tema, options = {}) {
    try {
      const validThemes = getValidThemes();

      if (!validThemes.includes(tema)) {
        throw new Error('Tema tidak valid');
      }

      return await this.getProjectsByFilter({
        tema,
        ...options
      });
    } catch (error) {
      throw new Error(`Gagal mengambil project berdasarkan tema: ${error.message}`);
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
        capstoneStatus: 'accepted',
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
        capstoneStatus: 'accepted',
        ...filters
      });
    } catch (error) {
      throw new Error(`Gagal mengambil project capstone 2: ${error.message}`);
    }
  }

  /**
   * Mendapatkan project berdasarkan kategori dan tipe capstone
   * @param {String} tema - Tema project
   * @param {String} capstoneType - Tipe capstone
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Filtered projects
   */
  async getProjectsByCategoryAndCapstone(tema, capstoneType, options = {}) {
    try {
      return await this.getProjectsByFilter({
        tema,
        capstoneType,
        ...options
      });
    } catch (error) {
      throw new Error(`Gagal mengambil project berdasarkan tema dan capstone: ${error.message}`);
    }
  }

  /**
   * Update group ID pada project dan sync members dari group
   * @param {String} projectId - ID project yang akan diupdate
   * @param {String} groupId - ID group baru
   * @param {String} userId - ID user yang melakukan update
   * @returns {Promise<Object>} Updated project
   */
  async updateProjectGroup(projectId, groupId, userId) {
    try {
      // Validate ObjectId
      if (!projectId.match(/^[0-9a-fA-F]{24}$/)) {
        throw new Error('Project ID tidak valid');
      }
      if (!groupId.match(/^[0-9a-fA-F]{24}$/)) {
        throw new Error('Group ID tidak valid');
      }

      // Find project
      const project = await this.model.findById(projectId);
      if (!project) {
        throw new Error('Project tidak ditemukan');
      }

      // Check if user is owner or admin
      const User = require('../models/User');
      const user = await User.findById(userId);
      
      const isOwner = project.owner.toString() === userId.toString();
      const isAdmin = user && (user.role === 'admin' || user.role === 'dosen');
      
      if (!isOwner && !isAdmin) {
        throw new Error('Hanya owner project atau admin yang bisa mengubah group');
      }

      // Validate group exists
      const Group = require('../models/groupModel');
      const group = await Group.findById(groupId).populate('members', 'name email role');
      
      if (!group) {
        throw new Error('Group tidak ditemukan');
      }

      // Update project group and sync members
      project.group = groupId;
      project.members = group.members.map(m => m._id);
      
      await project.save({ validateBeforeSave: false });

      // Return populated project
      const updatedProject = await this.model.findById(projectId)
        .populate('owner', 'name email role')
        .populate('supervisor', 'name email role')
        .populate('members', 'name email role')
        .populate('group', 'name description')
        .populate('documents');

      console.log(`✅ Project ${projectId} group updated to ${groupId}, synced ${group.members.length} members`);
      
      return formatProjectForResponse(updatedProject);
    } catch (error) {
      throw new Error(`Gagal mengupdate group project: ${error.message}`);
    }
  }

  /**
   * Mendapatkan project yang bisa dilanjutkan (untuk capstone yang accepted)
   * @param {Object} filters 
   * @returns {Promise<Object>} 
   */
  async getAvailableProjects(filters = {}) {
    try {
      return await this.getProjectsByFilter({
        capstoneStatus: 'accepted',
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
        .populate('owner', 'name email role')
        .populate('supervisor', 'name email role')
        .populate('members', 'name email role')
        .populate('group', 'name description')
        .populate('documents')
        .populate('competencies', 'name category description'); 

      if (!project) {
        throw new Error('Project tidak ditemukan');
      }

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

      const userIdString = userId.toString();
      const isOwner = project.owner && project.owner.toString() === userIdString;
      const isMember = project.members && project.members.some(memberId => memberId.toString() === userIdString);
      
      if (!isOwner && !isMember) {
        // Check if user is admin or dosen
        const user = await User.findById(userId);
        if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
          throw new Error('Tidak memiliki izin untuk mengupdate project ini. Hanya owner, members, admin, atau dosen yang diizinkan.');
        }
        console.log('✅ Admin/Dosen access granted for project update');
      } else if (isOwner) {
        console.log('✅ Owner access granted for project update');
      } else if (isMember) {
        console.log('✅ Member access granted for project update');
      }

      // Check if admin is changing owner
      const user = await User.findById(userId);
      const isAdmin = user && user.role === 'admin';
      
      if (isAdmin && updateData.owner && updateData.owner !== project.owner?.toString()) {
        // Admin is changing owner - add old owner to members if not already there
        const oldOwner = project.owner;
        const newOwner = updateData.owner;
        
        console.log('👑 Admin switching project owner:', { oldOwner, newOwner });
        
        // Add old owner to members if not already included
        if (oldOwner && !project.members.some(m => m.toString() === oldOwner.toString())) {
          project.members.push(oldOwner);
        }
        
        // Remove new owner from members if they're currently a member
        project.members = project.members.filter(m => m.toString() !== newOwner.toString());
        
        // Set new owner
        project.owner = newOwner;
      }
      
      // Update project - only update allowed fields
      const allowedFields = ['title', 'description', 'tema', 'status', 'capstoneStatus', 
                             'academicYear', 'supervisor', 'tags'];
      
      // Normalize tema if being updated
      const { convertToDash } = require('../configs/themes');
      if (updateData.tema) {
        updateData.tema = convertToDash(updateData.tema);
        console.log('Normalized tema for update:', updateData.tema);
      }
      
      allowedFields.forEach(field => {
        if (updateData.hasOwnProperty(field) && updateData[field] !== undefined) {
          project[field] = updateData[field];
        }
      });

      // Save without validation to avoid issues with unchanged required fields (like group)
      const updatedProject = await project.save({ validateBeforeSave: false });

      return await this.getProjectById(updatedProject._id);
    } catch (error) {
      console.error('❌ ProjectService updateProject error:', error);
      throw new Error(`Gagal update project: ${error.message}`);
    }
  }

  /**
   * Update status project
   * @param {String} projectId - ID project
   * @param {String} status - Status baru
   * @param {String} userId - ID user yang melakukan update
   * @returns {Promise<Object>} Updated project
   */
  async updateProjectStatus(projectId, status, userId) {
    try {
      const project = await this.model.findById(projectId);
      if (!project) {
        throw new Error('Project tidak ditemukan');
      }

      let updateData = {};
      const validCapstoneStatuses = ['new', 'pending', 'accepted', 'rejected'];
      if (!validCapstoneStatuses.includes(status)) {
        throw new Error('Status capstone tidak valid. Harus new, pending, accepted, atau rejected');
      }
      updateData.capstoneStatus = status;

      return await this.updateProject(projectId, updateData, userId);
    } catch (error) {
      throw new Error(`Gagal update status project: ${error.message}`);
    }
  }

  /**
   * Delete project (hard delete)
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

      // Hard delete
      await this.model.findByIdAndDelete(projectId);

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
        ...filters
      };

      const projects = await this.model
        .find(query)
        .populate('owner', 'name email')
        .populate('supervisor', 'name email')
        .populate('members', 'name email')
        .populate('documents', 'title filename fileSize mimeType createdAt')
        .sort({ createdAt: -1 });

      return projects;
    } catch (error) {
      throw new Error(`Gagal mengambil project owner: ${error.message}`);
    }
  }

  /**
   * Mendapatkan statistik project berdasarkan tema
   * @returns {Promise<Object>} Statistics data
   */
  async getProjectStatistics() {
    try {
      const stats = await this.model.aggregate([
        {
          $group: {
            _id: '$tema',
            count: { $sum: 1 },
            availableCount: {
              $sum: { $cond: [{ $eq: ['$status', 'dapat_dilanjutkan'] }, 1, 0] }
            },
            activeCount: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            },
            completedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'selesai'] }, 1, 0] }
            }
          }
        },
        {
          $project: {
            tema: '$_id',
            total: '$count',
            available: '$availableCount',
            active: '$activeCount',
            completed: '$completedCount',
            _id: 0
          }
        }
      ]);

      // Total keseluruhan
      const totalStats = await this.model.aggregate([
        {
          $group: {
            _id: null,
            totalProjects: { $sum: 1 },
            availableProjects: {
              $sum: { $cond: [{ $eq: ['$status', 'dapat_dilanjutkan'] }, 1, 0] }
            },
            activeProjects: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            },
            completedProjects: {
              $sum: { $cond: [{ $eq: ['$status', 'selesai'] }, 1, 0] }
            }
          }
        }
      ]);

      return {
        temaStats: stats,
        totalStats: totalStats[0] || {
          totalProjects: 0,
          availableProjects: 0,
          activeProjects: 0,
          completedProjects: 0
        }
      };
    } catch (error) {
      throw new Error(`Gagal mengambil statistik project: ${error.message}`);
    }
  }
  /**
 * Get project competencies
 * @param {String} projectId - ID project
 * @returns {Promise<Array>} Array of competencies
 */
async getProjectCompetencies(projectId) {
  try {
    const project = await this.model
      .findById(projectId)
      .populate('competencies', 'name category description')
      .select('competencies');

    if (!project) {
      throw new Error('Project tidak ditemukan');
    }

    return project.competencies || [];
  } catch (error) {
    throw new Error(`Gagal mengambil kompetensi project: ${error.message}`);
  }
}

/**
 * Add competency to project
 * @param {String} projectId - ID project
 * @param {String} competencyId - ID competency to add
 * @param {String} userId - ID user yang melakukan update
 * @returns {Promise<Array>} Updated competencies array
 */
async addProjectCompetency(projectId, competencyId, userId) {
  try {
    const project = await this.model.findById(projectId);
    if (!project) {
      throw new Error('Project tidak ditemukan');
    }

    // Check permission (owner, member, admin, or dosen)
    const userIdString = userId.toString();
    const isOwner = project.owner && project.owner.toString() === userIdString;
    const isMember = project.members && project.members.some(m => m.toString() === userIdString);
    
    if (!isOwner && !isMember) {
      const user = await User.findById(userId);
      if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
        throw new Error('Tidak memiliki izin untuk menambah kompetensi project ini');
      }
    }

    // Check if competency exists
    const Competency = require('../models/competencyModel');
    const competency = await Competency.findOne({ _id: competencyId, isActive: true });
    if (!competency) {
      throw new Error('Kompetensi tidak ditemukan atau tidak aktif');
    }

    // Check if already added
    if (project.competencies.some(c => c.toString() === competencyId)) {
      throw new Error('Kompetensi sudah ditambahkan sebelumnya');
    }

    // Check limit
    if (project.competencies.length >= 20) {
      throw new Error('Maksimal 20 kompetensi yang dapat ditambahkan');
    }

    // Add competency
    project.competencies.push(competencyId);
    await project.save({ validateBeforeSave: false });

    // Return populated competencies
    const updatedProject = await this.model
      .findById(projectId)
      .populate('competencies', 'name category description')
      .select('competencies');

    return updatedProject.competencies;
  } catch (error) {
    throw new Error(`Gagal menambah kompetensi: ${error.message}`);
  }
}

/**
 * Remove competency from project by index
 * @param {String} projectId - ID project
 * @param {Number} index - Index of competency to remove
 * @param {String} userId - ID user yang melakukan update
 * @returns {Promise<Array>} Updated competencies array
 */
async removeProjectCompetency(projectId, index, userId) {
  try {
    const project = await this.model
      .findById(projectId)
      .populate('competencies', 'name category description');
      
    if (!project) {
      throw new Error('Project tidak ditemukan');
    }

    // Check permission
    const userIdString = userId.toString();
    const isOwner = project.owner && project.owner.toString() === userIdString;
    const isMember = project.members && project.members.some(m => m.toString() === userIdString);
    
    if (!isOwner && !isMember) {
      const user = await User.findById(userId);
      if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
        throw new Error('Tidak memiliki izin untuk menghapus kompetensi project ini');
      }
    }

    // Validate index
    const competencyIndex = parseInt(index);
    if (isNaN(competencyIndex) || competencyIndex < 0 || competencyIndex >= project.competencies.length) {
      throw new Error('Index kompetensi tidak valid');
    }

    // Remove competency
    project.competencies.splice(competencyIndex, 1);
    await project.save({ validateBeforeSave: false });

    // Return updated competencies
    const updatedProject = await this.model
      .findById(projectId)
      .populate('competencies', 'name category description')
      .select('competencies');

    return updatedProject.competencies;
  } catch (error) {
    throw new Error(`Gagal menghapus kompetensi: ${error.message}`);
  }
}

/**
 * Update competency at specific index
 * @param {String} projectId - ID project
 * @param {Number} index - Index of competency to update
 * @param {String} competencyId - New competency ID
 * @param {String} userId - ID user yang melakukan update
 * @returns {Promise<Array>} Updated competencies array
 */
async updateProjectCompetency(projectId, index, competencyId, userId) {
  try {
    const project = await this.model.findById(projectId);
    if (!project) {
      throw new Error('Project tidak ditemukan');
    }

    // Check permission
    const userIdString = userId.toString();
    const isOwner = project.owner && project.owner.toString() === userIdString;
    const isMember = project.members && project.members.some(m => m.toString() === userIdString);
    
    if (!isOwner && !isMember) {
      const user = await User.findById(userId);
      if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
        throw new Error('Tidak memiliki izin untuk mengupdate kompetensi project ini');
      }
    }

    // Validate competency exists
    const Competency = require('../models/competencyModel');
    const competency = await Competency.findOne({ _id: competencyId, isActive: true });
    if (!competency) {
      throw new Error('Kompetensi tidak ditemukan atau tidak aktif');
    }

    // Validate index
    const competencyIndex = parseInt(index);
    if (isNaN(competencyIndex) || competencyIndex < 0 || competencyIndex >= project.competencies.length) {
      throw new Error('Index kompetensi tidak valid');
    }

    // Check if new competency already exists (except at current index)
    const existingIndex = project.competencies.findIndex((comp, idx) => 
      idx !== competencyIndex && comp.toString() === competencyId
    );
    
    if (existingIndex !== -1) {
      throw new Error('Kompetensi sudah ada di project ini');
    }

    // Update competency
    project.competencies[competencyIndex] = competencyId;
    await project.save({ validateBeforeSave: false });

    // Return updated competencies
    const updatedProject = await this.model
      .findById(projectId)
      .populate('competencies', 'name category description')
      .select('competencies');

    return updatedProject.competencies;
  } catch (error) {
    throw new Error(`Gagal mengupdate kompetensi: ${error.message}`);
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
        temas = [],
        statuses = [],
        academicYears = [],
        tags = [],
        dateRange = {},
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 10
      } = searchParams;

      const query = {};

      // Keyword search
      if (keyword) {
        query.$or = [
          { title: { $regex: keyword, $options: 'i' } },
          { description: { $regex: keyword, $options: 'i' } },
          { tags: { $in: [new RegExp(keyword, 'i')] } }
        ];
      }

      // Temas filter
      if (temas.length > 0) {
        query.tema = { $in: temas };
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
        .populate('supervisor', 'name email')
        .populate('members', 'name email')
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