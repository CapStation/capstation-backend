# CapStation API Documentation
GPT HEHE WKWKWKKW

## Project Overview

CapStation adalah sistem manajemen dokumen capstone untuk Universitas Gadjah Mada yang memungkinkan mahasiswa dan dosen untuk mengelola proyek capstone (skripsi/tugas akhir) dengan sistem autentikasi berbasis role dan manajemen dokumen yang terintegrasi.

## Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: MongoDB dengan Mongoose ODM
- **Authentication**: JWT (JSON Web Token)
- **File Storage**: Base64 encoding dalam MongoDB
- **Timezone**: Asia/Jakarta (WIB)
- **Development**: Nodemon untuk hot reload

## Project Structure

```
backend/
├── src/
│   ├── controllers/        # Controller layer untuk handle HTTP requests
│   │   ├── authController.js
│   │   ├── documentController.js
│   │   └── projectController.js
│   ├── models/            # Database schema models
│   │   ├── Document.js
│   │   ├── Project.js
│   │   └── User.js
│   ├── services/          # Business logic layer
│   │   ├── AuthService.js
│   │   ├── DocumentService.js
│   │   └── ProjectService.js
│   ├── middlewares/       # Custom middleware functions
│   │   ├── authMiddleware.js
│   │   ├── fileValidation.js
│   │   └── upload.js
│   ├── routes/           # API route definitions
│   │   ├── auth.js
│   │   ├── documents.js
│   │   └── projects.js
│   ├── configs/          # Configuration files
│   │   └── themes.js
│   ├── utils/            # Utility functions
│   │   └── responseFormatter.js
│   ├── app.js           # Express app configuration
│   └── server.js        # Server entry point
├── .TESTING FILE/       # Test files for file upload validation
├── .env                 # Environment variables
├── package.json
└── README.md
```

## Environment Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB instance
- Git

### Installation
```bash
# Clone repository
git clone <repository-url>
cd backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

### Environment Variables
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/capstation
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=24h
NODE_ENV=development
```

## Core Features

### 1. Authentication System
- **Multi-role authentication**: Admin, Dosen, Mahasiswa
- **JWT-based sessions** dengan token expiry
- **Protected routes** dengan middleware authentication
- **Password hashing** menggunakan bcrypt

### 2. Project Management
- **CRUD operations** untuk proyek capstone
- **Tema classification**: Kesehatan, Smart City, Teknologi, Edukasi, Bisnis
- **Status tracking**: Active, Completed, Cancelled
- **Academic year grouping**: Gasal-2025, Genap-2026, Gasal-2026, dst
- **User ownership**: Projects belong to specific users

### 3. Document Management
- **File upload** dengan base64 encoding
- **Public access**: Default semua dokumen public agar mahasiswa bisa saling melihat
- **Capstone categories**: Capstone1, Capstone2, General
- **Document types**:
  - Capstone1: proposal, laporan, ppt
  - Capstone2: poster, video_demo, laporan_akhir, gambar_alat
- **File validation**: Type, size, dan category compatibility
- **Metadata tracking**: fileName, fileSize, mimeType, uploadDate
- **Visibility control**: isPublic field (default: true) untuk admin control

### 4. Advanced Filtering & Search
- **Project filtering**: By tema, status, academic year, owner
- **Document filtering**: By tema project, capstone category, document type
- **Pagination support**: Configurable page size dan navigation
- **Search functionality**: Full-text search pada title dan description

### 5. Jakarta Timezone Support
- **Consistent timezone**: Semua timestamps menggunakan Asia/Jakarta (WIB)
- **Server configuration**: process.env.TZ set ke Asia/Jakarta
- **Database timestamps**: Custom currentTime function untuk consistency

## API Endpoints

### Authentication Endpoints
```
POST /api/auth/login          # User login
POST /api/auth/register       # User registration (if enabled)
GET  /api/auth/profile        # Get current user profile
POST /api/auth/logout         # User logout
```

### Project Endpoints
```
GET    /api/projects                    # Get all projects with filtering
POST   /api/projects                    # Create new project (auth required)
GET    /api/projects/my-projects        # Get current user's projects (auth required)
GET    /api/projects/:id                # Get project by ID
PUT    /api/projects/:id                # Update project (auth required)
DELETE /api/projects/:id                # Delete project (auth required)
GET    /api/projects/:id/documents      # Get project documents
GET    /api/projects/tema/:tema         # Filter projects by tema
GET    /api/projects/status/:status     # Filter projects by status
GET    /api/projects?academicYear=...   # Filter projects by academic year (query param)
```

### Document Endpoints
```
GET    /api/documents                           # Get all documents with filtering
POST   /api/documents                           # Upload new document (auth required)
GET    /api/documents/:id                       # Get document by ID
PUT    /api/documents/:id                       # Update document (auth required)
DELETE /api/documents/:id                       # Delete document (auth required)
GET    /api/documents/:id/download              # Download document file
GET    /api/documents/categories                # Get document categories info
GET    /api/documents/tema/:tema                # Filter documents by project tema
GET    /api/documents/category/:capstoneCategory # Filter documents by capstone category
GET    /api/documents/project/:projectId        # Get documents by project
```

