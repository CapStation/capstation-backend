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
      const userId = req.user?._id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User tidak terautentikasi',
          data: null
        });
      }

      // Validate required fields for new workflow
      if (!projectData.group) {
        return res.status(400).json({
          success: false,
          message: 'Group ID harus dipilih untuk membuat project',
          data: null
        });
      }

      // Check if user owns the group
      const Group = require('../models/groupModel');
      const group = await Group.findById(projectData.group);
      
      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Group tidak ditemukan',
          data: null
        });
      }

      if (!group.isOwner(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Hanya owner group yang bisa membuat project',
          data: null
        });
      }

      // Auto-copy members from group
      projectData.members = group.members;

      const newProject = await this.projectService.createProject(projectData, userId);

      res.status(201).json({
        success: true,
        message: 'Project berhasil dibuat dengan data group otomatis',
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
   * Get my projects (projects where user is owner OR member)
   * GET /api/projects/my-projects
   */
  async getMyProjects(req, res) {
    try {
      console.log('🚀 ProjectController.getMyProjects called');
      console.log('🔐 User from auth middleware:', req.user);
      
      // Get user ID from auth middleware
      const userId = req.user?._id || req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User tidak terautentikasi',
          data: null
        });
      }

      console.log('🔍 Getting projects for user ID (owner OR member):', userId);

      // Query untuk mencari project dimana user adalah owner ATAU member
      const projects = await this.projectService.model
        .find({
          $or: [
            { owner: userId },      // User adalah owner
            { members: userId }     // User adalah member
          ]
        })
        .populate('owner', 'fullName name username email')
        .populate('supervisor', 'fullName name username email')
        .populate('group')
        .populate('members', 'fullName name username email')
        .populate('competencies', 'name category description') 
        .limit(100)
        .sort({ updatedAt: -1 });

      console.log('📊 Projects found for user (owner OR member):', projects.length);

      res.status(200).json({
        success: true,
        message: 'Project Anda berhasil diambil',
        data: projects
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
   * Update project group (manual assignment)
   * PATCH /api/projects/:id/group
   */
  async updateProjectGroup(req, res) {
    try {
      const { id } = req.params;
      const { groupId } = req.body;
      const userId = req.user?._id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User tidak terautentikasi',
          data: null
        });
      }

      if (!groupId) {
        return res.status(400).json({
          success: false,
          message: 'Group ID harus diisi',
          data: null
        });
      }

      console.log('🔄 Update project group request:', {
        projectId: id,
        groupId,
        userId
      });

      const updatedProject = await this.projectService.updateProjectGroup(id, groupId, userId);

      res.status(200).json({
        success: true,
        message: 'Group project berhasil diupdate dan members disinkronisasi',
        data: updatedProject
      });
    } catch (error) {
      console.error('❌ Update project group error:', error.message);
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
    
    // export
    this.exportProjects = this.exportProjects.bind(this);
    
    // group update
    this.updateProjectGroup = this.updateProjectGroup.bind(this);
    
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
   * Export projects to CSV
   * GET /api/projects/export
   */
  async exportProjects(req, res) {
    try {
      // Get all projects using the service method
      const result = await this.projectService.getProjectsByFilter({
        page: 1,
        limit: 999999 // Get all projects
      });

      const projects = result.projects || [];

      // Format data for CSV
      const csvData = projects.map(project => ({
        'Judul': project.title || '',
        'Tema': project.tema || '',
        'Status': project.status || '',
        'Tahun Akademik': project.academicYear || '',
        'Keywords': project.keywords || '',
        'Kategori': project.category || '',
        'Deskripsi': project.description ? project.description.replace(/\n/g, ' ').substring(0, 200) : '',
        'Jumlah Anggota': project.members?.length || 0,
        'Nama Anggota': project.members?.map(m => m.name || m.username).join('; ') || '',
        'Dibuat Oleh': project.createdBy?.name || project.createdBy?.username || project.owner?.name || project.owner?.username || '',
        'Tanggal Dibuat': project.createdAt ? new Date(project.createdAt).toLocaleDateString('id-ID') : '',
        'Terakhir Diperbarui': project.updatedAt ? new Date(project.updatedAt).toLocaleDateString('id-ID') : ''
      }));

      // Convert to CSV format
      if (csvData.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Tidak ada proyek untuk diekspor',
          data: null
        });
      }

      const headers = Object.keys(csvData[0]);
      const csvRows = [
        headers.join(','),
        ...csvData.map(row => 
          headers.map(header => {
            const value = row[header] || '';
            // Escape quotes and wrap in quotes if contains comma or quotes
            const escaped = String(value).replace(/"/g, '""');
            return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n') || escaped.includes(';')
              ? `"${escaped}"` 
              : escaped;
          }).join(',')
        )
      ];

      const csv = csvRows.join('\n');

      // Set headers for file download
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=proyek_capstation_${new Date().toISOString().split('T')[0]}.csv`);
      
      // Add BOM for Excel UTF-8 compatibility
      res.write('\uFEFF');
      res.end(csv);

    } catch (error) {
      console.error('Export Projects Error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengekspor proyek',
        error: error.message,
        data: null
      });
    }
  }
}

module.exports = ProjectController;