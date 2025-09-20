const ProjectService = require('../services/ProjectService');
const { getValidThemes, getThemeCategories } = require('../configs/themes');

/**
 * ProjectController Class
 * Mengelola HTTP requests untuk project-related endpoints
 * Menggunakan Object-Oriented Programming approach
 */
class ProjectController {
  constructor() {
    this.projectService = new ProjectService();
  }

  /**
   * Create new project
   * POST /api/projects
   */
  async createProject(req, res) {
    try {
      const projectData = req.body;
      // Get user ID from auth middleware (real auth system)
      const userId = req.user?._id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User tidak terautentikasi',
          data: null
        });
      }

      const newProject = await this.projectService.createProject(projectData, userId);

      res.status(201).json({
        success: true,
        message: 'Project berhasil dibuat',
        data: newProject
      });
    } catch (error) {
      console.error('Create Project Error:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  /**
   * Get all projects
   * GET /api/projects
   */
  async getAllProjects(req, res) {
    try {
      console.log('🚀 ProjectController.getAllProjects called');
      console.log('📦 Query params:', req.query);

      const filters = {
        tema: req.query.tema,              
        status: req.query.status,
        academicYear: req.query.academicYear,
        search: req.query.search,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10
      };
      const result = await this.projectService.getProjectsByFilter(filters);

      res.status(200).json({
        success: true,
        message: 'Data project berhasil diambil',
        data: result.projects,
        pagination: result.pagination,
        filters: {
          applied: filters,
          available_themes: getValidThemes()
        }
      });
    } catch (error) {
      console.error('Error getAllProjects:', error);
      res.status(500).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  /**
   * Get my projects (projects owned by the authenticated user)
   * GET /api/projects/my-projects
   */
  async getMyProjects(req, res) {
    try {
      console.log('🚀 ProjectController.getMyProjects called');
      console.log('🔐 User from auth middleware:', req.user);
      
      // Get user ID from auth middleware
      const userId = req.user?._id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User tidak terautentikasi',
          data: null
        });
      }

      console.log('🔍 Getting projects for user ID:', userId);

      // Query filters
      const filters = {
        owner: userId, // Filter by owner (user ID)
        tema: req.query.tema,
        status: req.query.status,
        academicYear: req.query.academicYear,
        search: req.query.search,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10
      };

      const result = await this.projectService.getProjectsByFilter(filters);

      console.log('📊 My projects result:', {
        totalProjects: result.projects.length,
        pagination: result.pagination
      });

      res.status(200).json({
        success: true,
        message: 'Project Anda berhasil diambil',
        data: result.projects,
        pagination: result.pagination,
        filters: {
          applied: filters,
          available_themes: getValidThemes()
        }
      });
    } catch (error) {
      console.error('❌ Error getMyProjects:', error);
      res.status(500).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  /**
   * Get projects by specific category/theme
   * GET /api/projects/category/:category
   */
  async getProjectsByCategory(req, res) {
    try {
      const { category } = req.params;
      const options = {
        status: req.query.status,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10
      };

      const result = await this.projectService.getProjectsByCategory(category, options);

      res.status(200).json({
        success: true,
        message: `Project dengan kategori ${category} berhasil diambil`,
        data: result.projects,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  /**
   * Get available projects (status: bisa_dilanjutkan)
   * GET /api/projects/available
   */
  async getAvailableProjects(req, res) {
    try {
      const filters = {
        category: req.query.category,
        academicYear: req.query.academicYear,
        search: req.query.search,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10
      };

      const result = await this.projectService.getAvailableProjects(filters);

      res.status(200).json({
        success: true,
        message: 'Project yang tersedia berhasil diambil',
        data: result.projects,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  /**
   * Get project by ID
   * GET /api/projects/:id
   */
  async getProjectById(req, res) {
    try {
      const { id } = req.params;
      const project = await this.projectService.getProjectById(id);

      res.status(200).json({
        success: true,
        message: 'Detail project berhasil diambil',
        data: project
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  /**
   * Update project
   * PUT /api/projects/:id
   */
  async updateProject(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      // Get user ID from auth middleware (real auth system)
      const userId = req.user?._id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User tidak terautentikasi',
          data: null
        });
      }

      console.log('🔄 Update project request:', {
        projectId: id,
        updateData,
        userId,
        hasReqUser: !!req.user
      });

      const updatedProject = await this.projectService.updateProject(id, updateData, userId);

      res.status(200).json({
        success: true,
        message: 'Project berhasil diupdate',
        data: updatedProject
      });
    } catch (error) {
      console.error('❌ Update project error:', error.message);
      res.status(400).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  /**
   * Update project status (specifically for marking as "bisa_dilanjutkan" or "ditutup")
   * PATCH /api/projects/:id/status
   */
  async updateProjectStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      // Get user ID from auth middleware (real auth system)
      const userId = req.user?._id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User tidak terautentikasi',
          data: null
        });
      }

      console.log('🔄 Update project status request:', {
        projectId: id,
        status,
        userId,
        hasReqUser: !!req.user
      });

      const updatedProject = await this.projectService.updateProjectStatus(id, status, userId);

      res.status(200).json({
        success: true,
        message: `Status project berhasil diubah menjadi ${status}`,
        data: updatedProject
      });
    } catch (error) {
      console.error('❌ Update project status error:', error.message);
      res.status(400).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  /**
   * Delete project (soft delete)
   * DELETE /api/projects/:id
   */
  async deleteProject(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      await this.projectService.deleteProject(id, userId);

      res.status(200).json({
        success: true,
        message: 'Project berhasil dihapus',
        data: null
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  /**
   * Get projects by current user (as owner)
   * GET /api/projects/my-projects
   */
  async getMyProjects(req, res) {
    try {
      const userId = req.user.id;
      const filters = {
        status: req.query.status,
        category: req.query.category
      };

      const projects = await this.projectService.getProjectsByOwner(userId, filters);

      res.status(200).json({
        success: true,
        message: 'Project Anda berhasil diambil',
        data: projects
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  /**
   * Get project statistics
   * GET /api/projects/statistics
   */
  async getProjectStatistics(req, res) {
    try {
      const statistics = await this.projectService.getProjectStatistics();

      res.status(200).json({
        success: true,
        message: 'Statistik project berhasil diambil',
        data: statistics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  /**
   * Advanced search projects
   * POST /api/projects/search
   */
  async advancedSearch(req, res) {
    try {
      const searchParams = req.body;
      const result = await this.projectService.advancedSearch(searchParams);

      res.status(200).json({
        success: true,
        message: 'Pencarian project berhasil',
        data: result.projects,
        pagination: result.pagination,
        searchParams: result.searchParams
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  /**
   * Get all categories
   * GET /api/projects/categories
   */
  async getCategories(req, res) {
    try {
      const categories = getThemeCategories();

      res.status(200).json({
        success: true,
        message: 'Kategori project berhasil diambil',
        data: categories
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  /**
   * Get Capstone 1 projects
   * GET /api/projects/capstone1
   */
  async getCapstone1Projects(req, res) {
    try {
      const filters = {
        category: req.query.category,
        status: req.query.status,
        academicYear: req.query.academicYear,
        search: req.query.search,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10
      };

      const result = await this.projectService.getCapstone1Projects(filters);

      res.status(200).json({
        success: true,
        message: 'Project Capstone 1 berhasil diambil',
        data: result.projects,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  /**
   * Get Capstone 2 projects  
   * GET /api/projects/capstone2
   */
  async getCapstone2Projects(req, res) {
    try {
      const filters = {
        category: req.query.category,
        status: req.query.status,
        academicYear: req.query.academicYear,
        search: req.query.search,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10
      };

      const result = await this.projectService.getCapstone2Projects(filters);

      res.status(200).json({
        success: true,
        message: 'Project Capstone 2 berhasil diambil',
        data: result.projects,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  /**
   * Get projects by capstone type
   * GET /api/projects/capstone/:capstoneType
   */
  async getProjectsByCapstoneType(req, res) {
    try {
      const { capstoneType } = req.params;
      const filters = {
        category: req.query.category,
        status: req.query.status,
        academicYear: req.query.academicYear,
        search: req.query.search,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10
      };

      const result = await this.projectService.getProjectsByCapstoneType(capstoneType, filters);

      res.status(200).json({
        success: true,
        message: `Project ${capstoneType} berhasil diambil`,
        data: result.projects,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }



  /**
   * Get projects by tema
   * GET /api/projects/tema/:tema
   */
  async getProjectsByTema(req, res) {
    try {
      const { tema } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const result = await this.projectService.getProjectsByTema(tema, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.status(200).json({
        success: true,
        message: `Projects with tema '${tema}' retrieved successfully`,
        data: result.projects,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Failed to get projects by tema',
        error: error.message
      });
    }
  }

  /**
   * Get project documents with filtering
   * GET /api/projects/:id/documents
   */
  async getProjectDocuments(req, res) {
    try {
      const { id } = req.params;
      const { capstoneCategory, documentType, page = 1, limit = 10 } = req.query;

      const filters = {
        project: id  // Filter by project ID
      };
      if (capstoneCategory) filters.capstoneCategory = capstoneCategory;
      if (documentType) filters.documentType = documentType;

      // Use DocumentService since this is document-related operation
      const DocumentService = require('../services/DocumentService');
      const documentService = new DocumentService();
      
      const result = await documentService.getDocumentsByFilters(filters, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.status(200).json({
        success: true,
        message: 'Project documents retrieved successfully',
        data: result.documents,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Failed to get project documents',
        error: error.message
      });
    }
  }

  /**
   * Bind methods to preserve 'this' context
   */
  bind() {
    this.createProject = this.createProject.bind(this);
    this.getAllProjects = this.getAllProjects.bind(this);
    this.getProjectsByCategory = this.getProjectsByCategory.bind(this);
    this.getAvailableProjects = this.getAvailableProjects.bind(this);
    this.getProjectById = this.getProjectById.bind(this);
    this.updateProject = this.updateProject.bind(this);
    this.updateProjectStatus = this.updateProjectStatus.bind(this);
    this.deleteProject = this.deleteProject.bind(this);
    this.getMyProjects = this.getMyProjects.bind(this);
    this.getProjectStatistics = this.getProjectStatistics.bind(this);
    this.advancedSearch = this.advancedSearch.bind(this);
    this.getCategories = this.getCategories.bind(this);
    this.getCapstone1Projects = this.getCapstone1Projects.bind(this);
    this.getCapstone2Projects = this.getCapstone2Projects.bind(this);
    this.getProjectsByCapstoneType = this.getProjectsByCapstoneType.bind(this);
    
    // theme based
    this.getAvailableTemas = this.getAvailableTemas.bind(this);
    this.getProjectsByTema = this.getProjectsByTema.bind(this);
    this.getProjectDocuments = this.getProjectDocuments.bind(this);
    
    return this;
  }

  /**
   * Get available themes
   * GET /api/projects/temas
   */
  async getAvailableTemas(req, res) {
    try {
      const themes = getValidThemes();

      res.status(200).json({
        success: true,
        message: 'Tema tersedia berhasil diambil',
        data: {
          themes: themes,
          total: themes.length
        }
      });
    } catch (error) {
      console.error('Get Themes Error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil tema tersedia',
        data: null
      });
    }
  }

  /**
   * Get my projects - projects owned by authenticated user
   * GET /api/projects/my-projects
   */
  async getMyProjects(req, res) {
    try {
      console.log('🔍 getMyProjects called');
      console.log('🔍 User from auth:', req.user);
      
      const userId = req.user.id;
      console.log('🔍 Filtering projects by userId:', userId);
      
      const result = await this.projectService.getProjectsByFilter({
        owner: userId,
        page: 1,
        limit: 100
      });

      console.log('🔍 Projects found for user:', result.projects.length);
      
      res.status(200).json({
        success: true,
        message: 'Project Anda berhasil diambil',
        data: result.projects
      });
    } catch (error) {
      console.error('Get My Projects Error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil project Anda',
        data: null
      });
    }
  }
}

module.exports = ProjectController;