### Health Check
```
GET /api/health                         # Server health check with timezone info
```

## Data Models

CapStation menggunakan MongoDB dengan 3 model utama yang saling berhubungan:

1. **User** - Mengelola autentikasi dan profil pengguna (dengan groupName untuk referensi grup sederhana)
2. **Project** - Menyimpan data project capstone (dengan groupName sebagai string, bukan referensi kompleks)
3. **Document** - Mengelola file dokumen project

### Simplified Group Concept
- Setiap user memiliki 1 grup (1-user-1-group relationship)
- Group ID diset sama dengan owner ID untuk menjaga kesederhanaan
- Tidak ada model Group terpisah untuk menjaga kesederhanaan sesuai scope project
- Group secara otomatis diset saat user membuat project (group = owner)

### User Model
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed),
  role: String (admin|dosen|mahasiswa),
  createdAt: Date,
  updatedAt: Date
}
```

### Project Model
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  tema: String (kesehatan|smartcity|teknologi|edukasi|bisnis),
  status: String (active|completed|cancelled),
  academicYear: String, // Format: "Gasal-2025" atau "Genap-2026"
  tags: [String],
  owner: ObjectId (ref: User),
  group: ObjectId (ref: User), // Grup ID sama dengan owner ID untuk simplicity
  createdAt: Date,
  updatedAt: Date
}
```

### Document Model
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  project: ObjectId (ref: Project),
  documentType: String,
  capstoneCategory: String (capstone1|capstone2|general),
  fileName: String,
  fileSize: Number,
  mimeType: String,
  fileData: String (base64),
  isPublic: Boolean, // Default: true - semua mahasiswa bisa melihat
  downloadCount: Number,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## Key Features Implementation

### 1. Jakarta Timezone Configuration
```javascript
// app.js - Set timezone before any operations
process.env.TZ = 'Asia/Jakarta';

// models/Project.js - Custom timestamp function
const currentTime = () => {
  return new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Jakarta"}));
};
```

### 2. Authentication Middleware
```javascript
// middlewares/authMiddleware.js
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied' });
  }
  // JWT verification and user attachment
};
```

### 3. File Upload with Validation
```javascript
// middlewares/fileValidation.js
const validateFileUpload = (req, res, next) => {
  // Validate file type, size, and category compatibility
  // Support for PDF, images, videos based on document type
};
```

### 4. Response Formatting
```javascript
// utils/responseFormatter.js
const formatDocumentsForResponse = (documents) => {
  // Remove or truncate fileData for performance
  // Standardize response structure
};
```

### 5. Advanced Filtering
```javascript
// services/DocumentService.js
async getDocumentsByTema(filters, options) {
  // MongoDB aggregation pipeline to join with Project collection
  // Filter by tema, documentType, capstoneCategory
  // Pagination and sorting support
}
```

## File Validation Rules

### Supported File Types by Document Type

#### Capstone 1 Documents
- **proposal**: PDF files only (max 50MB)
- **laporan**: PDF files only (max 50MB)
- **ppt**: PowerPoint files (.ppt, .pptx) dan PDF (max 100MB)

#### Capstone 2 Documents
- **poster**: Image files (.jpg, .jpeg, .png, .pdf) (max 25MB)
- **video_demo**: Video files (.mp4, .avi, .mov) (max 500MB)
- **laporan_akhir**: PDF files only (max 50MB)
- **gambar_alat**: Image files (.jpg, .jpeg, .png) (max 25MB)

#### General Documents
- **All types**: PDF, DOC, DOCX, images (max 100MB)

### File Size Limits
```javascript
const FILE_SIZE_LIMITS = {
  'proposal': 50 * 1024 * 1024,      // 50MB
  'laporan': 50 * 1024 * 1024,       // 50MB
  'ppt': 100 * 1024 * 1024,          // 100MB
  'poster': 25 * 1024 * 1024,        // 25MB
  'video_demo': 500 * 1024 * 1024,   // 500MB
  'laporan_akhir': 50 * 1024 * 1024, // 50MB
  'gambar_alat': 25 * 1024 * 1024,   // 25MB
  'default': 100 * 1024 * 1024       // 100MB
};
```

## Testing

### Manual Testing Setup
1. **File Upload Tests**: Use files in `.TESTING FILE/` directory
2. **Authentication Tests**: Login dengan different roles
3. **Filtering Tests**: Test all filter combinations
4. **Timezone Tests**: Verify Jakarta time in responses

### Test Scenarios
- **Valid file uploads**: PDF, images, videos
- **Invalid file uploads**: Wrong type, oversized files
- **Authentication**: Valid/invalid tokens, role permissions
- **Filtering**: Single and combined filters
- **Pagination**: Different page sizes and navigation
- **Error handling**: 400, 401, 404, 500 status codes

## Deployment Considerations

### Production Setup
1. **Environment**: Set NODE_ENV=production
2. **Database**: Use MongoDB Atlas or dedicated server
3. **Security**: 
   - Strong JWT secret
   - CORS configuration
   - Rate limiting
   - Input sanitization
4. **File Storage**: Consider GridFS for large files
5. **Monitoring**: Implement logging and health checks

### Performance Optimizations
1. **Database Indexing**: Create indexes on frequently queried fields
2. **File Handling**: Implement file size limits and compression
3. **Pagination**: Limit response sizes
4. **Caching**: Implement Redis for frequent queries
5. **Response Formatting**: Remove unnecessary data from responses

## API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  },
  "pagination": {  // Optional for paginated responses
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message", // Optional
  "statusCode": 400  // Optional
}
```

## Postman Collection

### Collection Structure
1. **Authentication**: Login endpoints for all roles
2. **Health Check**: Server status and timezone verification
3. **Project CRUD**: Complete project management
4. **Project Filtering**: Advanced filtering by tema, status, year
5. **Document CRUD**: File upload and management
6. **Document Filtering**: Filter by tema, category, type
7. **File Validation**: Test file type and size validation
8. **Error Handling**: Test error scenarios
9. **Advanced Filtering**: Complex queries with pagination
10. **Complete Workflow**: End-to-end testing scenarios

### Key Test Scenarios
- **File Type Validation**: Upload different file types
- **File Size Validation**: Test size limits per document type
- **Category Validation**: Test capstone category rules
- **Authentication Flow**: Multi-role token management
- **Timezone Validation**: Ensure Jakarta time consistency

## Future Enhancements

### Short Term
1. **Email notifications** untuk document uploads
2. **File versioning** untuk document updates
3. **Bulk operations** untuk multiple documents
4. **Advanced search** dengan Elasticsearch
5. **File compression** untuk storage optimization

### Long Term
1. **Real-time notifications** dengan WebSocket
2. **Collaborative editing** untuk documents
3. **Analytics dashboard** untuk admin
4. **Mobile app** dengan React Native
5. **Integration** dengan external services

## Troubleshooting

### Common Issues

#### 1. MongoDB Connection Issues
```bash
# Check MongoDB service
sudo systemctl status mongod

# Restart MongoDB
sudo systemctl restart mongod
```

#### 2. JWT Token Issues
- Verify JWT_SECRET in .env
- Check token expiration time
- Ensure proper Authorization header format

#### 3. File Upload Issues
- Check file size limits (varies by document type)
- Verify supported file types
- Ensure proper multipart/form-data encoding

#### 4. Timezone Issues
- Verify process.env.TZ setting
- Check system timezone configuration
- Ensure consistent timezone across all timestamps

### Debug Commands
```bash
# Check environment variables
printenv | grep NODE

# Monitor logs
npm run dev | grep ERROR

# Test specific endpoints
curl -X GET http://localhost:5000/api/health
```

## Contributing

### Code Style
- Use ES6+ features
- Follow consistent naming conventions
- Add comments for complex logic
- Use async/await for promises

### Git Workflow
1. Create feature branch from main
2. Make changes with descriptive commits
3. Test thoroughly before push
4. Create pull request with description

### Testing Guidelines
- Test all new endpoints
- Verify error handling
- Check authentication flow
- Validate data formats

## Recent Updates

### File Validation Enhancement
- **Dynamic file size limits** berdasarkan document type
- **MIME type validation** untuk setiap category
- **Category compatibility check** antara capstone category dan document type
- **Comprehensive error messages** untuk validation failures

### Response Formatting
- **Optimized document responses** dengan fileData truncation
- **Consistent pagination format** across all endpoints
- **Standardized error responses** dengan proper status codes

### Authentication Improvements
- **Multi-role support** dengan proper middleware
- **Token management** dengan expiry handling
- **Protected route patterns** untuk secure endpoints

## Architecture Changes

### Simplified Model Structure (v2.0)
Berdasarkan scope project yang lebih fokus, beberapa model complex telah dihapus:

#### Removed Models:
- **ContinuationRequest.js**: Model untuk workflow continuation project antar generasi mahasiswa (tidak sesuai scope)
- **Group.js**: Model kompleks untuk manajemen grup dengan multiple members dan advisors (disederhanakan)

#### Simplified Approach:
- **Group concept**: Group ID diset sama dengan owner ID (group = owner)
- **1-User-1-Group**: Setiap user hanya memiliki 1 grup untuk menjaga kesederhanaan
- **Auto group assignment**: Group otomatis diset saat user membuat project
- **Simple ObjectId reference**: Group menggunakan ObjectId reference ke User, bukan string

#### Benefits:
- Code lebih sederhana dan mudah maintain
- Mengurangi complexity yang tidak diperlukan
- Lebih sesuai dengan actual project scope
- Consistent dengan referensi owner (sama-sama ObjectId)

