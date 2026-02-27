/**
 * AS4 to AS6 Conversion Tool
 * Main application logic for analyzing and converting B&R Automation Studio projects
 */

// Debug version - UPDATE THIS AFTER EVERY CHANGE
const DEBUG_VERSION = "1.1.9";
const DEBUG_MESSAGE = "Fixed DTM file filtering & path handling";

// Check if debug mode is enabled via query parameter
const IS_DEBUG_MODE = new URLSearchParams(window.location.search).get('debug') === 'true';

class AS4Converter {
    constructor() {
        this.projectFiles = new Map(); // filename -> { content, type, path }
        this.analysisResults = []; // Array of Finding objects
        this.selectedFindings = new Set(); // IDs of selected items
        this.appliedConversions = new Map(); // finding ID -> { original, converted }
        this.undoStack = [];
        this.isEdgeBrowser = this.detectEdge();
        this.projectASVersion = null; // Detected AS version from .apj file
        this.isAS6Project = false; // Flag if AS6 project is detected
        
        this.initializeUI();
        if (IS_DEBUG_MODE) {
            this.displayDebugVersion();
        }
        this.bindEvents();
        this.checkBrowserCompatibility();
    }
    
    displayDebugVersion() {
        const versionEl = document.getElementById('debugVersion');
        if (versionEl) {
            versionEl.textContent = `🐛 DEBUG v${DEBUG_VERSION} - ${DEBUG_MESSAGE}`;
            versionEl.style.cssText = 'font-size: 11px; color: #ff6b6b; margin-top: 4px; font-weight: bold; display: block;';
        }
        console.log(`🐛 AS4 to AS6 Converter DEBUG MODE v${DEBUG_VERSION} - ${DEBUG_MESSAGE}`);
    }
    
    detectEdge() {
        const ua = navigator.userAgent;
        return ua.includes('Edg/') || ua.includes('Edge/');
    }
    
    checkBrowserCompatibility() {
        if (this.isEdgeBrowser) {
            this.showBrowserWarning();
        }
    }
    
    showBrowserWarning() {
        const warning = document.createElement('div');
        warning.className = 'browser-warning';
        warning.innerHTML = `
            <div class="warning-content">
                <span class="warning-icon">⚠️</span>
                <span class="warning-text">
                    <strong>Microsoft Edge detected.</strong> 
                    For best results, we recommend using <strong>Google Chrome</strong>. 
                    Edge may have issues with large folder uploads.
                </span>
                <button class="warning-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        document.body.insertBefore(warning, document.body.firstChild);
        
        // Add warning styles dynamically
        if (!document.getElementById('browser-warning-styles')) {
            const style = document.createElement('style');
            style.id = 'browser-warning-styles';
            style.textContent = `
                .browser-warning {
                    background: #fff3cd;
                    border-bottom: 2px solid #ffc107;
                    padding: 12px 20px;
                }
                .warning-content {
                    max-width: 1400px;
                    margin: 0 auto;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .warning-icon { font-size: 1.5rem; }
                .warning-text { flex: 1; }
                .warning-close {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: #856404;
                    padding: 0 8px;
                }
                .warning-close:hover { color: #533f03; }
            `;
            document.head.appendChild(style);
        }
    }

    // ==========================================
    // UI INITIALIZATION
    // ==========================================

    initializeUI() {
        this.elements = {
            // Tab navigation
            tabButtons: document.querySelectorAll('.tab-btn'),
            tabContents: document.querySelectorAll('.tab-content'),
            
            // Project selection
            dropZone: document.getElementById('dropZone'),
            fileInput: document.getElementById('fileInput'),
            folderInput: document.getElementById('folderInput'),
            zipInput: document.getElementById('zipInput'),
            projectInfo: document.getElementById('projectInfo'),
            fileTree: document.getElementById('fileTree'),
            btnScan: document.getElementById('btnScan'),
            btnClear: document.getElementById('btnClear'),
            
            // Stats
            totalFiles: document.getElementById('totalFiles'),
            stFiles: document.getElementById('stFiles'),
            pkgFiles: document.getElementById('pkgFiles'),
            lbyFiles: document.getElementById('lbyFiles'),
            tmxFiles: document.getElementById('tmxFiles'),
            motionFiles: document.getElementById('motionFiles'),
            visFiles: document.getElementById('visFiles'),
            hwFiles: document.getElementById('hwFiles'),
            
            // Analysis
            analysisEmpty: document.getElementById('analysisEmpty'),
            analysisResults: document.getElementById('analysisResults'),
            findingsList: document.getElementById('findingsList'),
            errorCount: document.getElementById('errorCount'),
            warningCount: document.getElementById('warningCount'),
            infoCount: document.getElementById('infoCount'),
            compatibleCount: document.getElementById('compatibleCount'),
            searchFilter: document.getElementById('searchFilter'),
            severityFilter: document.getElementById('severityFilter'),
            typeFilter: document.getElementById('typeFilter'),
            btnSelectAll: document.getElementById('btnSelectAll'),
            btnDeselectAll: document.getElementById('btnDeselectAll'),
            selectedCount: document.getElementById('selectedCount'),
            btnPreview: document.getElementById('btnPreview'),
            
            // Preview
            previewEmpty: document.getElementById('previewEmpty'),
            previewContent: document.getElementById('previewContent'),
            previewList: document.getElementById('previewList'),
            previewItemCount: document.getElementById('previewItemCount'),
            previewFileCount: document.getElementById('previewFileCount'),
            btnExpandAll: document.getElementById('btnExpandAll'),
            btnCollapseAll: document.getElementById('btnCollapseAll'),
            btnApplyAll: document.getElementById('btnApplyAll'),
            btnUndoAll: document.getElementById('btnUndoAll'),
            
            // Report
            reportEmpty: document.getElementById('reportEmpty'),
            reportContent: document.getElementById('reportContent'),
            reportDate: document.getElementById('reportDate'),
            reportSummary: document.getElementById('reportSummary'),
            reportFindings: document.getElementById('reportFindings'),
            reportChanges: document.getElementById('reportChanges'),
            reportRecommendations: document.getElementById('reportRecommendations'),
            btnExportHTML: document.getElementById('btnExportHTML'),
            btnExportJSON: document.getElementById('btnExportJSON'),
            btnExportCSV: document.getElementById('btnExportCSV'),
            btnDownloadProject: document.getElementById('btnDownloadProject')
        };
    }

    bindEvents() {
        // Tab navigation
        this.elements.tabButtons.forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        // File upload
        this.elements.dropZone.addEventListener('click', () => {
            this.elements.folderInput.click();
        });
        
        this.elements.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.elements.dropZone.classList.add('dragover');
        });
        
        this.elements.dropZone.addEventListener('dragleave', () => {
            this.elements.dropZone.classList.remove('dragover');
        });
        
        this.elements.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.elements.dropZone.classList.remove('dragover');
            this.handleFileDrop(e.dataTransfer);
        });

        this.elements.folderInput.addEventListener('change', (e) => {
            this.handleFolderSelect(e.target.files);
        });

        this.elements.zipInput.addEventListener('change', (e) => {
            this.handleZipUpload(e.target.files[0]);
        });

        // Action buttons
        this.elements.btnScan.addEventListener('click', () => this.runAnalysis());
        this.elements.btnClear.addEventListener('click', () => this.clearProject());
        
        // Filter events
        this.elements.searchFilter.addEventListener('input', () => this.filterFindings());
        this.elements.severityFilter.addEventListener('change', () => this.filterFindings());
        this.elements.typeFilter.addEventListener('change', () => this.filterFindings());
        
        // Selection buttons
        this.elements.btnSelectAll.addEventListener('click', () => this.selectAllFindings(true));
        this.elements.btnDeselectAll.addEventListener('click', () => this.selectAllFindings(false));
        this.elements.btnPreview.addEventListener('click', () => this.showPreview());
        
        // Preview controls
        this.elements.btnExpandAll.addEventListener('click', () => this.toggleAllPreviews(true));
        this.elements.btnCollapseAll.addEventListener('click', () => this.toggleAllPreviews(false));
        this.elements.btnApplyAll.addEventListener('click', () => this.applyAllConversions());
        this.elements.btnUndoAll.addEventListener('click', () => this.undoAllConversions());
        
        // Export buttons
        this.elements.btnExportHTML.addEventListener('click', () => this.exportReport('html'));
        this.elements.btnExportJSON.addEventListener('click', () => this.exportReport('json'));
        this.elements.btnExportCSV.addEventListener('click', () => this.exportReport('csv'));
        this.elements.btnDownloadProject.addEventListener('click', () => this.downloadConvertedProject());
    }

    // ==========================================
    // TAB NAVIGATION
    // ==========================================

    switchTab(tabId) {
        // Update buttons
        this.elements.tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        
        // Update content
        this.elements.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabId}`);
        });
    }

    // ==========================================
    // FILE HANDLING
    // ==========================================

    async handleFileDrop(dataTransfer) {
        const items = dataTransfer.items;
        const files = [];
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i].webkitGetAsEntry();
            if (item) {
                await this.traverseFileTree(item, files);
            }
        }
        
        this.processFiles(files);
    }

    async traverseFileTree(item, files, path = '') {
        return new Promise((resolve) => {
            if (item.isFile) {
                item.file(file => {
                    file.relativePath = path + file.name;
                    files.push(file);
                    resolve();
                });
            } else if (item.isDirectory) {
                const dirReader = item.createReader();
                const allEntries = [];
                
                // readEntries may not return all entries in one call - must call repeatedly
                const readAllEntries = () => {
                    dirReader.readEntries(async entries => {
                        if (entries.length > 0) {
                            allEntries.push(...entries);
                            // Continue reading - there may be more entries
                            readAllEntries();
                        } else {
                            // No more entries - process all collected entries
                            for (const entry of allEntries) {
                                await this.traverseFileTree(entry, files, path + item.name + '/');
                            }
                            resolve();
                        }
                    });
                };
                
                readAllEntries();
            }
        });
    }

    handleFolderSelect(files) {
        try {
            const fileArray = Array.from(files);
            
            // Debug: Log all incoming files
            console.log(`Total files received from browser: ${fileArray.length}`);
            const binaryFiles = fileArray.filter(f => {
                const ext = this.getFileExtension(f.name);
                return ['.a', '.br', '.o'].includes(ext);
            });
            console.log(`Binary files (.a, .br, .o) received: ${binaryFiles.length}`);
            binaryFiles.forEach(f => console.log(`  - ${f.webkitRelativePath || f.name}`));
            
            // Edge browser workaround: process files in smaller batches
            if (this.isEdgeBrowser && fileArray.length > 50) {
                this.processFilesInBatches(fileArray);
            } else {
                this.processFiles(fileArray);
            }
        } catch (error) {
            console.error('Error handling folder select:', error);
            alert('Error loading files. If using Microsoft Edge, please try Google Chrome instead.');
        }
    }
    
    async processFilesInBatches(files, batchSize = 20) {
        this.projectFiles.clear();
        
        // Show upload progress dialog
        const progressDialog = document.getElementById('uploadProgressDialog');
        const progressBar = document.getElementById('uploadProgressBar');
        const progressPercent = document.getElementById('uploadProgressPercent');
        const progressMessage = document.getElementById('uploadProgressMessage');
        const progressDetails = document.getElementById('uploadProgressDetails');
        
        if (progressDialog) {
            progressDialog.classList.remove('hidden');
            progressBar.style.width = '0%';
            progressPercent.textContent = '0%';
            progressMessage.textContent = 'Filtering relevant files...';
            progressDetails.textContent = '';
            // Force browser to paint the dialog before processing
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        }
        
        // Filter files using path-based approach instead of extension whitelist
        // This includes all files from Logical/ and Physical/ folders, plus .apj files
        const relevantFiles = files.filter(file => {
            const filePath = file.relativePath || file.webkitRelativePath || file.name;
            return this.shouldIncludeFile(filePath);
        });
        
        // Debug: Log filtered binary files
        const filteredBinaryFiles = relevantFiles.filter(f => {
            const ext = this.getFileExtension(f.name);
            return ['.a', '.br', '.o'].includes(ext);
        });
        console.log(`Binary files after filtering: ${filteredBinaryFiles.length}`);
        filteredBinaryFiles.slice(0, 10).forEach(f => console.log(`  - ${f.webkitRelativePath || f.name}`));
        
        // Update progress dialog with file count
        const totalFiles = relevantFiles.length;
        if (progressDialog) {
            progressMessage.textContent = `Loading ${totalFiles} project files...`;
            progressDetails.textContent = `Filtered from ${files.length} total files (Logical/ + Physical/ + .apj)`;
            // Yield to let browser paint updated message
            await new Promise(resolve => requestAnimationFrame(resolve));
        }
        this.elements.btnScan.disabled = true;
        
        let loadedCount = 0;
        for (let i = 0; i < relevantFiles.length; i += batchSize) {
            const batch = relevantFiles.slice(i, i + batchSize);
            
            await Promise.all(batch.map(async (file) => {
                try {
                    const content = await this.readFileContent(file);
                    const ext = this.getFileExtension(file.name);
                    const type = this.getFileType(ext);
                    const isBinary = AS4Converter.BINARY_EXTENSIONS.includes(ext);
                    
                    // Detect AS version from .apj file
                    if (ext === '.apj' && !isBinary) {
                        console.log(`Processing .apj file: ${file.name}`);
                        const versionInfo = DeprecationDatabase.detectASVersion(content);
                        console.log('Detected version info:', versionInfo);
                        if (versionInfo) {
                            this.projectASVersion = versionInfo;
                            this.isAS6Project = versionInfo.major >= 6;
                            console.log(`AS Version set to: ${versionInfo.full}, isAS6: ${this.isAS6Project}`);
                        }
                    }
                    
                    this.projectFiles.set(file.relativePath || file.webkitRelativePath || file.name, {
                        content,
                        type,
                        name: file.name,
                        extension: ext,
                        isBinary: isBinary
                    });
                } catch (err) {
                    console.warn(`Failed to read file: ${file.name}`, err);
                }
            }));
            
            // Update progress dialog and yield to UI
            loadedCount = Math.min(i + batchSize, totalFiles);
            const percent = Math.round((loadedCount / totalFiles) * 100);
            if (progressDialog) {
                progressBar.style.width = `${percent}%`;
                progressPercent.textContent = `${percent}%`;
                progressDetails.textContent = `${loadedCount} of ${totalFiles} files loaded`;
            }
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        // Complete - show 100% briefly then hide
        if (progressDialog) {
            progressBar.style.width = '100%';
            progressPercent.textContent = '100%';
            progressMessage.textContent = 'Upload complete!';
            progressDetails.textContent = `${totalFiles} files loaded successfully`;
            
            setTimeout(() => {
                progressDialog.classList.add('hidden');
            }, 300);
        }
        
        this.elements.btnScan.textContent = '🔍 Scan for Deprecations';
        this.updateProjectInfo();
    }

    async handleZipUpload(file) {
        // Check if JSZip is available
        if (typeof JSZip === 'undefined') {
            alert('JSZip library not loaded. Please check your internet connection and refresh the page.');
            return;
        }

        try {
            // Show upload progress dialog
            const progressDialog = document.getElementById('uploadProgressDialog');
            const progressBar = document.getElementById('uploadProgressBar');
            const progressPercent = document.getElementById('uploadProgressPercent');
            const progressMessage = document.getElementById('uploadProgressMessage');
            const progressDetails = document.getElementById('uploadProgressDetails');
            
            if (progressDialog) {
                progressDialog.classList.remove('hidden');
                progressBar.style.width = '0%';
                progressPercent.textContent = '0%';
                progressMessage.textContent = 'Extracting ZIP archive...';
                progressDetails.textContent = '';
                await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            }

            // Load the ZIP file
            const zip = await JSZip.loadAsync(file);
            
            // Update progress
            if (progressDialog) {
                progressMessage.textContent = 'Processing files from archive...';
                progressBar.style.width = '30%';
                progressPercent.textContent = '30%';
                await new Promise(resolve => requestAnimationFrame(resolve));
            }

            // Extract all files
            const files = [];
            const fileEntries = Object.keys(zip.files);
            let processedCount = 0;

            for (const relativePath of fileEntries) {
                const zipEntry = zip.files[relativePath];
                
                // Skip directories
                if (zipEntry.dir) {
                    continue;
                }

                try {
                    // Read file content
                    const ext = this.getFileExtension(zipEntry.name);
                    const isBinary = AS4Converter.BINARY_EXTENSIONS.includes(ext);
                    
                    let content;
                    if (isBinary) {
                        content = await zipEntry.async('base64');
                    } else {
                        // Read as binary first to properly handle encoding
                        // B&R AS files often use Latin-1/Windows-1252 encoding for special characters
                        const uint8Array = await zipEntry.async('uint8array');
                        
                        // Try to detect if it's UTF-8 or Latin-1 based on content
                        // UTF-8 multi-byte sequences start with 110xxxxx, 1110xxxx, or 11110xxx
                        // Latin-1 uses single bytes 0x80-0xFF for special chars
                        let isValidUtf8 = true;
                        let i = 0;
                        while (i < uint8Array.length && i < 1000) { // Check first 1000 bytes
                            const byte = uint8Array[i];
                            if (byte >= 0x80) {
                                if ((byte & 0xE0) === 0xC0) {
                                    // 2-byte UTF-8 sequence
                                    if (i + 1 >= uint8Array.length || (uint8Array[i + 1] & 0xC0) !== 0x80) {
                                        isValidUtf8 = false;
                                        break;
                                    }
                                    i += 2;
                                } else if ((byte & 0xF0) === 0xE0) {
                                    // 3-byte UTF-8 sequence
                                    if (i + 2 >= uint8Array.length || 
                                        (uint8Array[i + 1] & 0xC0) !== 0x80 || 
                                        (uint8Array[i + 2] & 0xC0) !== 0x80) {
                                        isValidUtf8 = false;
                                        break;
                                    }
                                    i += 3;
                                } else if ((byte & 0xF8) === 0xF0) {
                                    // 4-byte UTF-8 sequence
                                    if (i + 3 >= uint8Array.length || 
                                        (uint8Array[i + 1] & 0xC0) !== 0x80 || 
                                        (uint8Array[i + 2] & 0xC0) !== 0x80 ||
                                        (uint8Array[i + 3] & 0xC0) !== 0x80) {
                                        isValidUtf8 = false;
                                        break;
                                    }
                                    i += 4;
                                } else {
                                    // Invalid UTF-8 start byte - likely Latin-1
                                    isValidUtf8 = false;
                                    break;
                                }
                            } else {
                                i++;
                            }
                        }
                        
                        if (isValidUtf8) {
                            // Decode as UTF-8
                            content = new TextDecoder('utf-8').decode(uint8Array);
                        } else {
                            // Decode as Windows-1252 (Latin-1 superset, common for B&R files)
                            content = new TextDecoder('windows-1252').decode(uint8Array);
                        }
                    }

                    // Create a File-like object
                    files.push({
                        name: zipEntry.name.split('/').pop(),
                        relativePath: relativePath,
                        webkitRelativePath: relativePath,
                        content: content,
                        isBinary: isBinary
                    });

                    // Update progress
                    processedCount++;
                    const percent = 30 + Math.round((processedCount / fileEntries.length) * 40);
                    if (progressDialog) {
                        progressBar.style.width = `${percent}%`;
                        progressPercent.textContent = `${percent}%`;
                        progressDetails.textContent = `Extracted ${processedCount} of ${fileEntries.length} files`;
                        
                        if (processedCount % 50 === 0) {
                            await new Promise(resolve => setTimeout(resolve, 0));
                        }
                    }
                } catch (err) {
                    console.warn(`Failed to extract ${relativePath}:`, err);
                }
            }

            // Update progress
            if (progressDialog) {
                progressMessage.textContent = 'Processing extracted files...';
                progressBar.style.width = '70%';
                progressPercent.textContent = '70%';
                await new Promise(resolve => requestAnimationFrame(resolve));
            }

            // Process the extracted files using existing logic
            await this.processExtractedFiles(files, progressDialog, progressBar, progressPercent, progressMessage, progressDetails);

        } catch (error) {
            console.error('Error processing ZIP file:', error);
            alert('Error processing ZIP file: ' + error.message);
            
            // Hide progress dialog
            const progressDialog = document.getElementById('uploadProgressDialog');
            if (progressDialog) {
                progressDialog.classList.add('hidden');
            }
        }
    }

    async processExtractedFiles(files, progressDialog, progressBar, progressPercent, progressMessage, progressDetails) {
        this.projectFiles.clear();

        // Filter files using path-based approach instead of extension whitelist
        // This includes all files from Logical/ and Physical/ folders, plus .apj files
        const relevantFiles = files.filter(file => {
            const filePath = file.relativePath || file.webkitRelativePath || file.name;
            return this.shouldIncludeFile(filePath);
        });

        if (progressDialog) {
            progressMessage.textContent = `Loading ${relevantFiles.length} project files...`;
            progressDetails.textContent = `Filtered from ${files.length} total files (Logical/ + Physical/ + .apj)`;
            await new Promise(resolve => requestAnimationFrame(resolve));
        }

        // Process files
        const totalFiles = relevantFiles.length;
        let loadedCount = 0;

        for (const file of relevantFiles) {
            try {
                const ext = this.getFileExtension(file.name);
                const type = this.getFileType(ext);
                const isBinary = file.isBinary;

                // Detect AS version from .apj file
                if (ext === '.apj' && !isBinary) {
                    const versionInfo = DeprecationDatabase.detectASVersion(file.content);
                    if (versionInfo) {
                        this.projectASVersion = versionInfo;
                        this.isAS6Project = versionInfo.major >= 6;
                    }
                }

                this.projectFiles.set(file.relativePath || file.webkitRelativePath || file.name, {
                    content: file.content,
                    type,
                    name: file.name,
                    extension: ext,
                    isBinary: isBinary
                });

                loadedCount++;
                const percent = 70 + Math.round((loadedCount / totalFiles) * 30);
                if (progressDialog) {
                    progressBar.style.width = `${percent}%`;
                    progressPercent.textContent = `${percent}%`;
                    progressDetails.textContent = `${loadedCount} of ${totalFiles} files loaded`;
                    
                    if (loadedCount % 25 === 0) {
                        await new Promise(resolve => setTimeout(resolve, 0));
                    }
                }
            } catch (err) {
                console.warn(`Failed to process file: ${file.name}`, err);
            }
        }

        // Complete
        if (progressDialog) {
            progressBar.style.width = '100%';
            progressPercent.textContent = '100%';
            progressMessage.textContent = 'Upload complete!';
            progressDetails.textContent = `${totalFiles} files loaded successfully`;
            
            setTimeout(() => {
                progressDialog.classList.add('hidden');
            }, 300);
        }

        this.updateProjectInfo();
    }

    async processFiles(files) {
        try {
            this.projectFiles.clear();
            
            // Show upload progress dialog
            const progressDialog = document.getElementById('uploadProgressDialog');
            const progressBar = document.getElementById('uploadProgressBar');
            const progressPercent = document.getElementById('uploadProgressPercent');
            const progressMessage = document.getElementById('uploadProgressMessage');
            const progressDetails = document.getElementById('uploadProgressDetails');
            
            if (progressDialog) {
                progressDialog.classList.remove('hidden');
                progressBar.style.width = '0%';
                progressPercent.textContent = '0%';
                progressMessage.textContent = 'Filtering relevant files...';
                progressDetails.textContent = '';
                // Force browser to paint the dialog before processing
                await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            }
            
            // Filter files using path-based approach instead of extension whitelist
            // This includes all files from Logical/ and Physical/ folders, plus .apj files
            const relevantFiles = files.filter(file => {
                const filePath = file.relativePath || file.webkitRelativePath || file.name;
                return this.shouldIncludeFile(filePath);
            });
            
            // Update progress after filtering
            if (progressDialog) {
                progressMessage.textContent = `Loading ${relevantFiles.length} project files...`;
                progressDetails.textContent = `Filtered from ${files.length} total files (Logical/ + Physical/ + .apj)`;
                // Yield to let browser paint updated message
                await new Promise(resolve => requestAnimationFrame(resolve));
            }
            
            // Debug: Log filtered binary files
            const filteredBinaryFiles = relevantFiles.filter(f => {
                const ext = this.getFileExtension(f.name);
                return ['.a', '.br', '.o'].includes(ext);
            });
            console.log(`Binary files after filtering (processFiles): ${filteredBinaryFiles.length}`);
            filteredBinaryFiles.slice(0, 10).forEach(f => console.log(`  - ${f.webkitRelativePath || f.name}`));
            
            // Process files with error handling and progress updates
            const totalFiles = relevantFiles.length;
            let processedCount = 0;
            let lastProgressUpdate = 0;
            
            for (const file of relevantFiles) {
                try {
                    const content = await this.readFileContent(file);
                    const ext = this.getFileExtension(file.name);
                    const type = this.getFileType(ext);
                    const isBinary = AS4Converter.BINARY_EXTENSIONS.includes(ext);
                    
                    // Detect AS version from .apj file
                    if (ext === '.apj' && !isBinary) {
                        console.log(`Processing .apj file: ${file.name}`);
                        const versionInfo = DeprecationDatabase.detectASVersion(content);
                        console.log('Detected version info:', versionInfo);
                        if (versionInfo) {
                            this.projectASVersion = versionInfo;
                            this.isAS6Project = versionInfo.major >= 6;
                            console.log(`AS Version set to: ${versionInfo.full}, isAS6: ${this.isAS6Project}`);
                        }
                    }
                    
                    this.projectFiles.set(file.relativePath || file.webkitRelativePath || file.name, {
                        content,
                        type,
                        name: file.name,
                        extension: ext,
                        isBinary: isBinary
                    });
                    
                    // Update progress (throttled to avoid UI lag)
                    processedCount++;
                    const currentProgress = Math.round((processedCount / totalFiles) * 100);
                    if (progressDialog && currentProgress > lastProgressUpdate) {
                        lastProgressUpdate = currentProgress;
                        progressBar.style.width = `${currentProgress}%`;
                        progressPercent.textContent = `${currentProgress}%`;
                        progressDetails.textContent = `${processedCount} / ${totalFiles} files loaded`;
                        // Yield to UI thread every 5%
                        if (currentProgress % 5 === 0) {
                            await new Promise(resolve => setTimeout(resolve, 0));
                        }
                    }
                } catch (err) {
                    console.warn(`Skipping file ${file.name}:`, err);
                    processedCount++;
                }
            }
            
            // Hide upload progress dialog
            if (progressDialog) {
                progressBar.style.width = '100%';
                progressPercent.textContent = '100%';
                progressMessage.textContent = 'Complete!';
                progressDetails.textContent = `Loaded ${this.projectFiles.size} files`;
                // Brief delay before hiding so user sees completion
                await new Promise(resolve => setTimeout(resolve, 300));
                progressDialog.classList.add('hidden');
            }
            
            this.updateProjectInfo();
        } catch (error) {
            // Hide progress dialog on error
            const progressDialog = document.getElementById('uploadProgressDialog');
            if (progressDialog) {
                progressDialog.classList.add('hidden');
            }
            console.error('Error processing files:', error);
            alert('Error processing files: ' + error.message);
        }
    }

    // Binary file extensions that should not be read as text
    static BINARY_EXTENSIONS = [
        // Compiled/object files
        '.a', '.o', '.br',
        // Motion/Axis files
        '.vax',
        // Safety project files
        '.saf', '.sos', '.sim', '.swt', '.st1', '.sto', '.pr2',
        // DTM device configuration files (binary)
        '.dtm', '.dtmdre', '.dtmdri', '.dtmtre',
        // Help cache
        '.chw',
        // Source control cache
        '.scc',
        // Cross-reference/order files
        '.crcl', '.ibs', '.lov', '.wwd',
        // Images
        '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg', '.tif', '.tiff',
        // Documents
        '.pdf', '.chm', '.doc', '.docx', '.xls', '.xlsx', '.xlsm', '.ppt', '.pptx',
        // 3D models
        '.stl', '.obj', '.step', '.stp', '.iges', '.igs',
        // Archives
        '.zip', '.rar', '.7z', '.tar', '.gz',
        // Device descriptions
        '.xdd', '.eds', '.gsd', '.gsdml',
        // Executables
        '.exe', '.dll', '.so',
        // Scene/simulation files
        '.scn',
        // Help files
        '.hlp',
        // Binary data
        '.bin', '.dat'
    ];
    
    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            const ext = this.getFileExtension(file.name);
            const isBinary = AS4Converter.BINARY_EXTENSIONS.includes(ext);
            
            // Add timeout for Edge browser issues
            const timeout = setTimeout(() => {
                reader.abort();
                reject(new Error('File read timeout'));
            }, 10000); // 10 second timeout
            
            reader.onload = (e) => {
                clearTimeout(timeout);
                resolve(e.target.result);
            };
            reader.onerror = (e) => {
                clearTimeout(timeout);
                reject(e);
            };
            reader.onabort = () => {
                clearTimeout(timeout);
                reject(new Error('File read aborted'));
            };
            
            try {
                if (isBinary) {
                    reader.readAsArrayBuffer(file);
                } else {
                    reader.readAsText(file);
                }
            } catch (err) {
                clearTimeout(timeout);
                reject(err);
            }
        });
    }

    /**
     * Determines if a file should be included in the project based on its path.
     * 
     * Inclusion rules:
     * - Files in Logical/ folder and all subfolders
     * - Files in Physical/ folder and all subfolders
     * - .apj files at the project root
     * 
     * Exclusion rules:
     * - Temp/ folder and all contents
     * - Binaries/ folder and all contents
     * - Diagnosis/ folder and all contents
     * 
     * @param {string} filePath - The relative path of the file (e.g., "ProjectName/Logical/Package.pkg")
     * @returns {boolean} - True if the file should be included, false otherwise
     */
    shouldIncludeFile(filePath) {
        const pathParts = filePath.split(/[\/\\]/).filter(p => p.length > 0);
        
        if (pathParts.length === 0) {
            return false;
        }
        
        // Folders to EXCLUDE (system, build artifacts, caches)
        const excludedFolders = [
            'Temp', 'Binaries', 'Diagnosis',
            '.git', '.svn', '.vscode', 'Backup', '__MACOSX'
        ];
        
        // Check if ANY part of the path is an excluded folder (case-insensitive)
        if (pathParts.some(part => 
            excludedFolders.some(ef => ef.toLowerCase() === part.toLowerCase())
        )) {
            return false;
        }
        
        // Get the filename (last part of the path)
        const fileName = pathParts[pathParts.length - 1];
        
        // ALWAYS include .apj files (project file) regardless of location
        if (fileName.toLowerCase().endsWith('.apj')) {
            return true;
        }
        
        // Include if file is within Logical/ or Physical/ folders
        // Path format can be: "Logical/..." or "ProjectName/Logical/..."
        const hasLogicalOrPhysical = pathParts.some((part) => {
            const lowerPart = part.toLowerCase();
            return lowerPart === 'logical' || lowerPart === 'physical';
        });
        
        return hasLogicalOrPhysical;
    }

    getFileExtension(filename) {
        const idx = filename.lastIndexOf('.');
        return idx >= 0 ? filename.substring(idx).toLowerCase() : '';
    }

    getFileType(ext) {
        const typeMap = {
            // Structured Text and IEC code
            '.st': 'structured_text',
            '.fun': 'function_block',
            '.typ': 'type_definition',
            '.var': 'variable',
            '.prg': 'program',
            '.svar': 'variable',
            
            // Hardware configuration
            '.hw': 'hardware',
            '.hwl': 'hardware_list',
            
            // Package and project files
            '.xml': 'xml',
            '.pkg': 'package',
            '.apj': 'project',
            
            // Task and software configuration
            '.sw': 'software_config',
            '.per': 'cpu_performance',
            
            // Motion/Axis configuration
            '.ax': 'axis_init',
            '.apt': 'axis_parameters',
            '.ncm': 'nc_mapping',
            '.ncc': 'nc_config',
            '.dob': 'data_object',
            
            // Localization
            '.tmx': 'localization',
            '.textconfig': 'localization',
            '.units': 'localization',
            
            // I/O configuration
            '.iom': 'io_mapping',
            '.vvm': 'pv_mapping',
            
            // Library files
            '.lby': 'library_binary',
            '.br': 'library_binary',
            '.a': 'library_binary',
            '.o': 'library_binary',
            
            // mappView / Visualization
            '.content': 'visualization',
            '.eventbinding': 'visualization',
            '.binding': 'visualization',
            '.action': 'visualization',
            '.page': 'visualization',
            '.layout': 'visualization',
            '.dialog': 'visualization',
            '.theme': 'visualization',
            '.styles': 'visualization',
            '.vis': 'visualization',
            '.mappviewcfg': 'visualization',
            '.widgetlibrary': 'visualization',
            '.snippet': 'visualization',
            '.numpad': 'visualization',
            '.alphapad': 'visualization',
            '.compoundwidget': 'visualization',
            '.stylesset': 'visualization',
            
            // OPC UA
            '.uaserver': 'opcua',
            
            // mapp components
            '.mpalarmxcore': 'mapp_component',
            '.mpalarmxhistory': 'mapp_component',
            '.mpalarmxlist': 'mapp_component',
            '.mpalarmxcategory': 'mapp_component',
            '.mpalarmxquery': 'mapp_component',
            '.mprecipexml': 'mapp_component',
            '.mprecipecsv': 'mapp_component',
            '.mpdatarecorder': 'mapp_component',
            
            // mappCockpit
            '.mcocfg': 'mapp_cockpit',
            '.mcowebservercfg': 'mapp_cockpit',
            
            // Security and access
            '.role': 'security',
            '.user': 'security',
            '.firewallrules': 'security',
            
            // DTM / Device configuration
            '.dtm': 'dtm',
            '.dtmdre': 'dtm',
            '.dtmtre': 'dtm',
            '.dtmdri': 'dtm',
            
            // ANSI C source files
            '.c': 'c_source',
            '.h': 'c_header',
            
            // OPC UA data
            '.uad': 'opcua_data',
            
            // Motion data objects
            '.ett': 'data_object',
            
            // Language/Localization
            '.language': 'localization',
            
            // Safety
            '.sfapp': 'safety',
            '.swt': 'safety',
            
            // Media/assets
            '.jpg': 'media',
            '.svg': 'media',
            '.png': 'media',
            '.gif': 'media',
            '.bmp': 'media',
            '.ico': 'media',
            
            // Scripts and config
            '.ps1': 'script',
            '.bat': 'script',
            '.cmd': 'script',
            '.gitignore': 'config',
            
            // Documentation
            '.md': 'documentation',
            '.doc': 'documentation',
            '.txt': 'documentation'
        };
        return typeMap[ext] || 'unknown';
    }

    updateProjectInfo() {
        const stats = {
            total: this.projectFiles.size,
            st: 0,
            pkg: 0,
            lby: 0,
            tmx: 0,
            motion: 0,
            hw: 0,
            vis: 0
        };
        
        this.projectFiles.forEach((file) => {
            if (file.type === 'structured_text' || file.type === 'function_block' || file.type === 'program') {
                stats.st++;
            } else if (file.type === 'package') {
                stats.pkg++;
            } else if (file.type === 'library_binary') {
                stats.lby++;
            } else if (file.type === 'localization') {
                stats.tmx++;
            } else if (file.type === 'axis_init' || file.type === 'axis_parameters' || 
                       file.type === 'nc_mapping' || file.type === 'nc_config' || file.type === 'data_object') {
                stats.motion++;
            } else if (file.type === 'hardware' || file.type === 'hardware_list' || file.type === 'software_config') {
                stats.hw++;
            } else if (file.type === 'visualization') {
                stats.vis++;
            }
        });
        
        this.elements.totalFiles.textContent = stats.total;
        this.elements.stFiles.textContent = stats.st;
        if (this.elements.pkgFiles) this.elements.pkgFiles.textContent = stats.pkg;
        if (this.elements.lbyFiles) this.elements.lbyFiles.textContent = stats.lby;
        if (this.elements.tmxFiles) this.elements.tmxFiles.textContent = stats.tmx;
        if (this.elements.motionFiles) this.elements.motionFiles.textContent = stats.motion;
        if (this.elements.visFiles) this.elements.visFiles.textContent = stats.vis;
        this.elements.hwFiles.textContent = stats.hw;
        
        // Update AS version display
        const asVersionEl = document.getElementById('asVersion');
        const as6WarningEl = document.getElementById('as6Warning');
        console.log('updateProjectInfo - projectASVersion:', this.projectASVersion);
        console.log('updateProjectInfo - isAS6Project:', this.isAS6Project);
        if (asVersionEl) {
            if (this.projectASVersion) {
                asVersionEl.textContent = this.projectASVersion.full;
                asVersionEl.style.fontWeight = 'bold';
                if (this.isAS6Project) {
                    asVersionEl.style.color = '#dc3545';
                }
            } else {
                asVersionEl.textContent = '-';
            }
        } else {
            console.warn('asVersion element not found!');
        }
        
        // Show AS6 warning if detected
        if (as6WarningEl) {
            as6WarningEl.classList.toggle('hidden', !this.isAS6Project);
        }
        
        // Show/hide elements
        this.elements.projectInfo.classList.toggle('hidden', stats.total === 0);
        this.elements.btnScan.disabled = stats.total === 0 || this.isAS6Project;
        this.elements.btnClear.disabled = stats.total === 0;
        
        // Build file tree
        this.renderFileTree();
    }

    renderFileTree() {
        const container = this.elements.fileTree;
        container.innerHTML = '';

        if (this.projectFiles.size === 0) return;

        // ---- 1. Categorize files by top-level project folder ----
        const categories = new Map(); // categoryLabel -> Map(relativePath -> file)
        const categoryOrder = [
            { key: 'Logical',  icon: '🧠', label: 'Logical (Tasks & Programs)' },
            { key: 'Physical', icon: '🔌', label: 'Physical (Hardware Config)' },
            { key: 'project',  icon: '🗂️', label: 'Project Files' },
            { key: 'other',    icon: '📄', label: 'Other Files' }
        ];
        categoryOrder.forEach(c => categories.set(c.key, new Map()));

        this.projectFiles.forEach((file, path) => {
            const normalized = path.replace(/\\/g, '/');
            const lowerPath = normalized.toLowerCase();
            // Detect category by looking for Logical/ or Physical/ anywhere in path
            if (lowerPath.includes('/logical/') || lowerPath.startsWith('logical/')) {
                categories.get('Logical').set(normalized, file);
            } else if (lowerPath.includes('/physical/') || lowerPath.startsWith('physical/')) {
                categories.get('Physical').set(normalized, file);
            } else if (file.type === 'project' || normalized.endsWith('.apj')) {
                categories.get('project').set(normalized, file);
            } else {
                categories.get('other').set(normalized, file);
            }
        });

        // ---- 2. Render each category ----
        for (const catDef of categoryOrder) {
            const files = categories.get(catDef.key);
            if (files.size === 0) continue;

            const catSection = document.createElement('div');
            catSection.className = 'tree-category';

            const catHeader = document.createElement('div');
            catHeader.className = 'tree-category-header';
            catHeader.innerHTML = `<span class="tree-toggle">▶</span> ${catDef.icon} <strong>${catDef.label}</strong> <span class="tree-count">(${files.size})</span>`;
            catHeader.addEventListener('click', () => {
                const isOpen = catSection.classList.toggle('open');
                catHeader.querySelector('.tree-toggle').textContent = isOpen ? '▼' : '▶';
                treeRoot.style.display = isOpen ? 'block' : 'none';
            });
            catSection.appendChild(catHeader);

            // Build a nested folder tree from the paths
            const treeRoot = this.buildFolderTree(files, catDef.key);
            treeRoot.style.display = 'none'; // categories start collapsed
            catSection.appendChild(treeRoot);

            container.appendChild(catSection);
        }
    }

    /**
     * Build a nested <ul> tree of folders and files from a Map of paths.
     * Each folder level is collapsible.
     */
    buildFolderTree(fileMap, categoryKey) {
        // Build nested object: { __files__: [], subfolderName: { ... } }
        const root = { __files__: [] };

        fileMap.forEach((file, fullPath) => {
            const normalized = fullPath.replace(/\\/g, '/');
            const parts = normalized.split('/');

            // Strip everything up to and including the category folder (e.g. "MDP23/Logical/")
            let startIdx = 0;
            if (categoryKey === 'Logical' || categoryKey === 'Physical') {
                const catIdx = parts.findIndex(p => p.toLowerCase() === categoryKey.toLowerCase());
                startIdx = catIdx >= 0 ? catIdx + 1 : 0;
            } else {
                // For project/other: skip the project root folder name
                startIdx = parts.length > 1 ? 1 : 0;
            }

            const relevant = parts.slice(startIdx);
            if (relevant.length === 0) return;

            let node = root;
            for (let i = 0; i < relevant.length - 1; i++) {
                const folder = relevant[i];
                if (!node[folder]) node[folder] = { __files__: [] };
                node = node[folder];
            }
            node.__files__.push({ name: relevant[relevant.length - 1], file, fullPath });
        });

        return this.renderFolderNode(root, 0);
    }

    /**
     * Recursively render a folder node into a <ul> element.
     */
    renderFolderNode(node, depth) {
        const ul = document.createElement('ul');
        ul.className = 'tree-folder-list';
        if (depth > 0) ul.style.display = 'none'; // collapsed by default

        // Render sub-folders first (sorted)
        const folders = Object.keys(node).filter(k => k !== '__files__').sort();
        for (const folderName of folders) {
            const li = document.createElement('li');
            li.className = 'tree-folder';

            const childNode = node[folderName];
            const count = this.countTreeItems(childNode);

            const header = document.createElement('div');
            header.className = 'tree-folder-header';
            header.innerHTML = `<span class="tree-toggle">▶</span> 📁 <span class="tree-folder-name">${folderName}</span> <span class="tree-count">(${count})</span>`;

            const childUl = this.renderFolderNode(childNode, depth + 1);

            header.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = li.classList.toggle('open');
                header.querySelector('.tree-toggle').textContent = isOpen ? '▼' : '▶';
                childUl.style.display = isOpen ? 'block' : 'none';
            });

            li.appendChild(header);
            li.appendChild(childUl);
            ul.appendChild(li);
        }

        // Render files (sorted)
        const files = (node.__files__ || []).sort((a, b) => a.name.localeCompare(b.name));
        for (const entry of files) {
            const li = document.createElement('li');
            li.className = 'tree-file';
            li.innerHTML = `<span class="file-icon">${this.getFileIcon(entry.file.type)}</span> <span class="file-name">${entry.name}</span>`;
            ul.appendChild(li);
        }

        return ul;
    }

    /**
     * Count total files in a folder tree node (recursively).
     */
    countTreeItems(node) {
        let count = (node.__files__ || []).length;
        for (const key of Object.keys(node)) {
            if (key !== '__files__') count += this.countTreeItems(node[key]);
        }
        return count;
    }

    getFileIcon(type) {
        const icons = {
            'structured_text': '📄',
            'function_block': '🔧',
            'program': '📄',
            'type_definition': '📋',
            'variable': '📊',
            'hardware': '🔌',
            'hardware_list': '🔌',
            'software_config': '⏱️',
            'cpu_performance': '⚡',
            'xml': '📝',
            'package': '📦',
            'project': '🗂️',
            'axis_init': '🔄',
            'axis_parameters': '🎛️',
            'nc_mapping': '🗺️',
            'nc_config': '⚙️',
            'data_object': '💾',
            'localization': '🌐',
            'io_mapping': '🔗',
            'pv_mapping': '📍',
            'library_binary': '📚',
            'visualization': '🖥️',
            'opcua': '🔗',
            'mapp_component': '🧩',
            'security': '🔒',
            'dtm': '🔧',
            'media': '🖼️',
            'documentation': '📖'
        };
        return icons[type] || '📄';
    }

    clearProject() {
        this.projectFiles.clear();
        this.analysisResults = [];
        this.selectedFindings.clear();
        this.appliedConversions.clear();
        this.undoStack = [];
        this.projectASVersion = null;
        this.isAS6Project = false;
        
        this.updateProjectInfo();
        this.resetAnalysisUI();
        this.resetPreviewUI();
        this.resetReportUI();
    }

    // ==========================================
    // ANALYSIS ENGINE
    // ==========================================

    detectObsoleteTargetHardware() {
        const obsoleteHardware = [];
        const obsoleteList = DeprecationDatabase.as6Format.obsoleteTargetHardware;
        
        // Scan all .hw files for hardware module types
        for (const [path, file] of this.projectFiles) {
            if (file.extension === '.hw' && !file.isBinary) {
                const content = file.content;
                
                // Extract hardware module IDs from XML
                // Format: <Module Name="..." Type="5PP5CP.US15-01" X="..." Y="..." />
                const modulePattern = /<Module\s+[^>]*Type="([^"]+)"[^>]*>/gi;
                let match;
                
                while ((match = modulePattern.exec(content)) !== null) {
                    const moduleType = match[1];
                    
                    // Check if this module type is obsolete
                    if (obsoleteList.includes(moduleType)) {
                        const existingEntry = obsoleteHardware.find(h => h.moduleType === moduleType);
                        if (existingEntry) {
                            existingEntry.locations.push(path);
                        } else {
                            obsoleteHardware.push({
                                moduleType: moduleType,
                                locations: [path]
                            });
                        }
                    }
                }
            }
        }
        
        return obsoleteHardware;
    }

    async runAnalysis() {
        // Block analysis for AS6 projects
        if (this.isAS6Project) {
            alert('This project is already AS6 and cannot be converted. The converter is designed for AS4 projects only.');
            return;
        }
        
        this.analysisResults = [];
        this.selectedFindings.clear();
        
        // Show loading state
        this.elements.btnScan.disabled = true;
        this.elements.btnScan.textContent = '⏳ Analyzing...';
        
        try {
            // Check for obsolete target hardware first - this is a blocking error
            const obsoleteHardware = this.detectObsoleteTargetHardware();
            if (obsoleteHardware.length > 0) {
                // Set blocking error flag
                this.hasBlockingErrors = true;
                
                // Create blocking errors for each obsolete hardware type
                obsoleteHardware.forEach(hw => {
                    this.analysisResults.push({
                        severity: 'error',
                        type: 'hardware',
                        category: 'Obsolete Target Hardware',
                        name: `Obsolete PLC/Target: ${hw.moduleType}`,
                        file: hw.locations[0],
                        line: 0,
                        message: `Hardware module ${hw.moduleType} is not supported in AS6`,
                        description: `This hardware module is not supported in AS6 and will break the hardware tree during conversion.`,
                        details: `Found in ${hw.locations.length} location(s):\n${hw.locations.map(loc => `  • ${loc}`).join('\n')}\n\n⚠️ Action Required: Replace this hardware with an AS6-compatible model in your AS4 project before running the conversion.`,
                        blocking: true,
                        autoFix: false,
                        replacement: null
                    });
                });
                
                // Display results and show blocking error banner
                this.displayAnalysisResults();
                this.switchTab('analysis');
                return; // Stop analysis here - don't continue with other checks
            }
            
            // Analyze each file
            for (const [path, file] of this.projectFiles) {
                await this.analyzeFile(path, file);
            }
            
            // Sort results by severity
            this.analysisResults.sort((a, b) => {
                const severityOrder = { error: 0, warning: 1, info: 2 };
                return (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3);
            });
            
            // Auto-apply project file conversion (.apj AS4 → AS6)
            this.autoApplyProjectFileConversion();
            
            // Auto-apply library version updates for technology package libraries
            this.autoApplyLibraryVersionUpdates();
            
            // Auto-apply function replacements (memset→brsmemset, etc.)
            this.autoApplyFunctionReplacements();
            
            // Auto-apply deprecated library function and constant replacements (AsMath→AsBrMath, AsString→AsBrStr)
            this.autoApplyDeprecatedLibraryReplacements();
            
            // Auto-apply motion type replacements (McAcpAxCamAutParType→McCamAutParType, etc.)
            this.autoApplyMotionTypeReplacements();
            
            // Auto-apply OPC UA conversion (OpcUA → OpcUaCs, FileVersion 10, config files)
            this.autoApplyUadFileConversion();
            
            // Auto-apply mappServices AlarmX conversion (split core file to AS6 format)
            this.autoApplyMappServicesConversion();
            
            // Auto-apply MpDataRecorder conversion (restructure DataRecorder group to AS6 format)
            this.autoApplyMpDataRecorderConversion();
            
            // Auto-apply mappView configuration updates (startup user to anonymous)
            this.autoApplyMappViewConfigConversion();
            
            // Auto-fix OPC UA server ConnectionPolicy in .uaserver files (must be "Current mapp view user")
            this.autoApplyUaServerConnectionPolicy();
            
            // Auto-fix SecurityPolicy "None" enabled in .uacfg files (required for mappView OPC UA access)
            this.autoApplyUaCfgSecurityPolicyNone();
            
            // Auto-remove deprecated function blocks (MpAlarmXAcknowledgeAll, etc.)
            this.autoApplyDeprecatedFunctionBlockRemoval();
            
            // Auto-comment deprecated struct members (McCamAutDefineType.DataSize, etc.)
            this.autoCommentDeprecatedStructMembers();
            
            // Auto-remove SafetyRelease from .pkg files (not supported in AS6)
            this.autoRemoveSafetyRelease();
            this.autoRemoveSafetyRelease();
            
            // Auto-update Visual Components firmware version in cpu.pkg files
            this.autoUpdateVcFirmwareVersion();
            
            // Auto-add ChannelBrowsePath to OpcUa_any devices in .hw files
            this.autoApplyOpcUaAnyChannelBrowsePath();
            
            // Auto-remove MpWebXs technology package (not supported in AS6)
            this.autoRemoveMpWebXs();
            
            // Auto-add BR_Engineer role to all users in .user files (required for mappView OPC UA PV access)
            this.autoApplyUserBREngineerRole();
            
            // Update UI
            this.displayAnalysisResults();
            this.switchTab('analysis');
            
        } catch (error) {
            console.error('Analysis error:', error);
            alert('Error during analysis: ' + error.message);
        } finally {
            this.elements.btnScan.disabled = false;
            this.elements.btnScan.textContent = '🔍 Scan for Deprecations';
        }
    }

    async analyzeFile(path, file) {
        // Skip binary files - they can't be analyzed as text
        if (file.isBinary) {
            return;
        }
        
        const content = file.content;
        
        // Analyze based on file type
        switch (file.type) {
            case 'structured_text':
            case 'function_block':
            case 'program':
                this.analyzeStructuredText(path, content);
                break;
            case 'hardware':
            case 'hardware_list':
            case 'xml':
                this.analyzeXML(path, content);
                break;
            case 'package':
                this.analyzePackageFile(path, content);
                break;
            case 'project':
                this.analyzeProjectFile(path, content);
                break;
            case 'software_config':
                this.analyzeSoftwareConfig(path, content);
                break;
            case 'axis_init':
            case 'axis_parameters':
            case 'nc_mapping':
            case 'nc_config':
                this.analyzeMotionConfig(path, content, file.type);
                break;
            case 'localization':
                this.analyzeLocalizationFile(path, content);
                break;
            case 'library_binary':
                this.analyzeLibraryFile(path, content);
                break;
            case 'visualization':
                this.analyzeVisualization(path, content);
                break;
        }
    }

    analyzeStructuredText(path, content) {
        // Check for library declarations
        const libraryPattern = /\{?\s*LIBRARY\s+(\w+)\s*\}?/gi;
        let match;
        
        while ((match = libraryPattern.exec(content)) !== null) {
            const libName = match[1];
            const deprecation = DeprecationDatabase.findLibrary(libName);
            
            if (deprecation) {
                this.addFinding({
                    type: 'library',
                    name: libName,
                    severity: deprecation.severity,
                    description: deprecation.description,
                    replacement: deprecation.replacement,
                    notes: deprecation.notes,
                    file: path,
                    line: this.getLineNumber(content, match.index),
                    context: this.getCodeContext(content, match.index),
                    original: match[0],
                    functionMappings: deprecation.functionMappings,
                    autoReplace: deprecation.autoReplace || false,
                    libraryPath: deprecation.libraryPath || null
                });
                
                // Track libraries that need function replacement scanning
                if (deprecation.autoReplace && deprecation.functionMappings && deprecation.functionMappings.length > 0) {
                    this.librariesForFunctionReplacement = this.librariesForFunctionReplacement || new Set();
                    this.librariesForFunctionReplacement.add(libName);
                }
            }
        }
        
        // Check for deprecated library function calls (AsString, AsWStr, etc.)
        this.scanForDeprecatedFunctionCalls(path, content);
        
        // Check for deprecated motion types (McAcpAx* → Mc* for AS6)
        this.scanForDeprecatedMotionTypes(path, content);
        
        // Check for deprecated enum values (AS4 → AS6 renames)
        this.scanForDeprecatedEnumValues(path, content);
        
        // Check for deprecated struct/FB member names (AS4 → AS6 renames)
        this.scanForDeprecatedMemberNames(path, content);
        
        // Check for function calls that match deprecated functions
        DeprecationDatabase.functions.forEach(func => {
            if (func.pattern) {
                const funcPattern = new RegExp(func.pattern.source, func.pattern.flags);
                while ((match = funcPattern.exec(content)) !== null) {
                    this.addFinding({
                        type: 'function',
                        name: func.name,
                        severity: func.severity,
                        description: func.description,
                        replacement: func.replacement,
                        file: path,
                        line: this.getLineNumber(content, match.index),
                        context: this.getCodeContext(content, match.index),
                        original: match[0],
                        autoReplace: func.autoReplace || false,
                        conversion: (func.autoReplace && func.replacement) ? {
                            type: 'function',
                            from: func.name,
                            to: func.replacement.name,
                            automated: true
                        } : null
                    });
                }
            }
        });
        
        // Check for obsolete function blocks
        const obsoleteFBs = DeprecationDatabase.findObsoleteFunctionBlocks(content);
        obsoleteFBs.forEach(fb => {
            this.addFinding({
                type: 'function_block',
                name: fb.name,
                severity: fb.severity,
                description: fb.description,
                replacement: { name: fb.replacement, description: fb.notes },
                file: path,
                line: fb.line,
                context: this.getCodeContext(content, fb.index),
                original: fb.match,
                notes: fb.notes,
                autoReplace: fb.autoReplace,
                conversion: fb.autoReplace ? {
                    type: 'function_block',
                    from: fb.name,
                    to: fb.replacement,
                    automated: true
                } : null
            });
        });
    }

    /**
     * Scan source code for deprecated library function calls (AsString → AsBrStr, AsMath → AsBrMath, etc.)
     * This is called during analysis to detect function calls that need replacement
     */
    scanForDeprecatedFunctionCalls(path, content) {
        // Get all libraries with function mappings that need replacement
        const librariesWithMappings = DeprecationDatabase.libraries.filter(
            lib => lib.autoReplace && lib.functionMappings && lib.functionMappings.length > 0
        );
        
        librariesWithMappings.forEach(lib => {
            lib.functionMappings.forEach(mapping => {
                // Create regex pattern to match function calls: functionName(
                // Use word boundary to avoid matching partial names
                const pattern = new RegExp(`\\b${this.escapeRegex(mapping.old)}\\s*\\(`, 'gi');
                let match;
                
                while ((match = pattern.exec(content)) !== null) {
                    // Build replacement description
                    let replacementName = mapping.new;
                    let replacementDesc = mapping.notes;
                    if (mapping.wrapWith) {
                        replacementName = `${mapping.wrapWith}(${mapping.new}(...))`;
                        replacementDesc = `${mapping.notes}. Wrapped with ${mapping.wrapWith}() for type compatibility.`;
                    }
                    
                    this.addFinding({
                        type: 'deprecated_function_call',
                        name: mapping.old,
                        severity: 'warning',
                        description: `Deprecated function from ${lib.name}: ${mapping.old} → ${replacementName}`,
                        replacement: { 
                            name: replacementName, 
                            description: replacementDesc 
                        },
                        notes: `Function ${mapping.old} is part of deprecated ${lib.name} library. Replace with ${replacementName} from ${lib.replacement?.name || 'new library'}.`,
                        file: path,
                        line: this.getLineNumber(content, match.index),
                        context: this.getCodeContext(content, match.index),
                        original: match[0],
                        autoReplace: true,
                        parentLibrary: lib.name,
                        newLibrary: lib.replacement?.name,
                        wrapWith: mapping.wrapWith,
                        conversion: {
                            type: 'function_call',
                            from: mapping.old,
                            to: mapping.new,
                            wrapWith: mapping.wrapWith,
                            automated: true
                        }
                    });
                }
            });
            
            // Also check for constant mappings (e.g., amPI → brmPI for AsMath → AsBrMath)
            if (lib.constantMappings && lib.constantMappings.length > 0) {
                lib.constantMappings.forEach(mapping => {
                    // Create regex pattern to match constants as standalone identifiers
                    // Use word boundary to avoid matching partial names
                    const pattern = new RegExp(`\\b${this.escapeRegex(mapping.old)}\\b`, 'gi');
                    let match;
                    
                    while ((match = pattern.exec(content)) !== null) {
                        this.addFinding({
                            type: 'deprecated_constant',
                            name: mapping.old,
                            severity: 'warning',
                            description: `Deprecated constant from ${lib.name}: ${mapping.old} → ${mapping.new}`,
                            replacement: { 
                                name: mapping.new, 
                                description: mapping.notes 
                            },
                            notes: `Constant ${mapping.old} is part of deprecated ${lib.name} library. Replace with ${mapping.new} from ${lib.replacement?.name || 'new library'}.`,
                            file: path,
                            line: this.getLineNumber(content, match.index),
                            context: this.getCodeContext(content, match.index),
                            original: match[0],
                            autoReplace: true,
                            parentLibrary: lib.name,
                            newLibrary: lib.replacement?.name,
                            conversion: {
                                type: 'constant',
                                from: mapping.old,
                                to: mapping.new,
                                automated: true
                            }
                        });
                    }
                });
            }
        });
    }

    /**
     * Scan for deprecated motion types (McAcpAx* → Mc* for AS6 migration)
     * These are type definitions used in variable declarations that need updating
     * when migrating from ACOPOS-specific types to generic McAxis types.
     */
    scanForDeprecatedMotionTypes(path, content) {
        // Get motion type mappings from the database
        const typeMappings = DeprecationDatabase.as6Format?.motionTypeMappings;
        if (!typeMappings || typeMappings.length === 0) {
            return;
        }
        
        typeMappings.forEach(mapping => {
            // Create regex pattern to match type names as standalone identifiers
            // Match patterns like: ": McAcpAxCamAutParType" or "OF McAcpAxCamAutParType"
            const pattern = new RegExp(`\\b${this.escapeRegex(mapping.old)}\\b`, 'gi');
            let match;
            
            while ((match = pattern.exec(content)) !== null) {
                this.addFinding({
                    type: 'deprecated_motion_type',
                    name: mapping.old,
                    severity: 'warning',
                    description: `Deprecated motion type: ${mapping.old} → ${mapping.new}`,
                    replacement: { 
                        name: mapping.new, 
                        description: mapping.notes 
                    },
                    notes: `McAcpAx type ${mapping.old} is replaced by ${mapping.new} in AS6 McAxis library. This is part of the ACP10_MC to mapp Axis migration.`,
                    file: path,
                    line: this.getLineNumber(content, match.index),
                    context: this.getCodeContext(content, match.index),
                    original: match[0],
                    autoReplace: true,
                    conversion: {
                        type: 'motion_type',
                        from: mapping.old,
                        to: mapping.new,
                        automated: true
                    }
                });
            }
        });
    }

    /**
     * Scan for deprecated enum values (AS4 → AS6 migration)
     * Some enum values were renamed in AS6 libraries
     */
    scanForDeprecatedEnumValues(path, content) {
        // Get enum mappings from the database
        const enumMappings = DeprecationDatabase.as6Format?.enumMappings;
        if (!enumMappings || enumMappings.length === 0) {
            return;
        }
        
        enumMappings.forEach(mapping => {
            // Create regex pattern to match enum values as standalone identifiers
            const pattern = new RegExp(`\\b${this.escapeRegex(mapping.old)}\\b`, 'gi');
            let match;
            
            while ((match = pattern.exec(content)) !== null) {
                this.addFinding({
                    type: 'deprecated_constant',
                    name: mapping.old,
                    severity: 'warning',
                    description: `Deprecated enum value: ${mapping.old} → ${mapping.new}`,
                    replacement: { 
                        name: mapping.new, 
                        description: mapping.notes 
                    },
                    notes: `Enum value ${mapping.old} is renamed to ${mapping.new} in AS6 ${mapping.library} library.`,
                    file: path,
                    line: this.getLineNumber(content, match.index),
                    context: this.getCodeContext(content, match.index),
                    original: match[0],
                    autoReplace: true,
                    parentLibrary: mapping.library,
                    conversion: {
                        type: 'constant',
                        from: mapping.old,
                        to: mapping.new,
                        automated: true
                    }
                });
            }
        });
    }

    /**
     * Scan for deprecated struct/FB member names (AS4 → AS6 migration)
     * Some struct/function block members were renamed in AS6 libraries
     * Uses pattern-based matching to only match variables that contain the FB type name
     * e.g., MpReportCore_0.Name, MpReportCore_Main.Name → .FileName
     */
    scanForDeprecatedMemberNames(path, content) {
        // Get member mappings from the database
        const memberMappings = DeprecationDatabase.as6Format?.memberMappings;
        if (!memberMappings || memberMappings.length === 0) {
            return;
        }
        
        memberMappings.forEach(mapping => {
            // Use the pattern from the mapping (e.g., "(MpReportCore\\w*)\\.Name\\b")
            // This ensures we only match variables that contain the FB type name
            const pattern = new RegExp(mapping.pattern, 'gi');
            let match;
            
            while ((match = pattern.exec(content)) !== null) {
                // match[0] = full match (e.g., "MpReportCore_0.Name")
                // match[1] = captured group (e.g., "MpReportCore_0")
                const varName = match[1];
                const fullMatch = match[0];
                
                this.addFinding({
                    type: 'deprecated_member_rename',
                    name: `${mapping.structType}.${mapping.old}`,
                    severity: 'warning',
                    description: `Member rename: ${varName}.${mapping.old} → ${varName}.${mapping.new}`,
                    replacement: { 
                        name: `${varName}.${mapping.new}`, 
                        description: mapping.notes 
                    },
                    notes: `In AS6, ${mapping.structType}.${mapping.old} was renamed to ${mapping.structType}.${mapping.new}.`,
                    file: path,
                    line: this.getLineNumber(content, match.index),
                    context: this.getCodeContext(content, match.index),
                    original: fullMatch,
                    autoReplace: true,
                    parentLibrary: mapping.library,
                    conversion: {
                        type: 'member_rename',
                        pattern: mapping.pattern,
                        replacement: mapping.replacement,
                        from: fullMatch,
                        to: fullMatch.replace(new RegExp(mapping.pattern, 'i'), mapping.replacement),
                        automated: true
                    }
                });
            }
        });
    }

    /**
     * Escape special regex characters in a string
     */
    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    analyzeXML(path, content) {
        // Check for hardware module references
        const modulePattern = /<Module\s+Name="([^"]+)"/gi;
        let match;
        
        while ((match = modulePattern.exec(content)) !== null) {
            const moduleName = match[1];
            const deprecation = DeprecationDatabase.findHardware(moduleName);
            
            if (deprecation) {
                this.addFinding({
                    type: 'hardware',
                    name: moduleName,
                    severity: deprecation.severity,
                    description: deprecation.description,
                    replacement: deprecation.replacement,
                    notes: deprecation.notes,
                    file: path,
                    line: this.getLineNumber(content, match.index),
                    context: this.getCodeContext(content, match.index),
                    original: match[0],
                    eol: deprecation.eol
                });
            }
        }
        
        // Check for hardware type references
        const typePattern = /Type="([^"]+)"/gi;
        while ((match = typePattern.exec(content)) !== null) {
            const typeName = match[1];
            if (DeprecationDatabase.isDeprecatedHardware(typeName)) {
                const deprecation = DeprecationDatabase.findHardware(typeName);
                if (deprecation && !this.hasFinding(typeName, path)) {
                    this.addFinding({
                        type: 'hardware',
                        name: typeName,
                        severity: deprecation.severity,
                        description: deprecation.description,
                        replacement: deprecation.replacement,
                        notes: deprecation.notes,
                        file: path,
                        line: this.getLineNumber(content, match.index),
                        context: this.getCodeContext(content, match.index),
                        original: match[0],
                        eol: deprecation.eol
                    });
                }
            }
        }
    }

    analyzeProjectFile(path, content) {
        // Detect AS version using the database helper
        const versionInfo = DeprecationDatabase.detectASVersion(content);
        
        if (versionInfo && versionInfo.major === 4) {
            // Add main version finding
            this.addFinding({
                type: 'project',
                name: 'AS4 Project File',
                severity: 'warning',
                description: `Project is AS version ${versionInfo.full} - requires conversion to AS6 format`,
                file: path,
                line: 1,
                context: content.substring(0, 200),
                original: content,
                notes: 'Project file structure will be converted to AS6 format with updated XML structure, namespace, and technology packages.',
                conversion: {
                    type: 'project_format',
                    automated: true
                }
            });
            
            // Analyze technology packages
            const packages = DeprecationDatabase.extractTechnologyPackages(content);
            packages.forEach(pkg => {
                const tpRef = DeprecationDatabase.as6Format.technologyPackages[pkg.name];
                if (tpRef) {
                    if (tpRef.replacedBy) {
                        this.addFinding({
                            type: 'technology_package',
                            name: pkg.name,
                            severity: 'warning',
                            description: `Technology package ${pkg.name} v${pkg.version} replaced in AS6`,
                            file: path,
                            replacement: { name: tpRef.replacedBy, description: `Use ${tpRef.replacedBy} in AS6` },
                            notes: `${pkg.name} has been replaced by ${tpRef.replacedBy} in AS6.`,
                            original: `<${pkg.name} Version="${pkg.version}" />`
                        });
                    } else if (tpRef.as6Version && pkg.version !== tpRef.as6Version) {
                        this.addFinding({
                            type: 'technology_package',
                            name: pkg.name,
                            severity: 'info',
                            description: `Technology package ${pkg.name} version update: ${pkg.version} → ${tpRef.as6Version}`,
                            file: path,
                            replacement: { name: pkg.name, description: `Update to version ${tpRef.as6Version}` },
                            notes: `Version will be updated from ${pkg.version} to ${tpRef.as6Version}.`,
                            original: `<${pkg.name} Version="${pkg.version}" />`
                        });
                    }
                }
            });
            
            // Check for missing AS6-only packages
            Object.entries(DeprecationDatabase.as6Format.technologyPackages).forEach(([name, ref]) => {
                if (ref.newInAS6) {
                    this.addFinding({
                        type: 'technology_package',
                        name: name,
                        severity: 'info',
                        description: `New AS6 technology package: ${name} v${ref.as6Version}`,
                        file: path,
                        notes: `${name} is a new package in AS6 that may be added based on project requirements.`,
                        original: 'N/A - New package'
                    });
                }
            });
            
            // Check IEC settings format (nested vs attributes)
            if (content.includes('<IECExtendedSettings>') || content.includes('<Pointers>')) {
                this.addFinding({
                    type: 'project',
                    name: 'IEC Settings Format',
                    severity: 'info',
                    description: 'IEC settings use AS4 nested element format',
                    file: path,
                    notes: 'AS6 uses attribute format for IEC settings. Will be converted automatically.',
                    original: content.match(/<IECExtendedSettings>[\s\S]*?<\/IECExtendedSettings>/)?.[0] || ''
                });
            }
            
            // Check for missing XML namespace
            if (!content.includes('xmlns="http://br-automation.co.at/AS/Project"')) {
                this.addFinding({
                    type: 'project',
                    name: 'Missing XML Namespace',
                    severity: 'info',
                    description: 'AS6 requires XML namespace declaration',
                    file: path,
                    notes: 'AS6 Project element requires xmlns="http://br-automation.co.at/AS/Project"',
                    original: ''
                });
            }
        } else if (versionInfo && versionInfo.major === 6) {
            // Already AS6 - mark as compatible
            this.addFinding({
                type: 'project',
                name: 'AS6 Project',
                severity: 'info',
                description: `Project is already AS6 format (${versionInfo.full})`,
                file: path,
                line: 1,
                notes: 'No project file conversion needed.',
                original: ''
            });
        }
        
        // Also check for library and hardware references in XML
        this.analyzeXML(path, content);
    }

    // ==========================================
    // PACKAGE FILE ANALYSIS (.pkg)
    // ==========================================
    
    analyzePackageFile(path, content) {
        // Check for GCC compiler version in Cpu.pkg files
        const gccMatch = content.match(/GccVersion="([^"]+)"/);
        if (gccMatch) {
            const gccVersion = gccMatch[1];
            const as6GccVersion = DeprecationDatabase.as6Format.compiler.as6.gcc;
            if (gccVersion !== as6GccVersion) {
                this.addFinding({
                    type: 'compiler',
                    name: 'GCC Compiler Version',
                    severity: 'warning',
                    description: `GCC compiler version: ${gccVersion} → ${as6GccVersion}`,
                    file: path,
                    line: this.getLineNumber(content, gccMatch.index),
                    replacement: { name: `GCC ${as6GccVersion}`, description: 'Update to AS6 GCC compiler' },
                    notes: `GCC version must be updated from ${gccVersion} to ${as6GccVersion} for AS6 compatibility.`,
                    original: gccMatch[0],
                    conversion: {
                        type: 'gcc_version',
                        from: gccVersion,
                        to: as6GccVersion,
                        automated: true
                    }
                });
            }
        }
        
        // Check for Automation Runtime version
        const arMatch = content.match(/AutomationRuntime\s+Version="([^"]+)"/);
        if (arMatch) {
            const arVersion = arMatch[1];
            const as6ArVersion = DeprecationDatabase.as6Format.automationRuntime.as6.version;
            
            // Validate minimum AR version for AS6 migration
            const arValidation = DeprecationDatabase.validateARVersionForAS6(arVersion);
            
            if (!arValidation.valid) {
                // AR version too old - this is a blocking issue
                this.hasBlockingErrors = true;
                this.addFinding({
                    type: 'runtime',
                    name: 'AR Version BLOCKING',
                    severity: 'error',
                    blocking: true,
                    description: `AR ${arVersion} is below minimum ${arValidation.minimumDisplay} required for AS6`,
                    file: path,
                    line: this.getLineNumber(content, arMatch.index),
                    notes: arValidation.message,
                    original: arMatch[0],
                    conversion: {
                        type: 'ar_version_blocking',
                        from: arVersion,
                        to: null,
                        automated: false,
                        blocking: true
                    }
                });
            } else {
                // AR version OK - just needs upgrade to AS6 version
                this.addFinding({
                    type: 'runtime',
                    name: 'Automation Runtime',
                    severity: 'warning',
                    description: `Automation Runtime: ${arVersion} → ${as6ArVersion}`,
                    file: path,
                    line: this.getLineNumber(content, arMatch.index),
                    replacement: { name: `AR ${as6ArVersion}`, description: 'Update to AS6 Automation Runtime' },
                    notes: `Automation Runtime must be updated from ${arVersion} to ${as6ArVersion} for AS6.`,
                    original: arMatch[0],
                    conversion: {
                        type: 'ar_version',
                        from: arVersion,
                        to: as6ArVersion,
                        automated: true
                    }
                });
            }
        }
        
        // Check package file version
        const versionMatch = content.match(/<\?AutomationStudio\s+FileVersion="([^"]+)"/);
        if (versionMatch) {
            const fileVersion = versionMatch[1];
            if (fileVersion.startsWith('4.')) {
                this.addFinding({
                    type: 'package',
                    name: 'Package File Version',
                    severity: 'info',
                    description: `Package uses AS4 FileVersion: ${fileVersion}`,
                    file: path,
                    notes: 'Package file version indicates AS4 format. May need updating for AS6.',
                    original: versionMatch[0]
                });
            }
        }
        
        // Extract all Object references from package
        const objectPattern = /<Object\s+([^>]*)>([^<]*)<\/Object>/gi;
        let match;
        const packageObjects = [];
        
        while ((match = objectPattern.exec(content)) !== null) {
            const attrs = match[1];
            const objectName = match[2].trim();
            const typeMatch = attrs.match(/Type="([^"]+)"/);
            const langMatch = attrs.match(/Language="([^"]+)"/);
            const descMatch = attrs.match(/Description="([^"]+)"/);
            
            packageObjects.push({
                name: objectName,
                type: typeMatch ? typeMatch[1] : 'Unknown',
                language: langMatch ? langMatch[1] : null,
                description: descMatch ? descMatch[1] : null,
                raw: match[0]
            });
        }
        
        // Store package objects for reference validation
        if (packageObjects.length > 0) {
            this.packageReferences = this.packageReferences || new Map();
            this.packageReferences.set(path, packageObjects);
        }
        
        // Check for deprecated library references
        packageObjects.forEach(obj => {
            if (obj.type === 'Library') {
                const deprecation = DeprecationDatabase.findLibrary(obj.name);
                if (deprecation) {
                    this.addFinding({
                        type: 'library',
                        name: obj.name,
                        severity: deprecation.severity,
                        description: `Library reference in package: ${deprecation.description}`,
                        replacement: deprecation.replacement,
                        notes: deprecation.notes,
                        file: path,
                        original: obj.raw,
                        autoReplace: deprecation.autoReplace
                    });
                }
            }
        });
        
        // Check for TMX file references
        const tmxRefs = packageObjects.filter(obj => obj.name.endsWith('.tmx'));
        tmxRefs.forEach(tmx => {
            this.addFinding({
                type: 'localization',
                name: tmx.name,
                severity: 'info',
                description: `Localization file referenced: ${tmx.name}`,
                file: path,
                notes: 'TMX localization file will be preserved in conversion.',
                original: tmx.raw
            });
        });
        
        // Also analyze as XML for other patterns
        this.analyzeXML(path, content);
    }

    // ==========================================
    // SOFTWARE/TASK CONFIGURATION ANALYSIS (.sw)
    // ==========================================
    
    analyzeSoftwareConfig(path, content) {
        // Extract task classes and tasks
        const taskClassPattern = /<TaskClass\s+Name="([^"]+)"[^>]*>/gi;
        const taskPattern = /<Task\s+([^>]+)\/>/gi;
        let match;
        
        const taskClasses = [];
        while ((match = taskClassPattern.exec(content)) !== null) {
            taskClasses.push(match[1]);
        }
        
        const tasks = [];
        while ((match = taskPattern.exec(content)) !== null) {
            const attrs = match[1];
            const nameMatch = attrs.match(/Name="([^"]+)"/);
            const sourceMatch = attrs.match(/Source="([^"]+)"/);
            const langMatch = attrs.match(/Language="([^"]+)"/);
            const memoryMatch = attrs.match(/Memory="([^"]+)"/);
            
            if (nameMatch && sourceMatch) {
                tasks.push({
                    name: nameMatch[1],
                    source: sourceMatch[1],
                    language: langMatch ? langMatch[1] : 'IEC',
                    memory: memoryMatch ? memoryMatch[1] : 'UserROM',
                    raw: match[0]
                });
            }
        }
        
        // Add finding for task configuration
        if (tasks.length > 0) {
            this.addFinding({
                type: 'task_config',
                name: 'Task Configuration',
                severity: 'info',
                description: `Found ${tasks.length} tasks in ${taskClasses.length} task classes`,
                file: path,
                notes: `Tasks: ${tasks.map(t => t.name).join(', ')}`,
                original: `Task Classes: ${taskClasses.join(', ')}`
            });
            
            // Store tasks for cross-reference validation
            this.taskDefinitions = this.taskDefinitions || [];
            tasks.forEach(t => this.taskDefinitions.push({ ...t, file: path }));
        }
        
        // Extract NC data objects
        const ncDataPattern = /<NcDataObject\s+([^>]+)\/>/gi;
        const ncObjects = [];
        
        while ((match = ncDataPattern.exec(content)) !== null) {
            const attrs = match[1];
            const nameMatch = attrs.match(/Name="([^"]+)"/);
            const sourceMatch = attrs.match(/Source="([^"]+)"/);
            const langMatch = attrs.match(/Language="([^"]+)"/);
            
            if (nameMatch && sourceMatch) {
                ncObjects.push({
                    name: nameMatch[1],
                    source: sourceMatch[1],
                    language: langMatch ? langMatch[1] : 'Ax',
                    raw: match[0]
                });
            }
        }
        
        if (ncObjects.length > 0) {
            this.addFinding({
                type: 'motion',
                name: 'NC Data Objects',
                severity: 'info',
                description: `Found ${ncObjects.length} axis/motion data objects`,
                file: path,
                notes: `Objects: ${ncObjects.map(n => n.name).join(', ')}`,
                original: ''
            });
            
            // Store NC objects for validation
            this.ncDataObjects = this.ncDataObjects || [];
            ncObjects.forEach(n => this.ncDataObjects.push({ ...n, file: path }));
        }
        
        // Extract library references
        const libraryPattern = /<LibraryObject\s+([^>]+)\/>/gi;
        const libraries = [];
        
        while ((match = libraryPattern.exec(content)) !== null) {
            const attrs = match[1];
            const nameMatch = attrs.match(/Name="([^"]+)"/);
            const sourceMatch = attrs.match(/Source="([^"]+)"/);
            
            if (nameMatch) {
                const libName = nameMatch[1];
                libraries.push(libName);
                
                // Check for deprecated libraries
                const deprecation = DeprecationDatabase.findLibrary(libName);
                if (deprecation) {
                    this.addFinding({
                        type: 'library',
                        name: libName,
                        severity: deprecation.severity,
                        description: `Library in task config: ${deprecation.description}`,
                        replacement: deprecation.replacement,
                        notes: deprecation.notes,
                        file: path,
                        original: match[0],
                        autoReplace: deprecation.autoReplace
                    });
                }
            }
        }
    }

    // ==========================================
    // MOTION/AXIS CONFIGURATION ANALYSIS
    // ==========================================
    
    analyzeMotionConfig(path, content, fileType) {
        const fileName = path.split(/[/\\]/).pop();
        
        switch (fileType) {
            case 'axis_init': // .ax files
                this.analyzeAxisInit(path, content, fileName);
                break;
            case 'axis_parameters': // .apt files
                this.analyzeAxisParameters(path, content, fileName);
                break;
            case 'nc_mapping': // .ncm files
                this.analyzeNCMapping(path, content, fileName);
                break;
            case 'nc_config': // .ncc files
                this.analyzeNCConfig(path, content, fileName);
                break;
        }
    }
    
    analyzeAxisInit(path, content, fileName) {
        // Parse axis init parameters
        const versionMatch = content.match(/<InitParameter\s+Version="([^"]+)"/);
        const ncSwMatch = content.match(/NcSwId="([^"]+)"/);
        
        const version = versionMatch ? versionMatch[1] : 'Unknown';
        const ncSw = ncSwMatch ? ncSwMatch[1] : 'ACP10';
        
        this.addFinding({
            type: 'motion',
            name: `Axis Init: ${fileName}`,
            severity: 'info',
            description: `Axis initialization parameters (${ncSw} v${version})`,
            file: path,
            notes: 'Axis init parameters should be reviewed for AS6 compatibility.',
            original: ''
        });
        
        // Check for deprecated parameter values
        if (content.includes('ncOLD_') || content.includes('ncDEPRECATED')) {
            this.addFinding({
                type: 'motion',
                name: `Deprecated Axis Parameters: ${fileName}`,
                severity: 'warning',
                description: 'Axis contains deprecated parameter values',
                file: path,
                notes: 'Review and update deprecated parameter values for AS6.',
                original: ''
            });
        }
    }
    
    analyzeAxisParameters(path, content, fileName) {
        // Parse ACOPOS parameter table
        const paramPattern = /<Parameter\s+Name="([^"]+)"[^>]*\/>/gi;
        let match;
        const params = [];
        
        while ((match = paramPattern.exec(content)) !== null) {
            params.push(match[1]);
        }
        
        this.addFinding({
            type: 'motion',
            name: `Axis Parameters: ${fileName}`,
            severity: 'info',
            description: `ACOPOS parameter table with ${params.length} parameters`,
            file: path,
            notes: `Parameters: ${params.slice(0, 5).join(', ')}${params.length > 5 ? '...' : ''}`,
            original: ''
        });
    }
    
    analyzeNCMapping(path, content, fileName) {
        // Parse NC axis mapping
        const ncSwMatch = content.match(/NcSwId="([^"]+)"/);
        const axisPattern = /<NcObject\s+([^>]+)\/>/gi;
        let match;
        const axes = [];
        
        while ((match = axisPattern.exec(content)) !== null) {
            const attrs = match[1];
            const nameMatch = attrs.match(/Name="([^"]+)"/);
            const typeMatch = attrs.match(/Type="([^"]+)"/);
            const initMatch = attrs.match(/InitParameter="([^"]+)"/);
            const paramMatch = attrs.match(/AcoposParameter="([^"]+)"/);
            
            if (nameMatch) {
                axes.push({
                    name: nameMatch[1],
                    type: typeMatch ? typeMatch[1] : 'Unknown',
                    initParam: initMatch ? initMatch[1] : null,
                    acoposParam: paramMatch ? paramMatch[1] : null
                });
            }
        }
        
        if (axes.length > 0) {
            this.addFinding({
                type: 'motion',
                name: `NC Axis Mapping: ${fileName}`,
                severity: 'info',
                description: `Found ${axes.length} axis mappings (${ncSwMatch ? ncSwMatch[1] : 'Acp10'})`,
                file: path,
                notes: `Axes: ${axes.map(a => a.name).join(', ')}`,
                original: ''
            });
            
            // Store axis mappings for cross-reference
            this.axisMappings = this.axisMappings || [];
            axes.forEach(a => this.axisMappings.push({ ...a, file: path }));
        }
    }
    
    analyzeNCConfig(path, content, fileName) {
        this.addFinding({
            type: 'motion',
            name: `NC Configuration: ${fileName}`,
            severity: 'info',
            description: 'NC system configuration file',
            file: path,
            notes: 'NC configuration will be preserved in conversion.',
            original: ''
        });
    }

    // ==========================================
    // LOCALIZATION FILE ANALYSIS (.tmx)
    // ==========================================
    
    analyzeLocalizationFile(path, content) {
        const fileName = path.split(/[/\\]/).pop();
        
        // Parse TMX header
        const toolMatch = content.match(/creationtool="([^"]+)"/);
        const versionMatch = content.match(/creationtoolversion="([^"]+)"/);
        const namespaceMatch = content.match(/<prop\s+type="x-BR-TS:Namespace">([^<]+)<\/prop>/);
        
        // Count translation units
        const tuCount = (content.match(/<tu\s/g) || []).length;
        
        // Count languages
        const languages = new Set();
        const langPattern = /xml:lang="([^"]+)"/g;
        let match;
        while ((match = langPattern.exec(content)) !== null) {
            languages.add(match[1]);
        }
        
        this.addFinding({
            type: 'localization',
            name: `TMX: ${fileName}`,
            severity: 'info',
            description: `Localization file with ${tuCount} entries in ${languages.size} languages`,
            file: path,
            notes: `Languages: ${Array.from(languages).join(', ')}${namespaceMatch ? `. Namespace: ${namespaceMatch[1]}` : ''}`,
            original: ''
        });
        
        // Store TMX info
        this.tmxFiles = this.tmxFiles || [];
        this.tmxFiles.push({
            path,
            name: fileName,
            namespace: namespaceMatch ? namespaceMatch[1] : null,
            entryCount: tuCount,
            languages: Array.from(languages)
        });
    }

    // ==========================================
    // VISUALIZATION ANALYSIS (VC3/VC4, mappView)
    // ==========================================
    
    analyzeVisualization(path, content) {
        const fileName = path.split(/[/\\]/).pop();
        
        // Check for VC3/VC4 usage using database helper
        const vcDetection = DeprecationDatabase.detectVisualComponents(content);
        
        if (vcDetection.hasVC3) {
            // VC3 is a BLOCKING error - project cannot be converted
            this.hasBlockingErrors = true;
            const vcConfig = DeprecationDatabase.as6Format.visualComponents.vc3;
            
            this.addFinding({
                type: 'visualization',
                name: `VC3 BLOCKING: ${fileName}`,
                severity: 'error',
                blocking: true,
                description: vcConfig.description,
                file: path,
                notes: `${vcConfig.notes} Detected markers: ${vcDetection.vc3Markers.join(', ')}`,
                original: vcDetection.vc3Markers.join(', '),
                migration: vcConfig.migration,
                conversion: {
                    type: 'vc3_blocking',
                    automated: false,
                    blocking: true
                }
            });
        }
        
        if (vcDetection.hasVC4) {
            const vcConfig = DeprecationDatabase.as6Format.visualComponents.vc4;
            
            this.addFinding({
                type: 'visualization',
                name: `VC4: ${fileName}`,
                severity: 'warning',
                description: vcConfig.description,
                file: path,
                notes: `${vcConfig.notes} Recommended stack size: ${vcConfig.stackSizeRecommendation} bytes.`,
                original: vcDetection.vc4Markers.join(', '),
                migration: vcConfig.migration
            });
        }
        
        // Check for mappView content (not blocking)
        if (content.includes('mappView') || content.includes('brease') || path.includes('mappView')) {
            this.addFinding({
                type: 'visualization',
                name: `mappView: ${fileName}`,
                severity: 'info',
                description: 'mappView visualization file',
                file: path,
                notes: 'mappView is fully supported in AS6. Verify widget library versions.',
                original: ''
            });
        }
    }

    // ==========================================
    // LIBRARY FILE ANALYSIS (.lby)
    // ==========================================
    
    analyzeLibraryFile(path, content) {
        // Extract library name from path (e.g., "Libraries/MpAlarmX/Binary.lby" -> "MpAlarmX")
        const pathParts = path.split(/[/\\]/);
        const fileName = pathParts.pop(); // Binary.lby or similar
        const libraryName = pathParts.pop(); // Library folder name
        
        // Parse library version from content
        const versionMatch = content.match(/<Library\s+[^>]*Version="([^"]+)"/);
        const version = versionMatch ? versionMatch[1] : null;
        
        // Skip if no version (e.g., custom user libraries without version)
        if (!version) return;
        
        // Check if this is an AS4 library that needs upgrading (any version < 6.0.0)
        // AS4 libraries can be 5.x, 1.x, 2.x, etc. - all need updating to AS6 versions
        const isAS4Version = version && !version.match(/^6\.\d+/);
        
        // Look up library in mapping database
        const mapping = DeprecationDatabase.as6Format.libraryMapping[libraryName];
        
        if (isAS4Version && mapping && mapping.techPackage) {
            // Technology package library - needs version update to AS6 version
            // The library stays in the project but with updated version numbers
            this.addFinding({
                type: 'library_version',
                name: libraryName,
                severity: 'warning',
                description: `Library version needs update from ${version} to ${mapping.as6Version}`,
                replacement: {
                    name: `${libraryName} ${mapping.as6Version}`,
                    description: `Update to AS6 version from ${mapping.techPackage} technology package`
                },
                notes: `This library is part of the ${mapping.techPackage} technology package. ` +
                       `Version will be updated from ${version} to ${mapping.as6Version}.`,
                file: path,
                original: version,
                conversion: {
                    libraryName: libraryName,
                    from: version,
                    to: mapping.as6Version,
                    techPackage: mapping.techPackage,
                    action: 'update_version', // Update version instead of remove
                    automated: true
                }
            });
        } else if (isAS4Version && mapping && mapping.source === 'Library_2') {
            // Library_2 source - check if it needs version update or is bundled
            if (mapping.as6LibVersion) {
                // Library_2 with specific AS6 version - needs version update (e.g., MTTypes, MTData)
                this.addFinding({
                    type: 'library_version',
                    name: libraryName,
                    severity: 'warning',
                    description: `Library version needs update from ${version} to ${mapping.as6LibVersion}`,
                    replacement: {
                        name: `${libraryName} ${mapping.as6LibVersion}`,
                        description: `Update to AS6 version`
                    },
                    notes: `This library requires an updated version for AS6 compatibility.`,
                    file: path,
                    original: version,
                    conversion: {
                        libraryName: libraryName,
                        from: version,
                        to: mapping.as6LibVersion,
                        source: mapping.source,
                        action: 'update_version',
                        automated: true
                    }
                });
            } else {
                // Core runtime library - bundled with Automation Runtime, no version update needed
                this.addFinding({
                    type: 'library_version',
                    name: libraryName,
                    severity: 'info',
                    description: `Library bundled with Automation Runtime`,
                    replacement: {
                        name: 'AR bundled',
                        description: 'Library is bundled with Automation Runtime'
                    },
                    notes: `This library is bundled with the Automation Runtime. No version update needed.`,
                    file: path,
                    original: version,
                    conversion: {
                        libraryName: libraryName,
                        from: version,
                        to: null,
                        source: mapping.source,
                        action: 'none',
                        automated: false
                    }
                });
            }
        } else if (isAS4Version && !mapping) {
            // Unknown AS4 library - might be user/custom library
            this.addFinding({
                type: 'library_version',
                name: libraryName,
                severity: 'info',
                description: `Custom library with version ${version}`,
                notes: 'This appears to be a custom/user library. Verify compatibility with AS6 GCC 11.3.0 compiler.',
                file: path,
                original: version
            });
        }
        
        // Store library info for cross-referencing with Cpu.sw
        this.libraryVersions = this.libraryVersions || new Map();
        this.libraryVersions.set(libraryName, {
            path,
            version,
            mapping,
            needsUpgrade: isAS4Version && mapping
        });
    }

    /**
     * Auto-apply project file conversion (.apj) from AS4 to AS6 format
     * This includes AS version, namespace, and technology package updates
     */
    autoApplyProjectFileConversion() {
        // Find the project file conversion finding
        const projectFinding = this.analysisResults.find(f => 
            f.type === 'project' && 
            f.name === 'AS4 Project File' && 
            f.conversion && 
            f.conversion.automated
        );
        
        if (!projectFinding) {
            console.log('No project file conversion needed or found');
            return;
        }
        
        console.log('Auto-applying project file conversion:', projectFinding.file);
        
        // Apply the conversion using the applyConversion method
        this.applyConversion(projectFinding.id);
        
        console.log('Project file conversion applied');
    }

    /**
     * Auto-apply library removals for technology package and Library_2 libraries
     * These libraries should be excluded from the converted project automatically
     */
    autoApplyLibraryVersionUpdates() {
        // Find all library_version findings that need version updates
        this.analysisResults.forEach(finding => {
            if (finding.type === 'library_version' && finding.conversion && finding.conversion.action === 'update_version') {
                const file = this.projectFiles.get(finding.file);
                if (!file) return;
                
                const oldVersion = finding.conversion.from;
                const newVersion = finding.conversion.to;
                
                console.log(`Updating library version: ${finding.conversion.libraryName} from ${oldVersion} to ${newVersion}`);
                
                let content = file.content;
                
                // Update the Library Version attribute
                content = content.replace(
                    /<Library\s+Version="[^"]+"/,
                    `<Library Version="${newVersion}"`
                );
                
                // Update all Dependency FromVersion attributes for this library's dependencies
                content = content.replace(
                    /(<Dependency[^>]*FromVersion=")[^"]+(")/g,
                    `$1${newVersion}$2`
                );
                
                // Update all Dependency ToVersion attributes
                content = content.replace(
                    /(<Dependency[^>]*ToVersion=")[^"]+(")/g,
                    `$1${newVersion}$2`
                );
                
                file.content = content;
                
                // Mark as auto-applied
                finding.status = 'applied';
                finding.notes = (finding.notes || '') + ` [Auto-applied: Version updated to ${newVersion}]`;
            }
        });
        
        console.log('Library version updates completed');
    }

    autoApplyFunctionReplacements() {
        console.log('Auto-applying function replacements...');
        
        // Get all function patterns with autoReplace: true
        const autoReplaceFunctions = DeprecationDatabase.functions.filter(f => f.autoReplace === true);
        
        if (autoReplaceFunctions.length === 0) {
            console.log('No auto-replace function patterns found');
            return;
        }
        
        console.log(`Found ${autoReplaceFunctions.length} auto-replace function patterns`);
        
        // Process each file that might contain these functions
        this.projectFiles.forEach((file, filePath) => {
            // Skip binary files
            if (file.isBinary) {
                return;
            }
            
            // Only process IEC 61131-3 Structured Text source files
            // Note: Do NOT include .c, .cpp, .h files - the function mappings are for ST only
            const ext = filePath.toLowerCase().split('.').pop();
            if (!['st', 'var', 'typ', 'fun', 'prg'].includes(ext)) {
                return;
            }
            
            let content = file.content;
            let modified = false;
            
            autoReplaceFunctions.forEach(funcPattern => {
                if (!funcPattern.replacement || !funcPattern.replacement.name) {
                    return;
                }
                
                const oldFunc = funcPattern.name;
                const newFunc = funcPattern.replacement.name;
                
                // Create a pattern to match the function call
                const pattern = new RegExp('\\b' + oldFunc + '\\s*\\(', 'gi');
                
                if (pattern.test(content)) {
                    console.log(`Replacing ${oldFunc} with ${newFunc} in ${filePath}`);
                    
                    // Replace the function name (preserving the opening parenthesis)
                    content = content.replace(pattern, newFunc + '(');
                    modified = true;
                    
                    // Mark existing findings for this function/file as applied
                    this.analysisResults.forEach(finding => {
                        if (finding.type === 'function' && 
                            finding.name === oldFunc && 
                            finding.file === filePath &&
                            finding.status !== 'applied') {
                            finding.status = 'applied';
                            finding.autoFixed = true;
                            finding.notes = (finding.notes || '') + ` [Auto-applied: ${oldFunc} → ${newFunc}]`;
                        }
                    });
                }
            });
            
            if (modified) {
                file.content = content;
            }
        });
        
        console.log('Function replacements completed');
    }

    /**
     * Auto-apply deprecated library function and constant replacements
     * Handles: AsString → AsBrStr, AsMath → AsBrMath function/constant renames
     * This processes the deprecated_function_call and deprecated_constant findings
     */
    autoApplyDeprecatedLibraryReplacements() {
        console.log('Auto-applying deprecated library function and constant replacements...');
        
        // Get all libraries with function mappings or constant mappings
        const librariesWithMappings = DeprecationDatabase.libraries.filter(
            lib => lib.autoReplace && (
                (lib.functionMappings && lib.functionMappings.length > 0) ||
                (lib.constantMappings && lib.constantMappings.length > 0)
            )
        );
        
        if (librariesWithMappings.length === 0) {
            console.log('No libraries with function/constant mappings found');
            return;
        }
        
        console.log(`Found ${librariesWithMappings.length} libraries with mappings to process`);
        
        // Process each source file
        this.projectFiles.forEach((file, filePath) => {
            // Skip binary files
            if (file.isBinary) return;
            
            // Only process IEC 61131-3 Structured Text source files
            // Note: Do NOT include .c, .cpp, .h files - the function/constant mappings are for ST only
            const ext = filePath.toLowerCase().split('.').pop();
            if (!['st', 'var', 'typ', 'fun', 'prg'].includes(ext)) return;
            
            let content = file.content;
            let modified = false;
            let replacementCount = 0;
            
            librariesWithMappings.forEach(lib => {
                // Process function mappings
                if (lib.functionMappings) {
                    lib.functionMappings.forEach(mapping => {
                        const escapedOld = mapping.old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        
                        if (mapping.wrapWith) {
                            // For functions that need type conversion wrapping (e.g., strlen → UDINT_TO_UINT(brsstrlen(...)))
                            // We need to find the entire function call and wrap it
                            const funcCallPattern = new RegExp(`\\b${escapedOld}\\s*\\(`, 'g');
                            let match;
                            let newContent = content;
                            let offset = 0;
                            
                            // Reset lastIndex for the pattern
                            funcCallPattern.lastIndex = 0;
                            
                            while ((match = funcCallPattern.exec(content)) !== null) {
                                const startIndex = match.index;
                                const openParenIndex = content.indexOf('(', startIndex);
                                
                                // Find the matching closing parenthesis
                                let depth = 1;
                                let endIndex = openParenIndex + 1;
                                while (depth > 0 && endIndex < content.length) {
                                    if (content[endIndex] === '(') depth++;
                                    else if (content[endIndex] === ')') depth--;
                                    endIndex++;
                                }
                                
                                if (depth === 0) {
                                    // Extract the original function call
                                    const originalCall = content.substring(startIndex, endIndex);
                                    // Create the wrapped replacement
                                    const newFuncCall = originalCall.replace(new RegExp(`^${escapedOld}`), mapping.new);
                                    const wrappedCall = `${mapping.wrapWith}(${newFuncCall})`;
                                    
                                    // Apply replacement with offset adjustment
                                    newContent = newContent.substring(0, startIndex + offset) + wrappedCall + newContent.substring(endIndex + offset);
                                    offset += wrappedCall.length - originalCall.length;
                                    
                                    modified = true;
                                    replacementCount++;
                                }
                            }
                            content = newContent;
                        } else {
                            // Simple function name replacement (no wrapping needed)
                            const pattern = new RegExp(`\\b${escapedOld}\\s*\\(`, 'g');
                            
                            if (pattern.test(content)) {
                                content = content.replace(pattern, `${mapping.new}(`);
                                modified = true;
                                replacementCount++;
                            }
                        }
                    });
                }
                
                // Process constant mappings
                if (lib.constantMappings) {
                    lib.constantMappings.forEach(mapping => {
                        const escapedOld = mapping.old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const pattern = new RegExp(`\\b${escapedOld}\\b`, 'g');
                        
                        if (pattern.test(content)) {
                            content = content.replace(pattern, mapping.new);
                            modified = true;
                            replacementCount++;
                        }
                    });
                }
            });
            
            if (modified) {
                file.content = content;
                console.log(`Applied ${replacementCount} function/constant replacements in ${filePath}`);
            }
        });
        
        // Also apply to any deprecated_function_call or deprecated_constant findings that exist
        this.analysisResults.forEach(finding => {
            if ((finding.type === 'deprecated_function_call' || finding.type === 'deprecated_constant') 
                && finding.autoReplace && finding.status !== 'applied') {
                finding.status = 'applied';
                finding.autoFixed = true;
                finding.notes = (finding.notes || '') + ' [Auto-applied]';
            }
        });
        
        // Also apply library reference replacements in Package.pkg and .sw files
        // Find libraries with autoReplace that need to be renamed
        const librariesWithReplacement = DeprecationDatabase.libraries.filter(
            lib => lib.autoReplace && lib.replacement && lib.replacement.name
        );
        
        if (librariesWithReplacement.length > 0) {
            console.log(`Processing ${librariesWithReplacement.length} library reference replacements...`);
            
            this.projectFiles.forEach((file, filePath) => {
                if (file.isBinary) return;
                
                const filePathLower = filePath.toLowerCase();
                const isPackagePkg = filePathLower.endsWith('package.pkg');
                const isSwFile = filePathLower.endsWith('.sw');
                
                if (!isPackagePkg && !isSwFile) return;
                
                let content = file.content;
                let modified = false;
                
                librariesWithReplacement.forEach(lib => {
                    const oldLib = lib.name;
                    const newLib = lib.replacement.name;
                    
                    if (isPackagePkg) {
                        // For Package.pkg: <Object Type="Library">LibName</Object>
                        // IMPORTANT: Only match Type="Library", not Type="Package" or Type="File"
                        // Check if replacement already exists to avoid duplicates
                        const newLibPattern = new RegExp(`<Object\\s+Type="Library"[^>]*>\\s*${newLib}\\s*<\\/Object>`, 'i');
                        const oldLibPattern = new RegExp(`<Object\\s+Type="Library"[^>]*>\\s*${oldLib}\\s*<\\/Object>`, 'i');
                        
                        if (oldLibPattern.test(content)) {
                            if (newLibPattern.test(content)) {
                                // Replacement exists - remove old library entry
                                const removePattern = new RegExp(`\\s*<Object\\s+Type="Library"[^>]*>\\s*${oldLib}\\s*<\\/Object>\\s*\\n?`, 'gi');
                                content = content.replace(removePattern, '');
                                console.log(`Removed duplicate library '${oldLib}' from ${filePath} (replacement '${newLib}' already exists)`);
                            } else {
                                // Rename old library to new
                                content = content.replace(oldLibPattern, `<Object Type="Library">${newLib}</Object>`);
                                console.log(`Replaced library '${oldLib}' with '${newLib}' in ${filePath}`);
                            }
                            modified = true;
                        }
                    } else if (isSwFile) {
                        // For .sw files: <LibraryObject Name="LibName" ... />
                        const newLibPattern = new RegExp(`<LibraryObject\\s+[^>]*Name="${newLib}"`, 'i');
                        const oldLibPattern = new RegExp(`(<LibraryObject\\s+[^>]*Name=")${oldLib}(")`, 'gi');
                        
                        if (oldLibPattern.test(content)) {
                            if (newLibPattern.test(content)) {
                                // Replacement exists - remove old library entry
                                const removePattern = new RegExp(`\\s*<LibraryObject\\s+[^>]*Name="${oldLib}"[^>]*\\/>\\s*\\n?`, 'gi');
                                content = content.replace(removePattern, '');
                                console.log(`Removed duplicate library '${oldLib}' from ${filePath} (replacement '${newLib}' already exists)`);
                            } else {
                                // Rename old library to new
                                content = content.replace(oldLibPattern, `$1${newLib}$2`);
                                console.log(`Replaced library '${oldLib}' with '${newLib}' in ${filePath}`);
                            }
                            modified = true;
                        }
                    }
                });
                
                if (modified) {
                    file.content = content;
                }
            });
        }
        
        // Also remove deprecated libraries that have no replacement (e.g., AsSafety)
        const librariesToRemove = DeprecationDatabase.libraries.filter(
            lib => lib.replacement === null && (lib.severity === 'warning' || lib.severity === 'error')
        );
        
        if (librariesToRemove.length > 0) {
            console.log(`Processing ${librariesToRemove.length} deprecated libraries to remove (no replacement)...`);
            
            this.projectFiles.forEach((file, filePath) => {
                if (file.isBinary) return;
                
                const filePathLower = filePath.toLowerCase();
                const isPackagePkg = filePathLower.endsWith('package.pkg');
                const isSwFile = filePathLower.endsWith('.sw');
                
                if (!isPackagePkg && !isSwFile) return;
                
                let content = file.content;
                let modified = false;
                
                librariesToRemove.forEach(lib => {
                    const libName = lib.name;
                    
                    if (isPackagePkg) {
                        // For Package.pkg: <Object Type="Library">LibName</Object>
                        // IMPORTANT: Only match Type="Library", not Type="Package" or Type="File"
                        const libPattern = new RegExp(`<Object\\s+Type="Library"[^>]*>\\s*${libName}\\s*<\\/Object>`, 'i');
                        
                        if (libPattern.test(content)) {
                            const removePattern = new RegExp(`\\s*<Object\\s+Type="Library"[^>]*>\\s*${libName}\\s*<\\/Object>\\s*\\n?`, 'gi');
                            content = content.replace(removePattern, '');
                            console.log(`Removed deprecated library '${libName}' from ${filePath} (no AS6 replacement available)`);
                            modified = true;
                        }
                    } else if (isSwFile) {
                        // For .sw files: <LibraryObject Name="LibName" ... />
                        const libPattern = new RegExp(`<LibraryObject\\s+[^>]*Name="${libName}"`, 'i');
                        
                        if (libPattern.test(content)) {
                            const removePattern = new RegExp(`\\s*<LibraryObject\\s+[^>]*Name="${libName}"[^>]*\\/>\\s*\\n?`, 'gi');
                            content = content.replace(removePattern, '');
                            console.log(`Removed deprecated library '${libName}' from ${filePath} (no AS6 replacement available)`);
                            modified = true;
                        }
                    }
                });
                
                if (modified) {
                    file.content = content;
                }
            });
        }
        
        // Mark library findings as applied
        this.analysisResults.forEach(finding => {
            if (finding.type === 'library' && finding.autoReplace && finding.replacement && finding.status !== 'applied') {
                finding.status = 'applied';
                finding.notes = (finding.notes || '') + ' [Auto-applied]';
            }
        });
        
        console.log('Deprecated library replacements completed');
    }

    /**
     * Auto-apply motion type replacements for AS4 McAcpAx → AS6 McAxis migration
     * Replaces ACOPOS-specific types (McAcpAx*) with generic McAxis types (Mc*)
     * Reference: AS6 Help - "Migrating from ACP10_MC to mapp Axis"
     */
    autoApplyMotionTypeReplacements() {
        console.log('Auto-applying motion type replacements (McAcpAx* → Mc*)...');
        
        // Get motion type mappings from the database
        const typeMappings = DeprecationDatabase.as6Format?.motionTypeMappings;
        if (!typeMappings || typeMappings.length === 0) {
            console.log('No motion type mappings found');
            return;
        }
        
        console.log(`Found ${typeMappings.length} motion type mappings to process`);
        
        // Process each source file
        this.projectFiles.forEach((file, filePath) => {
            // Skip binary files
            if (file.isBinary) return;
            
            // Only process IEC 61131-3 Structured Text source files
            // Note: Type definitions appear in .typ, .var, .st, .fun, .prg files
            const ext = filePath.toLowerCase().split('.').pop();
            if (!['st', 'var', 'typ', 'fun', 'prg'].includes(ext)) return;
            
            let content = file.content;
            let modified = false;
            let replacementCount = 0;
            
            typeMappings.forEach(mapping => {
                const escapedOld = mapping.old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const pattern = new RegExp(`\\b${escapedOld}\\b`, 'g');
                
                if (pattern.test(content)) {
                    content = content.replace(pattern, mapping.new);
                    modified = true;
                    replacementCount++;
                    console.log(`Replaced ${mapping.old} → ${mapping.new} in ${filePath}`);
                }
            });
            
            if (modified) {
                file.content = content;
                console.log(`Applied ${replacementCount} motion type replacements in ${filePath}`);
            }
        });
        
        // Mark motion type findings as applied
        this.analysisResults.forEach(finding => {
            if (finding.type === 'deprecated_motion_type' && finding.autoReplace && finding.status !== 'applied') {
                finding.status = 'applied';
                finding.autoFixed = true;
                finding.notes = (finding.notes || '') + ' [Auto-applied]';
            }
        });
        
        console.log('Motion type replacements completed');
    }

    /**
     * Convert OPC UA configuration from AS4 (OpcUA) to AS6 (OpcUaCs) format
     * Changes:
     * - Rename OpcUA folder to OpcUaCs
     * - Update Package.pkg: SubType and PackageType from OpcUA to OpcUaCs
     * - Add UaCsConfig.uacfg and UaDvConfig.uadcfg config files
     * - Update .uad file: XML PI FileVersion 4.9 → 6.0, OpcUaSource FileVersion 9 → 10
     * - Update ACL Access values: 0x005F → 0x10A1, 0x007F → 0x10E1
     * - Remove RoleId attributes from ACE elements
     * - Replace AutomaticEnable/EnableArrayElements with RecursiveEnable
     */
    autoApplyUadFileConversion() {
        console.log('Converting OPC UA configuration to AS6 OpcUaCs format...');
        
        // Find all OpcUA folders and their files
        const opcuaFolders = new Map(); // folderPath -> files[]
        
        this.projectFiles.forEach((file, path) => {
            // Match paths like .../Connectivity/OpcUA/... (case-insensitive)
            const opcuaMatch = path.match(/^(.+[\/\\]Connectivity[\/\\])OpcUA([\/\\].*)$/i);
            if (opcuaMatch) {
                const folderBase = opcuaMatch[1];
                if (!opcuaFolders.has(folderBase)) {
                    opcuaFolders.set(folderBase, []);
                }
                opcuaFolders.get(folderBase).push({
                    originalPath: path,
                    relativePath: opcuaMatch[2],
                    file: file
                });
            }
        });
        
        if (opcuaFolders.size === 0) {
            console.log('No OpcUA folders found to convert');
            return;
        }
        
        console.log(`Found ${opcuaFolders.size} OpcUA folder(s) to convert to OpcUaCs`);
        
        // Process each OpcUA folder
        opcuaFolders.forEach((files, folderBase) => {
            const opcuaPath = folderBase + 'OpcUA';
            const opcuaCsPath = folderBase + 'OpcUaCs';
            
            console.log(`Converting: ${opcuaPath} -> ${opcuaCsPath}`);
            
            // Track what we've done for reporting
            const changes = [];
            
            // Process and move each file
            files.forEach(({ originalPath, relativePath, file }) => {
                const newPath = opcuaCsPath + relativePath;
                
                // Delete from old location
                this.projectFiles.delete(originalPath);
                
                // Process file content based on type
                if (typeof file.content === 'string') {
                    const fileName = relativePath.split(/[\/\\]/).pop().toLowerCase();
                    
                    if (fileName === 'package.pkg') {
                        // Update Package.pkg - change SubType and PackageType, add config files
                        file.content = file.content
                            .replace(/SubType="OpcUA"/gi, 'SubType="OpcUaCs"')
                            .replace(/PackageType="OpcUA"/gi, 'PackageType="OpcUaCs"')
                            .replace(
                                /(<Objects>)/,
                                '$1\n    <Object Type="File">UaCsConfig.uacfg</Object>\n    <Object Type="File">UaDvConfig.uadcfg</Object>'
                            );
                        changes.push('Package.pkg updated with OpcUaCs type and config files');
                    }
                    else if (fileName.endsWith('.uad')) {
                        // Update UAD file to FileVersion 10 format
                        file.content = this.convertUadToVersion10(file.content);
                        changes.push('UAD file converted to FileVersion 10');
                    }
                }
                
                // Add to new location
                this.projectFiles.set(newPath, file);
            });
            
            // Create UaCsConfig.uacfg
            const uaCsConfigPath = opcuaCsPath + '/UaCsConfig.uacfg';
            this.projectFiles.set(uaCsConfigPath, {
                content: this.getUaCsConfigTemplate(),
                isBinary: false,
                type: 'xml'
            });
            changes.push('Created UaCsConfig.uacfg');
            
            // Create UaDvConfig.uadcfg with roles from Role.role file
            const uaDvConfigPath = opcuaCsPath + '/UaDvConfig.uadcfg';
            const roles = this.extractRolesFromProject();
            this.projectFiles.set(uaDvConfigPath, {
                content: this.getUaDvConfigTemplateWithRoles(roles),
                isBinary: false,
                type: 'xml'
            });
            changes.push(`Created UaDvConfig.uadcfg with ${roles.length} roles`);
            
            // Update parent Connectivity Package.pkg to reference OpcUaCs instead of OpcUA
            const connectivityPkgPath = folderBase + 'Package.pkg';
            const parentPkg = this.projectFiles.get(connectivityPkgPath);
            if (parentPkg && typeof parentPkg.content === 'string') {
                // Replace reference to OpcUA folder with OpcUaCs (only if not already OpcUaCs)
                parentPkg.content = parentPkg.content
                    .replace(/>OpcUA<(?!Cs)/g, '>OpcUaCs<')
                    .replace(/Type="Package">OpcUA(?!Cs)/gi, 'Type="Package">OpcUaCs');
                changes.push('Updated Connectivity Package.pkg reference to OpcUaCs');
            }
            
            // Add to analysis results
            this.analysisResults.push({
                severity: 'info',
                category: 'opcua',
                name: 'OPC UA Converted to OpcUaCs',
                description: `OpcUA folder renamed to OpcUaCs with AS6 format updates`,
                file: opcuaCsPath,
                autoFixed: true,
                details: changes
            });
        });
        
        console.log('OPC UA to OpcUaCs conversion completed');
    }
    
    /**
     * Convert UAD file content from FileVersion 7/9 to FileVersion 10
     */
    convertUadToVersion10(content) {
        let result = content
            // Update XML processing instruction FileVersion to 6.0
            .replace(/<\?AutomationStudio\s+FileVersion="[^"]*"\s*\?>/g, '<?AutomationStudio FileVersion="6.0"?>')
            // Update OpcUaSource FileVersion to 10
            .replace(/(<OpcUaSource\s+)FileVersion="[^"]*"/g, '$1FileVersion="10"')
            // Update ACL Access values
            .replace(/Access="0x005F"/gi, 'Access="0x10A1"')
            .replace(/Access="0x007F"/gi, 'Access="0x10E1"')
            // Remove RoleId attribute from ACE elements (keep RoleName)
            .replace(/(<ACE\s+)RoleId=["'][^"']*["']\s+(RoleName=)/g, '$1$2')
            .replace(/(<ACE\s+RoleName=["'][^"']*["']\s+)RoleId=["'][^"']*["']\s*/g, '$1')
            // Replace AutomaticEnable="True" with RecursiveEnable="1"
            .replace(/AutomaticEnable=["']True["']/gi, 'RecursiveEnable="1"')
            // Replace EnableArrayElements="True" with RecursiveEnable="1"
            .replace(/EnableArrayElements=["']True["']/gi, 'RecursiveEnable="1"');
        
        // Remove <DefaultView> wrapper (AS6 uses direct <Module> elements instead)
        // The DefaultView element was used in AS4 but is removed in AS6 FileVersion 10
        result = result.replace(/<DefaultView[^>]*>\s*/g, '');
        result = result.replace(/<\/DefaultView>\s*/g, '');
        
        return result;
    }
    
    /**
     * Get UaCsConfig.uacfg template content for AS6 OpcUaCs
     */
    getUaCsConfigTemplate() {
        return `<?xml version="1.0" encoding="utf-8"?>
<?AutomationStudio FileVersion="4.9"?>
<Configuration>
  <Element ID="ClientServerConfiguration" Type="uacfg">
    <Property ID="OpcUaCs" Value="1" />
    <Group ID="Network">
      <Property ID="TcpPort" Value="4840" />
      <Group ID="Discovery">
        <Property ID="RegisterAtServer" Value="0" />
        <Property ID="ServerUrl" Value="opc.tcp://" />
        <Property ID="RegistrationInterval" Value="600" />
      </Group>
    </Group>
    <Group ID="Facets">
      <Property ID="AuditingServerFacet" Value="0" />
    </Group>
    <Group ID="Security">
      <Group ID="MessageSecurity">
        <Group ID="SecurityPolicies">
          <Property ID="None" Value="1" />
          <Property ID="Basic128Rsa15" Value="0" />
          <Property ID="Basic256" Value="0" />
          <Property ID="Aes128Sha256RsaOaep" Value="1" />
          <Property ID="Basic256Sha256" Value="1" />
        </Group>
        <Group ID="Modes">
          <Property ID="Sign" Value="0" />
          <Property ID="SignAndEncrypt" Value="1" />
        </Group>
      </Group>
      <Group ID="Authentication">
        <Group ID="SecurityPolicies">
          <Property ID="Basic128Rsa15" Value="0" />
          <Property ID="Basic256" Value="0" />
          <Property ID="Aes128Sha256RsaOaep" Value="1" />
          <Property ID="Basic256Sha256" Value="1" />
        </Group>
        <Group ID="UserIdentityTokens">
          <Property ID="AnonymousIdentityToken" Value="1" />
          <Property ID="UserNameIdentityToken" Value="1" />
          <Property ID="X509IdentityToken" Value="0" />
        </Group>
      </Group>
      <Group ID="Authorization">
        <Group ID="AnonymousAccess">
          <Property ID="DefaultRole0" Value="BR_Anonymous" />
        </Group>
      </Group>
      <Property ID="AppCertificateTrustListValidation" Value="1" />
    </Group>
    <Group ID="Limits">
      <Group ID="General">
        <Property ID="MaxSecureChannels" Value="100" />
        <Property ID="MaxReferencesToReturn" Value="10000" />
        <Property ID="MaxTranslateResults" Value="10000" />
      </Group>
      <Group ID="Operation">
        <Property ID="MaxNodesPerRead" Value="65535" />
        <Property ID="MaxNodesPerWrite" Value="65535" />
        <Property ID="MaxNodesPerBrowse" Value="65535" />
        <Property ID="MaxNodesPerTranslateBrowsePathsToNodeIds" Value="65535" />
        <Property ID="MaxNodesPerRegisterNodes" Value="65535" />
        <Property ID="MaxNodesPerMethodCall" Value="65535" />
        <Property ID="MaxMonitoredItemsPerCall" Value="65535" />
        <Property ID="MaxNodesPerHistoryReadData" Value="65535" />
        <Property ID="MaxNodesPerHistoryReadEvents" Value="65535" />
      </Group>
      <Group ID="Session">
        <Property ID="MaxSessions" Value="50" />
        <Property ID="MaxSubscriptionsPerSession" Value="1000" />
        <Property ID="MaxPublishPerSession" Value="10" />
        <Property ID="MaxBrowseContinuationPoints" Value="5" />
        <Property ID="MaxHistoryContinuationPoints" Value="5" />
      </Group>
      <Group ID="Subscription">
        <Property ID="MaxMonitoredItemsPerSubscription" Value="10000" />
        <Property ID="MaxDataMonitoredItemsQueueSize" Value="100" />
        <Property ID="MaxEventMonitoredItemsQueueSize" Value="1000" />
        <Group ID="PublishingInterval">
          <Property ID="MinPublishingInterval" Value="50" />
          <Property ID="MaxPublishingInterval" Value="3600000" />
        </Group>
        <Group ID="KeepAliveInterval">
          <Property ID="MinKeepAliveInterval" Value="50" />
          <Property ID="MaxKeepAliveInterval" Value="1200000" />
        </Group>
        <Group ID="LifetimeInterval">
          <Property ID="MinLifetimeInterval" Value="150" />
          <Property ID="MaxLifetimeInterval" Value="3600000" />
        </Group>
      </Group>
    </Group>
    <Group ID="Conversions">
      <Property ID="EncodingAsciiString" Value="1" />
      <Property ID="ImplicitTypeCast" Value="0" />
    </Group>
    <Group ID="Sampling">
      <Selector ID="TimerCount">
        <Property ID="DefaultTimer" Value="7" />
        <Property ID="Timer1Interval" Value="10" />
        <Property ID="Timer2Interval" Value="20" />
        <Property ID="Timer3Interval" Value="50" />
        <Property ID="Timer4Interval" Value="100" />
        <Property ID="Timer5Interval" Value="200" />
        <Property ID="Timer6Interval" Value="500" />
        <Property ID="Timer7Interval" Value="1000" />
        <Property ID="Timer8Interval" Value="5000" />
      </Selector>
    </Group>
  </Element>
</Configuration>`;
    }
    
    /**
     * Get UaDvConfig.uadcfg template content for AS6 OpcUaCs
     */
    getUaDvConfigTemplate() {
        return `<?xml version="1.0" encoding="utf-8"?>
<?AutomationStudio FileVersion="4.9"?>
<Configuration>
  <Element ID="DefaultViewConfiguration" Type="uadcfg">
    <Group ID="InformationModels">
      <Property ID="ComplexTypeFacet" Value="0" />
      <Property ID="ExportTypeInformation" Value="0" />
      <Property ID="DedicatedTypeDefinitionsForStructures" Value="0" />
    </Group>
    <Group ID="DefaultRolePermissions">
      <Group ID="Role [1]">
        <Property ID="Name" Value="Everyone" />
        <Group ID="RolePermissions">
          <Property ID="PermissionBrowse" Value="1" />
          <Property ID="PermissionRead" Value="1" />
          <Property ID="PermissionWrite" Value="1" />
          <Property ID="PermissionCall" Value="1" />
          <Property ID="PermissionReadRolePermissions" Value="0" />
          <Property ID="PermissionWriteRolePermissions" Value="0" />
          <Property ID="PermissionWriteAttribute" Value="0" />
          <Property ID="PermissionReadHistory" Value="1" />
        </Group>
      </Group>
    </Group>
  </Element>
</Configuration>`;
    }

    /**
     * Extract roles from Role.role files in the project
     * Returns an array of { id, name, description } objects
     */
    extractRolesFromProject() {
        const roles = [];
        
        // Find Role.role files in the project
        this.projectFiles.forEach((file, path) => {
            if (path.toLowerCase().endsWith('.role') && typeof file.content === 'string') {
                console.log(`Extracting roles from: ${path}`);
                
                // Parse XML to extract roles
                // Format: <Element ID="RoleName" Type="Role">
                //           <Property ID="RoleID" Value="1" />
                //           <Property ID="Description" Value="..." />
                //         </Element>
                const elementPattern = /<Element\s+ID="([^"]+)"\s+Type="Role"[^>]*>([\s\S]*?)<\/Element>/gi;
                let match;
                
                while ((match = elementPattern.exec(file.content)) !== null) {
                    const roleName = match[1];
                    const elementContent = match[2];
                    
                    // Extract RoleID
                    const roleIdMatch = elementContent.match(/<Property\s+ID="RoleID"\s+Value="(\d+)"/i);
                    const roleId = roleIdMatch ? parseInt(roleIdMatch[1]) : roles.length + 1;
                    
                    // Extract Description
                    const descMatch = elementContent.match(/<Property\s+ID="Description"\s+Value="([^"]*)"/i);
                    const description = descMatch ? descMatch[1] : '';
                    
                    roles.push({
                        id: roleId,
                        name: roleName,
                        description: description
                    });
                    
                    console.log(`  Found role: ${roleName} (ID: ${roleId})`);
                }
            }
        });
        
        // Sort by role ID
        roles.sort((a, b) => a.id - b.id);
        
        // If no roles found, return default "Everyone" role
        if (roles.length === 0) {
            console.log('No Role.role file found, using default Everyone role');
            roles.push({
                id: 1,
                name: 'Everyone',
                description: 'Default role'
            });
        }
        
        console.log(`Extracted ${roles.length} roles for OPC UA configuration`);
        return roles;
    }

    /**
     * Generate UaDvConfig.uadcfg content with roles from the project
     * All permissions are enabled for all roles
     */
    getUaDvConfigTemplateWithRoles(roles) {
        // Generate role permission groups
        const roleGroups = roles.map((role, index) => {
            return `      <Group ID="Role [${index + 1}]">
        <Property ID="Name" Value="${this.escapeXmlAttribute(role.name)}" />
        <Group ID="RolePermissions">
          <Property ID="PermissionBrowse" Value="1" />
          <Property ID="PermissionRead" Value="1" />
          <Property ID="PermissionWrite" Value="1" />
          <Property ID="PermissionCall" Value="1" />
          <Property ID="PermissionReadRolePermissions" Value="1" />
          <Property ID="PermissionWriteRolePermissions" Value="1" />
          <Property ID="PermissionWriteAttribute" Value="1" />
          <Property ID="PermissionReadHistory" Value="1" />
        </Group>
      </Group>`;
        }).join('\n');

        return `<?xml version="1.0" encoding="utf-8"?>
<?AutomationStudio FileVersion="4.9"?>
<Configuration>
  <Element ID="DefaultViewConfiguration" Type="uadcfg">
    <Group ID="InformationModels">
      <Property ID="ComplexTypeFacet" Value="0" />
      <Property ID="ExportTypeInformation" Value="0" />
      <Property ID="DedicatedTypeDefinitionsForStructures" Value="0" />
    </Group>
    <Group ID="DefaultRolePermissions">
${roleGroups}
    </Group>
  </Element>
</Configuration>`;
    }

    /**
     * Escape special characters for XML attribute values
     */
    escapeXmlAttribute(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    /**
     * Convert mappServices AlarmX configuration files from AS4 to AS6 format.
     * 
     * AS4 format: Single .mpalarmxcore file with:
     * - mapp.AlarmX.Core.BySeverity - severity-based reaction groups
     * - mapp.AlarmX.Core.Configuration - alarm definitions
     * - mapp.AlarmX.Core.Snippets - snippets
     * 
     * AS6 format: Multiple files:
     * - {name}_1.mpalarmxcore - Mapping (flattened reactions) + List/Category references
     * - {name}_L.mpalarmxlist - Alarm definitions + Snippets (renamed group)
     * - {name}_C.mpalarmxcategory - Empty category file
     * - {name}_Q.mpalarmxquery - Empty query file
     * - {name}_2.mpalarmxhistory - History file (renamed from {name}H.mpalarmxhistory)
     * - {name}H_.mpalarmxquery - History query file
     */
    autoApplyMappServicesConversion() {
        console.log('Converting mappServices configuration to AS6 format...');
        
        // Convert MpComGroup files first (used by MpAlarmX)
        this.autoApplyMpComGroupConversion();
        
        // Find all .mpalarmxcore files in mappServices folders
        const alarmXCoreFiles = new Map(); // path -> file
        
        this.projectFiles.forEach((file, path) => {
            if (path.toLowerCase().endsWith('.mpalarmxcore') && 
                typeof file.content === 'string' &&
                file.content.includes('mapp.AlarmX.Core') &&
                (path.toLowerCase().includes('/mappservices/') || 
                 path.toLowerCase().includes('\\mappservices\\'))) {
                alarmXCoreFiles.set(path, file);
            }
        });
        
        if (alarmXCoreFiles.size === 0) {
            console.log('No mappServices AlarmX core files found to convert');
            return;
        }
        
        console.log(`Found ${alarmXCoreFiles.size} AlarmX core file(s) to convert`);
        
        alarmXCoreFiles.forEach((file, path) => {
            this.convertMpAlarmXCore(path, file);
        });
        
        console.log('mappServices AlarmX conversion completed');
    }
    
    /**
     * Convert a single .mpalarmxcore file to AS6 format
     * 
     * This handles two scenarios:
     * 1. Files with BySeverity section (older format) - convert to Mapping format
     * 2. Files with multiple Element nodes (newer format) - split alarm definitions to List files
     */
    convertMpAlarmXCore(originalPath, file) {
        const content = file.content;
        const pathParts = originalPath.split(/[\/\\]/);
        const fileName = pathParts.pop();
        const folderPath = pathParts.join('/') + '/';
        const baseName = fileName.replace(/\.mpalarmxcore$/i, '');
        
        console.log(`Converting AlarmX core file: ${originalPath}`);
        
        const changes = [];
        
        // Check for BySeverity section (old format)
        const hasBySeverity = content.includes('<Group ID="BySeverity">') || 
                              content.includes('<Group ID="mapp.AlarmX.Core"><Group ID="BySeverity">');
        
        if (hasBySeverity) {
            // Use the old conversion logic for BySeverity format
            this.convertMpAlarmXCoreWithBySeverity(originalPath, file, baseName, folderPath, changes);
            return;
        }
        
        // New format: multiple Elements with mapp.AlarmX.Core.Configuration
        // Extract all Element nodes
        const elementPattern = /<Element ID="([^"]+)" Type="mpalarmxcore">([\s\S]*?)<\/Element>/g;
        const elements = [];
        let match;
        
        while ((match = elementPattern.exec(content)) !== null) {
            elements.push({
                id: match[1],
                content: match[2]
            });
        }
        
        if (elements.length === 0) {
            console.log(`  Skipping ${fileName} - no valid Element nodes found`);
            return;
        }
        
        console.log(`  Found ${elements.length} Element node(s): ${elements.map(e => e.id).join(', ')}`);
        
        // Look up parent groups from mpcomgroup files (use stored map - Linking/Subnodes already stripped)
        const parentGroupMap = this.mpComGroupParentMap || this.findMpComGroupParents();
        
        // Generate the core file with all Elements (references to lists and categories)
        const coreElements = [];
        const listElements = [];
        const categoryElements = [];
        const queryElements = [];
        
        for (const elem of elements) {
            const originalElemId = elem.id;
            const elemId = this.truncateElementId(elem.id, 23); // 32 - '_Category'.length
            const parentGroup = parentGroupMap.get(originalElemId);
            
            // Extract Configuration content (alarm definitions)
            const configMatch = elem.content.match(/<Group ID="mapp\.AlarmX\.Core\.Configuration">([\s\S]*?)<\/Group>(?=\s*<Group ID="mapp\.AlarmX\.Core\.Snippets">|\s*$)/);
            const snippetsMatch = elem.content.match(/<Group ID="mapp\.AlarmX\.Core\.Snippets">([\s\S]*?)<\/Group>\s*$/);
            
            // Create core Element with references
            let coreElem = `  <Element ID="${elemId}" Type="mpalarmxcore">
    <Group ID="mapp.AlarmX.List">
      <Group ID="[0]">
        <Property ID="List" Value="${elemId}_List" />
      </Group>
    </Group>
    <Group ID="mapp.AlarmX.Core.Categories">
      <Group ID="[0]">
        <Property ID="List" Value="${elemId}_Category" />
      </Group>
    </Group>`;
            
            // Add Parent reference if found in mpcomgroup
            if (parentGroup) {
                coreElem += `
    <Group ID="mapp.Gen">
      <Property ID="Parent" Value="${parentGroup}" />
    </Group>`;
            }
            
            coreElem += `
  </Element>`;
            coreElements.push(coreElem);
            
            // Create list Element with alarm definitions and snippets
            let listElem = `  <Element ID="${elemId}_List" Type="mpalarmxlist">`;
            if (configMatch && configMatch[1].trim()) {
                listElem += `
    <Group ID="mapp.AlarmX.Core.Configuration">${configMatch[1]}</Group>`;
            }
            if (snippetsMatch && snippetsMatch[1].trim()) {
                listElem += `
    <Group ID="mapp.AlarmX.Core.Snippets">${snippetsMatch[1]}</Group>`;
            }
            listElem += `
  </Element>`;
            listElements.push(listElem);
            
            // Create category Element (empty)
            categoryElements.push(`  <Element ID="${elemId}_Category" Type="mpalarmxcategory" />`);
            
            // Create query Element (empty)
            queryElements.push(`  <Element ID="${elemId}_Query" Type="mpalarmxquery" />`);
        }
        
        // Generate file contents
        const newCoreContent = `<?xml version="1.0" encoding="utf-8"?>
<Configuration>
${coreElements.join('\n')}
</Configuration>`;
        
        const newListContent = `<?xml version="1.0" encoding="utf-8"?>
<Configuration>
${listElements.join('\n')}
</Configuration>`;
        
        const newCategoryContent = `<?xml version="1.0" encoding="utf-8"?>
<Configuration>
${categoryElements.join('\n')}
</Configuration>`;
        
        const newQueryContent = `<?xml version="1.0" encoding="utf-8"?>
<Configuration>
${queryElements.join('\n')}
</Configuration>`;
        
        // Truncate base name to 8 characters to ensure generated file names don't exceed 10 chars
        const truncatedBaseName = this.truncateBaseName(baseName, 8);
        if (truncatedBaseName !== baseName) {
            changes.push(`Truncated base name from '${baseName}' to '${truncatedBaseName}' for 10-char limit`);
        }
        
        // Delete the original file
        this.projectFiles.delete(originalPath);
        changes.push(`Removed original file: ${fileName}`);
        
        // Add new files
        const newCorePath = folderPath + truncatedBaseName + '_1.mpalarmxcore';
        this.projectFiles.set(newCorePath, {
            content: newCoreContent,
            type: 'mapp_component',
            name: truncatedBaseName + '_1.mpalarmxcore',
            extension: '.mpalarmxcore',
            isBinary: false
        });
        changes.push(`Created ${truncatedBaseName}_1.mpalarmxcore with ${elements.length} Element(s)`);
        
        const newListPath = folderPath + truncatedBaseName + '_L.mpalarmxlist';
        this.projectFiles.set(newListPath, {
            content: newListContent,
            type: 'mapp_component',
            name: truncatedBaseName + '_L.mpalarmxlist',
            extension: '.mpalarmxlist',
            isBinary: false
        });
        changes.push(`Created ${truncatedBaseName}_L.mpalarmxlist with alarm definitions`);
        
        const newCategoryPath = folderPath + truncatedBaseName + '_C.mpalarmxcategory';
        this.projectFiles.set(newCategoryPath, {
            content: newCategoryContent,
            type: 'mapp_component',
            name: truncatedBaseName + '_C.mpalarmxcategory',
            extension: '.mpalarmxcategory',
            isBinary: false
        });
        changes.push(`Created ${truncatedBaseName}_C.mpalarmxcategory`);
        
        const newQueryPath = folderPath + truncatedBaseName + '_Q.mpalarmxquery';
        this.projectFiles.set(newQueryPath, {
            content: newQueryContent,
            type: 'mapp_component',
            name: truncatedBaseName + '_Q.mpalarmxquery',
            extension: '.mpalarmxquery',
            isBinary: false
        });
        changes.push(`Created ${truncatedBaseName}_Q.mpalarmxquery`);
        
        // Handle history file conversion
        this.convertMpAlarmXHistory(folderPath, truncatedBaseName, changes);
        
        // Update Package.pkg (pass both original and truncated for proper removal/addition)
        this.updatePackagePkgForAlarmX(folderPath, baseName, truncatedBaseName, changes);
        
        // Add to analysis results
        this.analysisResults.push({
            severity: 'info',
            category: 'mappservices',
            name: 'AlarmX Core Converted to AS6 Format',
            description: `AlarmX core file with ${elements.length} Element(s) split into AS6 format files`,
            file: folderPath,
            autoFixed: true,
            details: changes
        });
    }
    
    /**
     * Find parent groups for alarm components from mpcomgroup files
     * Returns a Map of alarmElementId -> parentGroupId
     */
    findMpComGroupParents() {
        const parentMap = new Map();
        
        this.projectFiles.forEach((file, path) => {
            if (!path.toLowerCase().endsWith('.mpcomgroup') || typeof file.content !== 'string') {
                return;
            }
            
            // Pattern to match: <Element ID="groupId"...> with Subnodes containing alarm reference
            const elementPattern = /<Element ID="([^"]+)" Type="mpcomgroup">([\s\S]*?)<\/Element>/g;
            let match;
            
            while ((match = elementPattern.exec(file.content)) !== null) {
                const groupId = match[1];
                const elementContent = match[2];
                
                // Find Subnodes Property values
                const subnodePattern = /<Property ID="\d+" Value="([^"]+)" \/>/g;
                let subnodeMatch;
                
                // Check within the Subnodes group
                const subnodesMatch = elementContent.match(/<Group ID="Subnodes">([\s\S]*?)<\/Group>/);
                if (subnodesMatch) {
                    while ((subnodeMatch = subnodePattern.exec(subnodesMatch[1])) !== null) {
                        const alarmId = subnodeMatch[1];
                        parentMap.set(alarmId, groupId);
                    }
                }
            }
        });
        
        return parentMap;
    }
    
    /**
     * Convert MpAlarmX history files to AS6 format
     */
    convertMpAlarmXHistory(folderPath, baseName, changes) {
        // Look for history file patterns
        const historyPatterns = [
            new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_history\\.mpalarmxhistory$`, 'i'),
            new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}H\\.mpalarmxhistory$`, 'i'),
            new RegExp(`^mp_history\\.mpalarmxhistory$`, 'i')
        ];
        
        const historyFilesToConvert = [];
        
        this.projectFiles.forEach((hFile, hPath) => {
            if (!hPath.toLowerCase().endsWith('.mpalarmxhistory')) return;
            
            const hFileName = hPath.split(/[\/\\]/).pop();
            const hFolderPath = hPath.substring(0, hPath.length - hFileName.length);
            
            if (hFolderPath.toLowerCase() === folderPath.toLowerCase()) {
                historyFilesToConvert.push({ path: hPath, file: hFile, fileName: hFileName });
            }
        });
        
        for (const historyInfo of historyFilesToConvert) {
            const { path: hPath, file: hFile, fileName: hFileName } = historyInfo;
            const historyBaseNameOriginal = hFileName.replace(/\.mpalarmxhistory$/i, '');
            // Truncate history base name to 8 characters to ensure generated file names don't exceed 10 chars
            const historyBaseName = this.truncateBaseName(historyBaseNameOriginal, 8);
            
            // Update history file content to AS6 format
            let historyContent = hFile.content;
            if (typeof historyContent === 'string') {
                // Add the mapp.Gen group if not present
                if (!historyContent.includes('mapp.Gen')) {
                    const elemIdMatch = historyContent.match(/<Element ID="([^"]+)"/);
                    const elemId = this.truncateElementId(elemIdMatch ? elemIdMatch[1] : 'mpAlarmXHistory');
                    
                    historyContent = `<?xml version="1.0" encoding="utf-8"?>
<Configuration>
  <Element ID="${elemId}" Type="mpalarmxhistory">
    <Group ID="mapp.Gen">
      <Property ID="Audit" Value="FALSE" />
    </Group>
  </Element>
</Configuration>`;
                    
                    hFile.content = historyContent;
                    changes.push(`Updated ${hFileName} with mapp.Gen group`);
                }
            }
            
            // Create accompanying history query file
            const historyQueryPath = folderPath + historyBaseName + '_2.mpalarmxquery';
            if (!this.projectFiles.has(historyQueryPath)) {
                this.projectFiles.set(historyQueryPath, {
                    content: this.generateAS6HistoryQueryFile(),
                    type: 'mapp_component',
                    name: historyBaseName + '_2.mpalarmxquery',
                    extension: '.mpalarmxquery',
                    isBinary: false
                });
                changes.push(`Created ${historyBaseName}_2.mpalarmxquery`);
            }
        }
    }
    
    /**
     * Truncate a base name to ensure file names with suffixes don't exceed 10 characters.
     * AS6 has a 10-character limit for certain file names.
     * 
     * @param {string} baseName - Original base name
     * @param {number} maxLength - Maximum length for base name (default 8, to allow 2-char suffix)
     * @returns {string} - Truncated base name
     */
    truncateBaseName(baseName, maxLength = 8) {
        if (baseName.length <= maxLength) {
            return baseName;
        }
        const truncated = baseName.substring(0, maxLength);
        console.log(`  Truncated base name from '${baseName}' to '${truncated}' (10-char limit)`);
        return truncated;
    }

    /**
     * Truncate a mapp component element ID so that derived object names
     * stay within the 32-character AS6 object name limit.
     *
     * For components that generate suffixed names (_List, _Category, _Query)
     * pass maxLength = 32 − longestSuffixLength (e.g. 23 for AlarmX).
     * For components without suffixes, use the default maxLength = 32.
     *
     * Prefers truncating at a camelCase boundary (uppercase letter) or underscore
     * for a more readable result, falling back to a hard cut when no good boundary exists.
     *
     * @param {string} elemId    - Original element ID from AS4
     * @param {number} maxLength - Maximum allowed length for the base ID (default 32)
     * @returns {string} Element ID that is at most maxLength characters
     */
    truncateElementId(elemId, maxLength = 32) {
        if (elemId.length <= maxLength) {
            return elemId;
        }

        const candidate = elemId.substring(0, maxLength);

        // Walk backwards looking for a camelCase transition or underscore boundary
        let cutAt = -1;
        for (let i = candidate.length - 1; i > Math.floor(maxLength / 2); i--) {
            const c = candidate[i];
            if (c === '_' || (c >= 'A' && c <= 'Z')) {
                cutAt = i;
                break;
            }
        }

        // Use boundary if found, otherwise hard-cut at maxLength
        // Strip any trailing underscore left by a boundary cut (e.g. "Foo_Bar_" → "Foo_Bar")
        const truncated = (cutAt > 0 ? candidate.substring(0, cutAt) : candidate).replace(/_+$/, '') || candidate;

        console.log(`  Truncated element ID from '${elemId}' to '${truncated}' (32-char name limit)`);
        return truncated;
    }
    
    /**
     * Update Package.pkg with new AlarmX file entries
     * @param {string} folderPath - Path to the folder containing Package.pkg
     * @param {string} originalBaseName - Original base name (used for removing old entries)
     * @param {string} truncatedBaseName - Truncated base name (used for new entries)
     * @param {Array} changes - Array to log changes
     */
    updatePackagePkgForAlarmX(folderPath, originalBaseName, truncatedBaseName, changes) {
        const pkgPath = folderPath + 'Package.pkg';
        const pkgFile = this.projectFiles.get(pkgPath);
        
        if (pkgFile && typeof pkgFile.content === 'string') {
            let pkgContent = pkgFile.content;
            
            // Remove old entry using original base name
            pkgContent = pkgContent.replace(
                new RegExp(`<Object Type="File">${originalBaseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.mpalarmxcore</Object>\\s*`, 'gi'), 
                ''
            );
            
            // Add new entries using truncated base name before </Objects>
            const newEntries = [
                `<Object Type="File">${truncatedBaseName}_1.mpalarmxcore</Object>`,
                `<Object Type="File">${truncatedBaseName}_C.mpalarmxcategory</Object>`,
                `<Object Type="File">${truncatedBaseName}_L.mpalarmxlist</Object>`,
                `<Object Type="File">${truncatedBaseName}_Q.mpalarmxquery</Object>`
            ];
            
            // Check for existing entries to avoid duplicates
            const existingEntries = new Set();
            const existingPattern = /<Object Type="File">([^<]+)<\/Object>/g;
            let existingMatch;
            while ((existingMatch = existingPattern.exec(pkgContent)) !== null) {
                existingEntries.add(existingMatch[1].toLowerCase());
            }
            
            const entriesToAdd = newEntries.filter(e => {
                const fileName = e.match(/>([^<]+)</)[1].toLowerCase();
                return !existingEntries.has(fileName);
            });
            
            if (entriesToAdd.length > 0) {
                pkgContent = pkgContent.replace(
                    /<\/Objects>/,
                    entriesToAdd.map(e => '    ' + e).join('\n') + '\n  </Objects>'
                );
                
                pkgFile.content = pkgContent;
                changes.push('Updated Package.pkg with new file entries');
            }
        }
    }
    
    /**
     * Convert AlarmX core file with BySeverity section (old format)
     */
    convertMpAlarmXCoreWithBySeverity(originalPath, file, baseName, folderPath, changes) {
        const content = file.content;
        const pathParts = originalPath.split(/[\/\\]/);
        const fileName = pathParts.pop();
        
        console.log(`  Converting with BySeverity format: ${fileName}`);
        
        // Parse the AS4 content
        const bySeverityMatch = content.match(/<Group ID="mapp\.AlarmX\.Core">\s*<Group ID="BySeverity">([\s\S]*?)<\/Group>\s*<\/Group>/);
        const configurationMatch = content.match(/<Group ID="mapp\.AlarmX\.Core\.Configuration">([\s\S]*?)<\/Group>\s*(?=<Group ID="mapp\.AlarmX\.Core\.Snippets">|<\/Element>)/);
        const snippetsMatch = content.match(/<Group ID="mapp\.AlarmX\.Core\.Snippets">([\s\S]*?)<\/Group>\s*<\/Element>/);
        
        if (!bySeverityMatch) {
            console.log(`  Skipping ${fileName} - no BySeverity section found`);
            return;
        }
        
        // Extract Element ID (e.g., "mpAlarmXCore") and truncate for 32-char limit
        const elementIdMatch = content.match(/<Element ID="([^"]+)" Type="mpalarmxcore">/);
        const elementId = this.truncateElementId(elementIdMatch ? elementIdMatch[1] : 'mpAlarmXCore', 23); // 32 - '_Category'.length
        
        // Parse BySeverity section and convert to Mapping format
        const mappingEntries = this.convertBySeverityToMapping(bySeverityMatch[1]);
        
        // Create the new core file content (_1.mpalarmxcore)
        const newCoreContent = this.generateAS6CoreFile(elementId, mappingEntries);
        
        // Create the list file content (_L.mpalarmxlist)
        const configurationContent = configurationMatch ? configurationMatch[1] : '';
        const snippetsContent = snippetsMatch ? snippetsMatch[1] : '';
        const newListContent = this.generateAS6ListFile(elementId, configurationContent, snippetsContent);
        
        // Create the category file content (_C.mpalarmxcategory)
        const newCategoryContent = this.generateAS6CategoryFile(elementId);
        
        // Create the query file content (_Q.mpalarmxquery)
        const newQueryContent = this.generateAS6QueryFile(elementId);
        
        // Truncate base name to 8 characters to ensure generated file names don't exceed 10 chars
        const truncatedBaseName = this.truncateBaseName(baseName, 8);
        if (truncatedBaseName !== baseName) {
            changes.push(`Truncated base name from '${baseName}' to '${truncatedBaseName}' for 10-char limit`);
        }
        
        // Delete the original file
        this.projectFiles.delete(originalPath);
        changes.push(`Removed original file: ${fileName}`);
        
        // Add new files
        const newCorePath = folderPath + truncatedBaseName + '_1.mpalarmxcore';
        this.projectFiles.set(newCorePath, {
            content: newCoreContent,
            type: 'mapp_component',
            name: truncatedBaseName + '_1.mpalarmxcore',
            extension: '.mpalarmxcore',
            isBinary: false
        });
        changes.push(`Created ${truncatedBaseName}_1.mpalarmxcore with Mapping format`);
        
        const newListPath = folderPath + truncatedBaseName + '_L.mpalarmxlist';
        this.projectFiles.set(newListPath, {
            content: newListContent,
            type: 'mapp_component',
            name: truncatedBaseName + '_L.mpalarmxlist',
            extension: '.mpalarmxlist',
            isBinary: false
        });
        changes.push(`Created ${truncatedBaseName}_L.mpalarmxlist with alarm definitions`);
        
        const newCategoryPath = folderPath + truncatedBaseName + '_C.mpalarmxcategory';
        this.projectFiles.set(newCategoryPath, {
            content: newCategoryContent,
            type: 'mapp_component',
            name: truncatedBaseName + '_C.mpalarmxcategory',
            extension: '.mpalarmxcategory',
            isBinary: false
        });
        changes.push(`Created ${truncatedBaseName}_C.mpalarmxcategory`);
        
        const newQueryPath = folderPath + truncatedBaseName + '_Q.mpalarmxquery';
        this.projectFiles.set(newQueryPath, {
            content: newQueryContent,
            type: 'mapp_component',
            name: truncatedBaseName + '_Q.mpalarmxquery',
            extension: '.mpalarmxquery',
            isBinary: false
        });
        changes.push(`Created ${truncatedBaseName}_Q.mpalarmxquery`);
        
        // Handle history file renaming (e.g., CfgAlarmH.mpalarmxhistory -> CfgAlarm_2.mpalarmxhistory)
        // Look for a history file that matches the pattern {baseName}H.mpalarmxhistory
        const historyFilePattern = new RegExp(`${baseName}H\\.mpalarmxhistory$`, 'i');
        let historyConverted = false;
        
        this.projectFiles.forEach((hFile, hPath) => {
            if (historyFilePattern.test(hPath) && hPath.toLowerCase().startsWith(folderPath.toLowerCase())) {
                // Rename the history file
                const newHistoryPath = folderPath + truncatedBaseName + '_2.mpalarmxhistory';
                
                // Update history file content to AS6 format
                let historyContent = hFile.content;
                if (typeof historyContent === 'string') {
                    // Add the mapp.Gen group if not present - generate complete AS6 format
                    if (!historyContent.includes('mapp.Gen')) {
                        // Extract the Element ID and truncate for 32-char limit
                        const elemIdMatch = historyContent.match(/<Element ID="([^"]+)"/);
                        const elemId = this.truncateElementId(elemIdMatch ? elemIdMatch[1] : 'mpAlarmXHistory');
                        
                        // Generate fresh AS6 format content
                        historyContent = `<?xml version="1.0" encoding="utf-8"?>
<?AutomationStudio FileVersion="4.9"?>
<Configuration>
  <Element ID="${elemId}" Type="mpalarmxhistory">
    <Group ID="mapp.Gen">
      <Property ID="Audit" Value="FALSE" />
    </Group>
  </Element>
</Configuration>`;
                    }
                }
                
                this.projectFiles.delete(hPath);
                this.projectFiles.set(newHistoryPath, {
                    content: historyContent,
                    type: 'mapp_component',
                    name: truncatedBaseName + '_2.mpalarmxhistory',
                    extension: '.mpalarmxhistory',
                    isBinary: false
                });
                changes.push(`Renamed ${baseName}H.mpalarmxhistory to ${truncatedBaseName}_2.mpalarmxhistory`);
                
                // Create the history query file
                const historyQueryPath = folderPath + truncatedBaseName + 'H_.mpalarmxquery';
                this.projectFiles.set(historyQueryPath, {
                    content: this.generateAS6HistoryQueryFile(),
                    type: 'mapp_component',
                    name: truncatedBaseName + 'H_.mpalarmxquery',
                    extension: '.mpalarmxquery',
                    isBinary: false
                });
                changes.push(`Created ${truncatedBaseName}H_.mpalarmxquery`);
                
                historyConverted = true;
            }
        });
        
        // Update Package.pkg in the same folder
        const pkgPath = folderPath + 'Package.pkg';
        const pkgFile = this.projectFiles.get(pkgPath);
        if (pkgFile && typeof pkgFile.content === 'string') {
            let pkgContent = pkgFile.content;
            
            // Remove old entries using original baseName
            pkgContent = pkgContent.replace(new RegExp(`<Object Type="File">${baseName}\\.mpalarmxcore</Object>\\s*`, 'gi'), '');
            if (historyConverted) {
                pkgContent = pkgContent.replace(new RegExp(`<Object Type="File">${baseName}H\\.mpalarmxhistory</Object>\\s*`, 'gi'), '');
            }
            
            // Add new entries using truncatedBaseName before </Objects>
            const newEntries = [
                `<Object Type="File">${truncatedBaseName}_1.mpalarmxcore</Object>`,
                `<Object Type="File">${truncatedBaseName}_C.mpalarmxcategory</Object>`,
                `<Object Type="File">${truncatedBaseName}_L.mpalarmxlist</Object>`,
                `<Object Type="File">${truncatedBaseName}_Q.mpalarmxquery</Object>`
            ];
            
            if (historyConverted) {
                newEntries.push(`<Object Type="File">${truncatedBaseName}_2.mpalarmxhistory</Object>`);
                newEntries.push(`<Object Type="File">${truncatedBaseName}H_.mpalarmxquery</Object>`);
            }
            
            pkgContent = pkgContent.replace(
                /<\/Objects>/,
                newEntries.map(e => '    ' + e).join('\n') + '\n  </Objects>'
            );
            
            pkgFile.content = pkgContent;
            changes.push('Updated Package.pkg with new file entries');
        }
        
        // Add to analysis results
        this.analysisResults.push({
            severity: 'info',
            category: 'mappservices',
            name: 'AlarmX Core Converted to AS6 Format',
            description: `AlarmX core file split into multiple AS6 format files`,
            file: folderPath,
            autoFixed: true,
            details: changes
        });
    }
    
    /**
     * Convert BySeverity XML content to flat Mapping entries
     */
    convertBySeverityToMapping(bySeverityContent) {
        const mappingEntries = [];
        let entryIndex = 0;
        
        // Split BySeverity content into individual group entries
        // Match both self-closing groups: <Group ID="[1]" />
        // And groups with content: <Group ID="[0]">...</Group>
        const groups = [];
        
        // Use a simple approach: find each <Group ID="[n]" and extract until matching </Group> or />
        let searchPos = 0;
        while (searchPos < bySeverityContent.length) {
            const groupStart = bySeverityContent.indexOf('<Group ID="[', searchPos);
            if (groupStart === -1) break;
            
            // Find the end of the opening tag
            const tagEnd = bySeverityContent.indexOf('>', groupStart);
            if (tagEnd === -1) break;
            
            // Check if self-closing
            if (bySeverityContent.charAt(tagEnd - 1) === '/') {
                // Self-closing group
                groups.push({ content: '' });
                searchPos = tagEnd + 1;
            } else {
                // Find matching </Group> by counting depth
                let depth = 1;
                let pos = tagEnd + 1;
                
                while (depth > 0 && pos < bySeverityContent.length) {
                    const nextOpen = bySeverityContent.indexOf('<Group', pos);
                    const nextClose = bySeverityContent.indexOf('</Group>', pos);
                    
                    if (nextClose === -1) {
                        // No more closing tags, break
                        pos = bySeverityContent.length;
                        break;
                    }
                    
                    // Check if there's an opening tag before the closing tag
                    if (nextOpen !== -1 && nextOpen < nextClose) {
                        // Check if it's self-closing
                        const openTagEnd = bySeverityContent.indexOf('>', nextOpen);
                        if (openTagEnd !== -1 && bySeverityContent.charAt(openTagEnd - 1) === '/') {
                            // Self-closing, skip it
                            pos = openTagEnd + 1;
                        } else {
                            // Regular opening tag, increase depth
                            depth++;
                            pos = openTagEnd + 1;
                        }
                    } else {
                        // Closing tag comes first
                        depth--;
                        if (depth === 0) {
                            // Found matching close, extract content
                            groups.push({ 
                                content: bySeverityContent.substring(tagEnd + 1, nextClose)
                            });
                        }
                        pos = nextClose + 8; // length of '</Group>'
                    }
                }
                searchPos = pos;
            }
        }
        
        // Process each group
        for (const group of groups) {
            const groupContent = group.content;
            
            // Extract severity value
            const severityMatch = groupContent.match(/<Property ID="Severity" Value="(\d+)"/);
            if (!severityMatch) {
                // Empty group - create a None entry with empty alarm selector
                mappingEntries.push({
                    index: entryIndex++,
                    alarm: '[]',
                    action: 'None',
                    reactionName: null
                });
                continue;
            }
            
            const severity = severityMatch[1];
            
            // Extract all reactions (Selectors with Value="Reaction")
            const selectorRegex = /<Selector ID="\[\d+\]"([^>]*?)(?:\/>|>([\s\S]*?)<\/Selector>)/g;
            let selectorMatch;
            
            while ((selectorMatch = selectorRegex.exec(groupContent)) !== null) {
                const selectorAttrs = selectorMatch[1];
                const selectorContent = selectorMatch[2] || '';
                
                // Check if this is a Reaction selector or empty
                if (selectorAttrs.includes('Value="Reaction"')) {
                    // Extract the reaction name
                    const nameMatch = selectorContent.match(/<Property ID="Name" Value="([^"]+)"/);
                    if (nameMatch) {
                        mappingEntries.push({
                            index: entryIndex++,
                            alarm: `[${severity}]`,
                            action: 'Reaction',
                            reactionName: nameMatch[1]
                        });
                    }
                } else if (selectorMatch[0].endsWith('/>') || selectorContent.trim() === '') {
                    // Empty selector - create a None entry for this severity
                    mappingEntries.push({
                        index: entryIndex++,
                        alarm: `[${severity}]`,
                        action: 'None',
                        reactionName: null
                    });
                }
            }
        }
        
        return mappingEntries;
    }
    
    /**
     * Generate AS6 core file content
     */
    generateAS6CoreFile(elementId, mappingEntries) {
        let mappingGroups = mappingEntries.map(entry => {
            if (entry.action === 'None') {
                return `        <Group ID="[${entry.index}]">
          <Property ID="Alarm" Value="${entry.alarm}" />
          <Selector ID="Action" Value="None" />
        </Group>`;
            } else {
                return `        <Group ID="[${entry.index}]">
          <Property ID="Alarm" Value="${entry.alarm}" />
          <Selector ID="Action" Value="Reaction">
            <Property ID="Name" Value="${entry.reactionName}" />
          </Selector>
        </Group>`;
            }
        }).join('\n');
        
        return `<?xml version="1.0" encoding="utf-8"?>
<?AutomationStudio FileVersion="4.9"?>
<Configuration>
  <Element ID="${elementId}" Type="mpalarmxcore">
    <Group ID="mapp.AlarmX.Core">
      <Group ID="Mapping">
${mappingGroups}
      </Group>
    </Group>
    <Group ID="mapp.AlarmX.List">
      <Group ID="[0]">
        <Property ID="List" Value="${elementId}_List" />
      </Group>
    </Group>
    <Group ID="mapp.AlarmX.Core.Categories">
      <Group ID="[0]">
        <Property ID="List" Value="${elementId}_Category" />
      </Group>
    </Group>
  </Element>
</Configuration>`;
    }
    
    /**
     * Generate AS6 list file content with alarm definitions and snippets
     */
    generateAS6ListFile(elementId, configurationContent, snippetsContent) {
        // Rename snippets group from mapp.AlarmX.Core.Snippets to mapp.AlarmX.Snippets
        let snippetsSection = '';
        if (snippetsContent && snippetsContent.trim()) {
            snippetsSection = `\n    <Group ID="mapp.AlarmX.Snippets">${snippetsContent}</Group>`;
        }
        
        return `<?xml version="1.0" encoding="utf-8"?>
<?AutomationStudio FileVersion="4.9"?>
<Configuration>
  <Element ID="${elementId}_List" Type="mpalarmxlist">
    <Group ID="mapp.AlarmX.Core.Configuration">${configurationContent}</Group>${snippetsSection}
  </Element>
</Configuration>`;
    }
    
    /**
     * Generate AS6 category file content (empty template)
     */
    generateAS6CategoryFile(elementId) {
        return `<?xml version="1.0" encoding="utf-8"?>
<?AutomationStudio FileVersion="4.9"?>
<Configuration>
  <Element ID="${elementId}_Category" Type="mpalarmxcategory" />
</Configuration>`;
    }
    
    /**
     * Generate AS6 query file content (empty template)
     */
    generateAS6QueryFile(elementId) {
        return `<?xml version="1.0" encoding="utf-8"?>
<?AutomationStudio FileVersion="4.9"?>
<Configuration>
  <Element ID="${elementId}_Query" Type="mpalarmxquery" />
</Configuration>`;
    }
    
    /**
     * Generate AS6 history query file content (empty template)
     */
    generateAS6HistoryQueryFile() {
        return `<?xml version="1.0" encoding="utf-8"?>
<?AutomationStudio FileVersion="4.9"?>
<Configuration>
  <Element ID="mpAlarmXHistory_Query" Type="mpalarmxquery" />
</Configuration>`;
    }

    /**
     * Convert MpComGroup configuration files from AS4 to AS6 format.
     * 
     * AS4 format has Linking/Subnodes groups:
     *   <Element ID="gGroupStretchHood" Type="mpcomgroup">
     *     <Group ID="Linking">
     *       <Group ID="Subnodes">
     *         <Property ID="0" Value="gAlarmStretchHood" />
     *       </Group>
     *     </Group>
     *     <Selector ID="Alarms" Value="MpAlarmX" />
     *   </Element>
     * 
     * AS6 format removes the Linking/Subnodes groups:
     *   <Element ID="gGroupStretchHood" Type="mpcomgroup">
     *     <Selector ID="Alarms" Value="MpAlarmX" />
     *   </Element>
     */
    autoApplyMpComGroupConversion() {
        console.log('Converting MpComGroup configuration to AS6 format...');
        
        // Step 1: Build element ID → file info map for all mpcomgroup files
        const elementMap = new Map(); // elementId -> { path, file }
        this.projectFiles.forEach((file, path) => {
            if (path.toLowerCase().endsWith('.mpcomgroup') && typeof file.content === 'string') {
                const idMatch = file.content.match(/<Element ID="([^"]+)" Type="mpcomgroup"/);
                if (idMatch) {
                    elementMap.set(idMatch[1], { path, file });
                }
            }
        });
        
        // Step 2: Read parent-child relationships BEFORE stripping Linking/Subnodes
        // This map is also stored for later use by AlarmX conversion
        this.mpComGroupParentMap = this.findMpComGroupParents();
        console.log(`  Found ${this.mpComGroupParentMap.size} parent-child relationship(s) in MpComGroup files`);
        
        // Step 3: Strip Linking/Subnodes from all files (AS4 parent-declares-children format)
        let convertedCount = 0;
        
        this.projectFiles.forEach((file, path) => {
            if (path.toLowerCase().endsWith('.mpcomgroup') && 
                typeof file.content === 'string' &&
                file.content.includes('mpcomgroup')) {
                
                const converted = this.convertMpComGroup(file.content);
                if (converted !== file.content) {
                    file.content = converted;
                    convertedCount++;
                    console.log(`  Stripped Linking/Subnodes: ${path}`);
                    
                    this.analysisResults.push({
                        severity: 'info',
                        category: 'mappservices',
                        name: 'MpComGroup Converted to AS6 Format',
                        description: 'Removed Linking/Subnodes groups from MpComGroup configuration',
                        file: path,
                        autoFixed: true,
                        details: ['Removed Linking/Subnodes groups (AS4 parent-declares-children format)']
                    });
                }
            }
        });
        
        // Step 3.5: Truncate mpComGroup element IDs exceeding 32 characters
        const mpComGroupTruncMap = new Map(); // oldId → newId
        this.projectFiles.forEach((file, path) => {
            if (path.toLowerCase().endsWith('.mpcomgroup') && typeof file.content === 'string') {
                const idMatch = file.content.match(/<Element ID="([^"]+)" Type="mpcomgroup"/);
                if (idMatch && idMatch[1].length > 32) {
                    const oldId = idMatch[1];
                    const newId = this.truncateElementId(oldId);
                    mpComGroupTruncMap.set(oldId, newId);
                    file.content = file.content.replace(
                        new RegExp(`<Element ID="${oldId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'),
                        `<Element ID="${newId}"`
                    );
                    console.log(`  Truncated mpComGroup element ID: '${oldId}' → '${newId}'`);
                }
            }
        });
        
        // Update parent references in parentMap to use truncated mpComGroup IDs
        if (mpComGroupTruncMap.size > 0) {
            this.mpComGroupParentMap.forEach((parentId, childId) => {
                if (mpComGroupTruncMap.has(parentId)) {
                    this.mpComGroupParentMap.set(childId, mpComGroupTruncMap.get(parentId));
                }
            });
            console.log(`  Updated ${mpComGroupTruncMap.size} mpComGroup element ID(s) for 32-char limit`);
        }
        
        // Step 4: Inject Parent property into child mpcomgroup files (AS6 child-declares-parent format)
        let parentInjectedCount = 0;
        this.mpComGroupParentMap.forEach((parentId, childId) => {
            const childInfo = elementMap.get(childId);
            if (!childInfo) {
                console.log(`  Skipping parent injection for '${childId}' - no matching mpcomgroup file found (may be a non-group component)`);
                return;
            }
            
            const { path, file } = childInfo;
            
            // Skip if Parent is already set
            if (file.content.includes('<Property ID="Parent"')) {
                console.log(`  Parent already set in ${childId}, skipping`);
                return;
            }
            
            const updatedContent = this.injectMpComGroupParent(file.content, parentId);
            if (updatedContent !== file.content) {
                file.content = updatedContent;
                parentInjectedCount++;
                console.log(`  Injected Parent="${parentId}" into ${childId} (${path})`);
                
                this.analysisResults.push({
                    severity: 'info',
                    category: 'mappservices',
                    name: 'MpComGroup Parent Reference Added',
                    description: `Set parent of '${childId}' to '${parentId}' (AS6 reversed hierarchy)`,
                    file: path,
                    autoFixed: true,
                    details: [`Added mapp.Gen/Parent = "${parentId}"`]
                });
            }
        });
        
        console.log(`Converted ${convertedCount} MpComGroup file(s), injected parent into ${parentInjectedCount} child file(s)`);
    }
    
    /**
     * Convert a single MpComGroup file content to AS6 format
     */
    convertMpComGroup(content) {
        // Remove the Linking/Subnodes group structure from each Element
        // The pattern matches:
        //   <Group ID="Linking">
        //     <Group ID="Subnodes">
        //       ...any properties...
        //     </Group>
        //   </Group>
        
        let result = content;
        
        // Pattern to match the Linking group with optional whitespace/newlines
        const linkingPattern = /<Group ID="Linking">\s*<Group ID="Subnodes">[\s\S]*?<\/Group>\s*<\/Group>\s*/g;
        
        result = result.replace(linkingPattern, '');
        
        // Clean up any extra blank lines that might result
        result = result.replace(/\n\s*\n\s*\n/g, '\n\n');
        
        return result;
    }

    /**
     * Inject a Parent property into an mpcomgroup file content.
     * In AS6, child components declare their parent (reversed from AS4 where parent declared children).
     * Adds <Group ID="mapp.Gen"><Property ID="Parent" Value="parentId" /></Group>
     */
    injectMpComGroupParent(content, parentId) {
        // If there's already a mapp.Gen group, add Parent property inside it
        if (content.includes('<Group ID="mapp.Gen">')) {
            return content.replace(
                /(<Group ID="mapp\.Gen">)/,
                `$1\n      <Property ID="Parent" Value="${parentId}" />`
            );
        }
        
        // Insert mapp.Gen group with Parent before </Element>
        if (content.includes('</Element>')) {
            const parentGroup = `    <Group ID="mapp.Gen">\n      <Property ID="Parent" Value="${parentId}" />\n    </Group>`;
            return content.replace(
                '</Element>',
                `${parentGroup}\n  </Element>`
            );
        }
        
        // Handle self-closing Element: <Element ID="..." Type="mpcomgroup" />
        return content.replace(
            /(<Element ID="[^"]+" Type="mpcomgroup")\s*\/>/,
            `$1>\n    <Group ID="mapp.Gen">\n      <Property ID="Parent" Value="${parentId}" />\n    </Group>\n  </Element>`
        );
    }

    /**
     * Update mappView configuration files to use anonymous startup user
     * This ensures HMI bindings can connect without requiring authentication
     */
    autoApplyMappViewConfigConversion() {
        console.log('Updating mappView configuration files for anonymous startup user...');
        
        let updatedCount = 0;
        
        this.projectFiles.forEach((file, path) => {
            // Match Config.mappviewcfg files
            if (path.toLowerCase().endsWith('config.mappviewcfg') && 
                typeof file.content === 'string') {
                
                // Check if the file has the AuthenticationMode setting
                if (file.content.includes('AuthenticationMode')) {
                    // Add StartupUser selector after AuthenticationMode
                    const updatedContent = file.content.replace(
                        /(<Selector ID="AuthenticationMode" Value="[^"]*" \/?>)/,
                        '$1\n      <Selector ID="StartupUser" Value="StartupUserAnonymousToken" />'
                    );
                    
                    if (updatedContent !== file.content) {
                        file.content = updatedContent;
                        updatedCount++;
                        console.log(`Updated ${path} with anonymous startup user`);
                        
                        this.analysisResults.push({
                            severity: 'info',
                            category: 'mappview',
                            name: 'MappView Config Updated',
                            description: 'Configured anonymous startup user for HMI bindings',
                            file: path,
                            autoFixed: true,
                            details: ['Added StartupUser = StartupUserAnonymousToken']
                        });
                    }
                }
            }
        });
        
        if (updatedCount > 0) {
            console.log(`MappView configuration updated for ${updatedCount} file(s)`);
        }
    }

    /**
     * Auto-apply MpDataRecorder conversion from AS4 to AS6 format.
     *
     * AS4 → AS6 changes per Element:
     *  1. Add <Group ID="mapp.Gen"> with Enable=TRUE and Parent (from mpComGroupParentMap)
     *  2. Restructure <Group ID="DataRecorder">:
     *     - Add Memory Selector (DRAM default)
     *     - Move SaveInitialValues / DecimalDigits into Record sub-group with defaults
     *     - Move MaxFileSize / FileNamePattern into File sub-group with defaults
     *  3. Expand Alarms section: always emit 3 default alarms (RecordingCompleted,
     *     RecordingAborted, LimitViolated), merging any user-customised properties from AS4.
     */
    autoApplyMpDataRecorderConversion() {
        console.log('Converting MpDataRecorder configuration to AS6 format...');

        const parentMap = this.mpComGroupParentMap || new Map();
        let convertedFileCount = 0;

        this.projectFiles.forEach((file, path) => {
            if (!path.toLowerCase().endsWith('.mpdatarecorder') ||
                file.isBinary || typeof file.content !== 'string') {
                return;
            }

            // Parse all Element nodes in this file
            const elementPattern = /<Element ID="([^"]+)" Type="mpdatarecorder">([\s\S]*?)<\/Element>/g;
            let match;
            const elements = [];

            while ((match = elementPattern.exec(file.content)) !== null) {
                elements.push({ id: match[1], body: match[2], raw: match[0] });
            }

            if (elements.length === 0) return;

            // Convert each element
            const convertedElements = elements.map(elem =>
                this.convertMpDataRecorderElement(elem.id, elem.body, parentMap)
            );

            // Rebuild file
            const newContent = `<?xml version="1.0" encoding="utf-8"?>\n<Configuration>\n${convertedElements.join('\n')}\n</Configuration>`;

            if (newContent !== file.content) {
                file.content = newContent;
                convertedFileCount++;
                console.log(`  Converted ${elements.length} element(s) in ${path}`);

                this.analysisResults.push({
                    severity: 'info',
                    category: 'mappservices',
                    name: 'MpDataRecorder Converted to AS6 Format',
                    description: `Restructured ${elements.length} MpDataRecorder element(s) to AS6 format`,
                    file: path,
                    autoFixed: true,
                    details: elements.map(e => `Converted element "${e.id}"`)
                });
            }
        });

        console.log(`Converted ${convertedFileCount} MpDataRecorder file(s) to AS6 format`);
    }

    /**
     * Convert a single MpDataRecorder Element from AS4 to AS6 structure.
     *
     * @param {string} elemId   - Element ID (e.g. "mpLoggerTemperatures")
     * @param {string} body     - Inner XML of the Element (between <Element …> and </Element>)
     * @param {Map}    parentMap - mpComGroupParentMap (childId → parentId)
     * @returns {string} Full AS6 <Element …>…</Element> block
     */
    convertMpDataRecorderElement(originalElemId, body, parentMap) {
        const elemId = this.truncateElementId(originalElemId);

        // ---- 1. Extract AS4 DataRecorder properties ----
        const as4Props = {};
        const dataRecorderMatch = body.match(/<Group ID="DataRecorder">([\s\S]*?)<\/Group>/);
        if (dataRecorderMatch) {
            const propPattern = /<Property ID="([^"]+)" Value="([^"]*)" \/>/g;
            let pm;
            while ((pm = propPattern.exec(dataRecorderMatch[1])) !== null) {
                as4Props[pm[1]] = pm[2];
            }
        }

        // ---- 2. Extract AS4 Alarms section ----
        const as4Alarms = new Map(); // index (string) → { properties }
        const alarmsMatch = body.match(/<Selector ID="Alarms" Value="MpAlarmX">([\s\S]*?)<\/Selector>/);
        if (alarmsMatch) {
            const alarmGroupPattern = /<Group ID="\[(\d+)\]">([\s\S]*?)<\/Group>/g;
            let ag;
            while ((ag = alarmGroupPattern.exec(alarmsMatch[1])) !== null) {
                const idx = ag[1];
                const props = {};
                const apPattern = /<Property ID="([^"]+)"\s*(?:Value="([^"]*)")?\s*\/>/g;
                let ap;
                while ((ap = apPattern.exec(ag[2])) !== null) {
                    props[ap[1]] = ap[2] !== undefined ? ap[2] : '';
                }
                as4Alarms.set(idx, props);
            }
        }

        // ---- 3. Build mapp.Gen group ----
        const parentId = parentMap.get(originalElemId) || '';
        const mappGen = `    <Group ID="mapp.Gen">
      <Property ID="Enable" Value="TRUE" />
      <Property ID="Parent"${parentId ? ` Value="${parentId}"` : ''} />
    </Group>`;

        // ---- 4. Build restructured DataRecorder group ----
        const maxFileSize = as4Props['MaxFileSize'] || '1000';
        const fileNamePattern = as4Props['FileNamePattern'] || 'DataRecorder%Y_%m_%d_%H_%M_%S.csv';
        const saveInitialValues = as4Props['SaveInitialValues'] || 'TRUE';
        const decimalDigits = as4Props['DecimalDigits'] || '2';

        const dataRecorder = `    <Group ID="DataRecorder">
      <Selector ID="Memory" Value="DRAM">
        <Property ID="BufferSize" Value="100" />
        <Property ID="Interval" Value="10000" />
      </Selector>
      <Group ID="Record">
        <Property ID="AutoSave" Value="TRUE" />
        <Property ID="SaveInitialValues" Value="${saveInitialValues}" />
        <Property ID="DecimalDigits" Value="${decimalDigits}" />
        <Property ID="MeasurementSystem" Value="EU" />
        <Property ID="UnitDisplay" Value="0" />
      </Group>
      <Group ID="File">
        <Property ID="MaxNumberOfFiles" Value="1" />
        <Property ID="MaxFileSize" Value="${maxFileSize}" />
        <Property ID="OverwriteOldestFile" Value="FALSE" />
        <Property ID="FileNamePattern" Value="${fileNamePattern}" />
        <Property ID="TimeStampPattern" Value="%Y %m %d %H:%M:%S:%L" />
        <Property ID="ColumnSeparator" Value=";" />
        <Property ID="DecimalMark" Value="," />
        <Selector ID="Format" Value="CSV" />
      </Group>
    </Group>`;

        // ---- 5. Build AS6 Alarms section ----
        const alarmsSection = this.buildMpDataRecorderAlarms(as4Alarms);

        // ---- 6. Assemble ----
        return `  <Element ID="${elemId}" Type="mpdatarecorder">
${mappGen}
${dataRecorder}
${alarmsSection}
  </Element>`;
    }

    /**
     * Build the full Alarms Selector for an AS6 MpDataRecorder Element.
     *
     * Always emits three default alarm groups:
     *   [0] RecordingCompleted
     *   [1] RecordingAborted
     *   [2] LimitViolated
     *
     * Properties that the AS4 source defined for a given index are merged in,
     * overriding the defaults.
     *
     * @param {Map} as4Alarms - Map of alarm index → { propId: value } from AS4
     * @returns {string} Complete <Selector ID="Alarms" …>…</Selector> XML block
     */
    buildMpDataRecorderAlarms(as4Alarms) {
        const defaultAlarms = [
            { index: 0, name: 'RecordingCompleted', message: '{$BR/mapp/MpDataRecorder/Alarms/RecordingCompleted}', code: '0', severity: '1' },
            { index: 1, name: 'RecordingAborted',   message: '{$BR/mapp/MpDataRecorder/Alarms/RecordingAborted}',   code: '0', severity: '1' },
            { index: 2, name: 'LimitViolated',      message: '{$BR/mapp/MpDataRecorder/Alarms/LimitViolated}',      code: '0', severity: '1' }
        ];

        const groups = defaultAlarms.map(def => {
            const idx = String(def.index);
            const as4 = as4Alarms.get(idx) || {};

            // Merge: AS4 values override defaults
            const name     = as4['Name']     || def.name;
            const message  = as4['Message']  || def.message;
            const code     = as4['Code']     || def.code;
            const severity = as4['Severity'] || def.severity;

            return `      <Group ID="[${idx}]">
        <Property ID="Name" Value="${name}" />
        <Property ID="Message" Value="${this.escapeXmlAttribute(message)}" />
        <Property ID="Code" Value="${code}" />
        <Property ID="Severity" Value="${severity}" />
        <Selector ID="Behavior" Value="EdgeAlarm">
          <Property ID="AutoReset" Value="TRUE" />
          <Property ID="Acknowledge" Value="1" />
          <Property ID="Confirm" Value="0" />
          <Property ID="MultipleInstances" Value="TRUE" />
          <Property ID="ReactionWhilePending" Value="TRUE" />
          <Property ID="Async" Value="FALSE" />
          <Group ID="Recording">
            <Property ID="InactiveToActive" Value="TRUE" />
            <Property ID="ActiveToInactive" Value="FALSE" />
            <Property ID="UnacknowledgedToAcknowledged" Value="TRUE" />
            <Property ID="UnconfirmedToConfirmed" Value="TRUE" />
          </Group>
        </Selector>
        <Property ID="Disable" Value="FALSE" />
        <Property ID="AdditionalInformation1" />
        <Property ID="AdditionalInformation2" />
      </Group>`;
        });

        return `    <Selector ID="Alarms" Value="MpAlarmX">
      <Group ID="mapp.AlarmX.Core.Configuration">
${groups.join('\n')}
      </Group>
    </Selector>`;
    }

    /**
     * Auto-fix OPC UA server ConnectionPolicy in .uaserver files.
     * The ConnectionPolicy must be set to "1" (Current mapp view user) for mappView
     * HMI applications to properly access PVs through OPC UA.
     * 
     * Value="1" = Current mapp view user (correct / default)
     * Any other value = wrong, must be corrected
     * If the Selector line is absent entirely, the default applies and no change is needed.
     */
    autoApplyUaServerConnectionPolicy() {
        console.log('Checking OPC UA server ConnectionPolicy in .uaserver files...');
        
        let updatedCount = 0;
        
        this.projectFiles.forEach((file, path) => {
            if (!path.toLowerCase().endsWith('.uaserver') || file.isBinary || typeof file.content !== 'string') return;
            
            let content = file.content;
            
            // Check if ConnectionPolicy is present with a value other than "1"
            const connectionPolicyMatch = content.match(/<Selector\s+ID="ConnectionPolicy"\s+Value="([^"]*)"\s*\/?>/);
            
            if (!connectionPolicyMatch) {
                // No ConnectionPolicy line found — default value applies, which is correct
                console.log(`No ConnectionPolicy setting in ${path} — default (Current mapp view user) applies`);
                return;
            }
            
            const currentValue = connectionPolicyMatch[1];
            
            if (currentValue === '1') {
                console.log(`ConnectionPolicy already set to "1" in ${path}`);
                return;
            }
            
            // Fix the value to "1"
            const updatedContent = content.replace(
                /<Selector\s+ID="ConnectionPolicy"\s+Value="[^"]*"\s*\/?>/,
                '<Selector ID="ConnectionPolicy" Value="1" />'
            );
            
            if (updatedContent !== content) {
                file.content = updatedContent;
                updatedCount++;
                console.log(`Fixed ConnectionPolicy from "${currentValue}" to "1" in ${path}`);
                
                this.analysisResults.push({
                    severity: 'warning',
                    category: 'mappview',
                    name: 'OPC UA ConnectionPolicy Fixed',
                    description: `Changed ConnectionPolicy from "${currentValue}" to "1" (Current mapp view user). Required for mappView OPC UA PV access.`,
                    file: path,
                    autoFixed: true,
                    details: [`ConnectionPolicy changed from "${currentValue}" to "1" (Current mapp view user)`]
                });
            }
        });
        
        if (updatedCount > 0) {
            console.log(`ConnectionPolicy fixed in ${updatedCount} .uaserver file(s)`);
        } else {
            console.log('All .uaserver files have correct ConnectionPolicy or none found');
        }
    }

    /**
     * Auto-fix SecurityPolicy "None" in .uacfg files.
     * The "None" security policy must be enabled (Value="1") in the MessageSecurity
     * SecurityPolicies group for mappView HMI applications to access PVs via OPC UA.
     *
     * If the Property is present with Value != "1", it is corrected.
     * If the Property is missing entirely, it is inserted into the SecurityPolicies group.
     */
    autoApplyUaCfgSecurityPolicyNone() {
        console.log('Checking SecurityPolicy "None" in .uacfg files...');
        
        let updatedCount = 0;
        
        this.projectFiles.forEach((file, path) => {
            if (!path.toLowerCase().endsWith('.uacfg') || file.isBinary || typeof file.content !== 'string') return;
            
            let content = file.content;
            
            // Look for the MessageSecurity > SecurityPolicies group
            // We need to target the first SecurityPolicies group (under MessageSecurity),
            // not the second one (under Authentication)
            const msgSecurityMatch = content.match(
                /(<Group\s+ID="MessageSecurity">\s*<Group\s+ID="SecurityPolicies">)([\s\S]*?)(<\/Group>)/
            );
            
            if (!msgSecurityMatch) {
                console.log(`No MessageSecurity/SecurityPolicies group found in ${path}`);
                return;
            }
            
            const policiesContent = msgSecurityMatch[2];
            
            // Check if None property exists
            const noneMatch = policiesContent.match(/<Property\s+ID="None"\s+Value="([^"]*)"\s*\/?>/);            
            
            if (noneMatch && noneMatch[1] === '1') {
                console.log(`SecurityPolicy "None" already enabled in ${path}`);
                return;
            }
            
            let updatedContent;
            let changeDetail;
            
            if (noneMatch) {
                // Property exists but with wrong value — fix it
                const oldValue = noneMatch[1];
                updatedContent = content.replace(
                    /(<Group\s+ID="MessageSecurity">\s*<Group\s+ID="SecurityPolicies">\s*)<Property\s+ID="None"\s+Value="[^"]*"\s*\/?>/,
                    '$1<Property ID="None" Value="1" />'
                );
                changeDetail = `Changed SecurityPolicy "None" from "${oldValue}" to "1"`;
            } else {
                // Property is missing — insert it as the first entry in SecurityPolicies
                updatedContent = content.replace(
                    /(<Group\s+ID="MessageSecurity">\s*<Group\s+ID="SecurityPolicies">)/,
                    '$1\n          <Property ID="None" Value="1" />'
                );
                changeDetail = 'Added SecurityPolicy "None" with Value="1"';
            }
            
            if (updatedContent !== content) {
                file.content = updatedContent;
                updatedCount++;
                console.log(`${changeDetail} in ${path}`);
                
                this.analysisResults.push({
                    severity: 'warning',
                    category: 'opcua',
                    name: 'OPC UA SecurityPolicy "None" Enabled',
                    description: `${changeDetail}. Required for mappView OPC UA PV access.`,
                    file: path,
                    autoFixed: true,
                    details: [changeDetail]
                });
            }
        });
        
        if (updatedCount > 0) {
            console.log(`SecurityPolicy "None" fixed in ${updatedCount} .uacfg file(s)`);
        } else {
            console.log('All .uacfg files have SecurityPolicy "None" enabled or none found');
        }
    }

    /**
     * Auto-add BR_Engineer role to every user in .user files.
     * In AS6, the BR_Engineer role is required for mappView HMI applications
     * to have access to process variables (PVs) through OPC UA.
     * 
     * For each user element in .user files, this method checks if BR_Engineer
     * is already assigned. If not, it adds it as an additional Role entry.
     */
    autoApplyUserBREngineerRole() {
        console.log('Adding BR_Engineer role to all users in .user files...');
        
        let updatedFileCount = 0;
        let updatedUserCount = 0;
        
        this.projectFiles.forEach((file, path) => {
            if (!path.toLowerCase().endsWith('.user') || file.isBinary || typeof file.content !== 'string') return;
            
            let content = file.content;
            
            // Skip if file doesn't look like a user configuration
            if (!content.includes('<Element') || !content.includes('Type="User"')) return;
            
            // Already has BR_Engineer for all users? Quick check
            // We need to process per-user, so we can't just do a single check
            
            let fileModified = false;
            const usersUpdated = [];
            
            // Match each Element block for users
            // Process each <Group ID="Roles"> block within user elements
            const elementRegex = /<Element\s+ID="([^"]*)"\s+Type="User"[^>]*>([\s\S]*?)<\/Element>/g;
            let match;
            
            while ((match = elementRegex.exec(content)) !== null) {
                const userId = match[1];
                const elementContent = match[2];
                const elementFullMatch = match[0];
                
                // Check if this user already has BR_Engineer
                if (elementContent.includes('"BR_Engineer"')) {
                    console.log(`User "${userId}" already has BR_Engineer role in ${path}`);
                    continue;
                }
                
                // Find the Roles group
                const rolesGroupMatch = elementContent.match(/<Group\s+ID="Roles">[\s\S]*?<\/Group>/);
                if (!rolesGroupMatch) {
                    console.log(`User "${userId}" has no Roles group in ${path}, skipping`);
                    continue;
                }
                
                const rolesGroup = rolesGroupMatch[0];
                
                // Count existing roles to determine the next Role index
                const roleEntries = rolesGroup.match(/Role\[(\d+)\]/g) || [];
                const maxIndex = roleEntries.reduce((max, entry) => {
                    const idx = parseInt(entry.match(/\d+/)[0]);
                    return Math.max(max, idx);
                }, 0);
                const newIndex = maxIndex + 1;
                
                // Insert the new role before </Group>
                const newRoleEntry = `      <Property ID="Role[${newIndex}]" Value="BR_Engineer" />`;
                const updatedRolesGroup = rolesGroup.replace(
                    '</Group>',
                    newRoleEntry + '\n    </Group>'
                );
                
                // Replace in the element
                const updatedElement = elementFullMatch.replace(rolesGroup, updatedRolesGroup);
                content = content.replace(elementFullMatch, updatedElement);
                
                usersUpdated.push(userId);
                updatedUserCount++;
                fileModified = true;
                console.log(`Added BR_Engineer role (Role[${newIndex}]) to user "${userId}" in ${path}`);
            }
            
            if (fileModified) {
                file.content = content;
                updatedFileCount++;
                
                this.analysisResults.push({
                    severity: 'info',
                    category: 'security',
                    name: 'BR_Engineer Role Added',
                    description: `Added BR_Engineer role to ${usersUpdated.length} user(s): ${usersUpdated.join(', ')}. Required for mappView OPC UA PV access.`,
                    file: path,
                    autoFixed: true,
                    details: usersUpdated.map(u => `Added BR_Engineer to user "${u}"`)
                });
            }
        });
        
        if (updatedFileCount > 0) {
            console.log(`BR_Engineer role added in ${updatedFileCount} .user file(s), ${updatedUserCount} user(s) updated`);
        } else {
            console.log('No .user files found or all users already have BR_Engineer role');
        }
    }

    /**
     * Auto-remove deprecated function blocks that are not supported in AS6
     * 
     * This method:
     * 1. Removes function block instances from .var and .typ files
     * 2. Comments out usages in source code files (.st, .c, etc.)
     * 
     * Function blocks handled:
     * - MpAlarmXAcknowledgeAll (not supported in AS6)
     */
    autoApplyDeprecatedFunctionBlockRemoval() {
        console.log('Removing deprecated function blocks...');
        
        const deprecatedFBs = DeprecationDatabase.deprecatedFunctionBlocks || [];
        if (deprecatedFBs.length === 0) {
            console.log('No deprecated function blocks defined');
            return;
        }
        
        let removedInstances = 0;
        let commentedUsages = 0;
        const instanceNames = new Set(); // Track instance names for usage detection
        
        // Step 1: Find and collect all instance names from .var and .typ files
        deprecatedFBs.forEach(fb => {
            if (!fb.autoRemove) return;
            
            const fbName = fb.name;
            const fbPattern = new RegExp(`^\\s*(\\w+)\\s*:\\s*${this.escapeRegex(fbName)}\\s*;?\\s*$`, 'gm');
            
            this.projectFiles.forEach((file, filePath) => {
                if (file.isBinary) return;
                
                const ext = filePath.toLowerCase().split('.').pop();
                if (!['var', 'typ'].includes(ext)) return;
                
                let content = file.content;
                let match;
                
                // Find all instance declarations
                while ((match = fbPattern.exec(content)) !== null) {
                    const instanceName = match[1];
                    instanceNames.add(instanceName);
                    console.log(`Found deprecated FB instance: ${instanceName} : ${fbName} in ${filePath}`);
                }
            });
        });
        
        console.log(`Found ${instanceNames.size} deprecated function block instances to process`);
        
        // Step 2: Remove declarations from .var and .typ files
        deprecatedFBs.forEach(fb => {
            if (!fb.autoRemove) return;
            
            const fbName = fb.name;
            // Pattern to match: instanceName : FunctionBlockName; (with optional whitespace and comments)
            const declarationPattern = new RegExp(`^\\s*\\w+\\s*:\\s*${this.escapeRegex(fbName)}\\s*;?\\s*(?:\\/\\/.*)?$`, 'gm');
            
            this.projectFiles.forEach((file, filePath) => {
                if (file.isBinary) return;
                
                const ext = filePath.toLowerCase().split('.').pop();
                if (!['var', 'typ'].includes(ext)) return;
                
                let content = file.content;
                const originalContent = content;
                
                // Remove the declaration lines
                content = content.replace(declarationPattern, (match) => {
                    removedInstances++;
                    console.log(`Removing declaration from ${filePath}: ${match.trim()}`);
                    return `(* REMOVED - AS6 unsupported: ${match.trim()} *)`;
                });
                
                if (content !== originalContent) {
                    file.content = content;
                    
                    this.analysisResults.push({
                        type: 'deprecated_function_block',
                        severity: 'warning',
                        category: 'function_block',
                        name: `Removed ${fbName} declaration`,
                        description: `Removed deprecated function block ${fbName} declaration (not supported in AS6)`,
                        file: filePath,
                        autoFixed: true,
                        notes: fb.notes,
                        details: [`Original declarations replaced with comments for manual review`]
                    });
                }
            });
        });
        
        // Step 3: Comment out usages in source code files
        if (instanceNames.size > 0) {
            this.projectFiles.forEach((file, filePath) => {
                if (file.isBinary) return;
                
                const ext = filePath.toLowerCase().split('.').pop();
                // Only process source code files
                if (!['st', 'c', 'cpp', 'h', 'fun', 'prg'].includes(ext)) return;
                
                let content = file.content;
                let modified = false;
                const lines = content.split('\n');
                const newLines = [];
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    let shouldComment = false;
                    let matchedInstance = null;
                    
                    // Check if this line contains any of the deprecated instances
                    for (const instanceName of instanceNames) {
                        // Pattern to match instance usage: instanceName.xxx or instanceName(
                        // Also match assignment to instance parameters: instanceName.param := 
                        const usagePattern = new RegExp(`\\b${this.escapeRegex(instanceName)}\\s*[.(]`, 'i');
                        const assignPattern = new RegExp(`\\b${this.escapeRegex(instanceName)}\\b`, 'i');
                        
                        if (usagePattern.test(line) || assignPattern.test(line)) {
                            shouldComment = true;
                            matchedInstance = instanceName;
                            break;
                        }
                    }
                    
                    if (shouldComment && !line.trim().startsWith('//') && !line.trim().startsWith('(*')) {
                        // Comment out the line with explanation
                        newLines.push(`(* AS6-REMOVED: ${line} *) // TODO: MpAlarmXAcknowledgeAll not supported in AS6 - requires manual reimplementation`);
                        modified = true;
                        commentedUsages++;
                        console.log(`Commented out usage in ${filePath}: ${line.trim()}`);
                    } else {
                        newLines.push(line);
                    }
                }
                
                if (modified) {
                    file.content = newLines.join('\n');
                    
                    this.analysisResults.push({
                        type: 'deprecated_function_block',
                        severity: 'warning',
                        category: 'function_block',
                        name: 'Commented deprecated FB usage',
                        description: 'Commented out deprecated function block usage for manual review',
                        file: filePath,
                        autoFixed: true,
                        notes: 'Lines containing deprecated function block instances have been commented out. Manual reimplementation required.',
                        details: [`Search for "AS6-REMOVED" or "TODO: MpAlarmXAcknowledgeAll" in the file`]
                    });
                }
            });
        }
        
        console.log(`Deprecated function block removal complete: ${removedInstances} declarations removed, ${commentedUsages} usages commented out`);
    }

    /**
     * Auto-comment lines using deprecated struct members that were removed in AS6
     * 
     * This handles cases where struct members existed in AS4 but were removed in AS6:
     * - McCamAutDefineType.DataSize (removed in AS6)
     * 
     * Lines accessing these members will cause compile errors in AS6 and must be commented out.
     */
    autoCommentDeprecatedStructMembers() {
        console.log('Commenting deprecated struct member usages...');
        
        const deprecatedMembers = DeprecationDatabase.deprecatedStructMembers || [];
        if (deprecatedMembers.length === 0) {
            console.log('No deprecated struct members defined');
            return;
        }
        
        let commentedCount = 0;
        
        deprecatedMembers.forEach(member => {
            if (!member.autoComment) return;
            
            const memberPattern = new RegExp(member.pattern, 'gi');
            
            this.projectFiles.forEach((file, filePath) => {
                if (file.isBinary) return;
                
                // Only process ST source files
                const ext = filePath.toLowerCase().split('.').pop();
                if (!['st', 'fun', 'prg'].includes(ext)) return;
                
                let content = file.content;
                const lines = content.split('\n');
                let modified = false;
                const newLines = [];
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    
                    // Check if line contains the deprecated member pattern
                    if (memberPattern.test(line) && !line.trim().startsWith('//') && !line.trim().startsWith('(*')) {
                        // Comment out the line with explanation
                        const todoMsg = member.todoMessage || `${member.structType}.${member.memberName} removed in AS6`;
                        newLines.push(`(* AS6-REMOVED: ${line} *) // TODO: ${todoMsg}`);
                        modified = true;
                        commentedCount++;
                        console.log(`Commented deprecated member usage in ${filePath}: ${line.trim()}`);
                        // Reset regex lastIndex for next iteration
                        memberPattern.lastIndex = 0;
                    } else {
                        newLines.push(line);
                        // Reset regex lastIndex for next iteration
                        memberPattern.lastIndex = 0;
                    }
                }
                
                if (modified) {
                    file.content = newLines.join('\n');
                    
                    this.analysisResults.push({
                        type: 'deprecated_struct_member',
                        severity: member.severity,
                        category: 'struct_member',
                        name: `${member.structType}.${member.memberName}`,
                        description: member.description,
                        file: filePath,
                        autoFixed: true,
                        notes: member.notes,
                        details: [`Search for "AS6-REMOVED" or "TODO: ${member.todoMessage}" in the file`]
                    });
                }
            });
        });
        
        console.log(`Deprecated struct member comment complete: ${commentedCount} usages commented out`);
    }

    /**
     * Remove SafetyRelease attribute from .pkg files
     * SafetyRelease is not supported in AS6 and must be removed from cpu.pkg files
     */
    autoRemoveSafetyRelease() {
        console.log('Removing SafetyRelease from .pkg files...');
        
        let removedCount = 0;
        
        this.projectFiles.forEach((file, filePath) => {
            if (file.isBinary) return;
            
            const ext = filePath.toLowerCase().split('.').pop();
            if (ext !== 'pkg') return;
            
            let content = file.content;
            let modified = false;
            
            // Pattern 1: <Safety SafetyRelease="x.xx" />
            const safetyReleasePattern1 = /<Safety\s+SafetyRelease="[^"]+"\s*\/>\s*\n?/gi;
            
            if (safetyReleasePattern1.test(content)) {
                content = content.replace(safetyReleasePattern1, (match) => {
                    removedCount++;
                    modified = true;
                    console.log(`Removing SafetyRelease (format 1) from ${filePath}: ${match.trim()}`);
                    return ''; // Remove completely, no comment needed
                });
            }
            
            // Pattern 2: <SafetyRelease Version="x.xx.x" /> inside TechnologyPackages
            const safetyReleasePattern2 = /\s*<SafetyRelease\s+Version="[^"]+"\s*\/>\s*\n?/gi;
            
            if (safetyReleasePattern2.test(content)) {
                content = content.replace(safetyReleasePattern2, (match) => {
                    removedCount++;
                    modified = true;
                    console.log(`Removing SafetyRelease (format 2) from ${filePath}: ${match.trim()}`);
                    return '\n'; // Remove, just keep a newline
                });
            }
            
            if (modified) {
                file.content = content;
                
                this.analysisResults.push({
                    type: 'safety_config',
                    severity: 'info',
                    category: 'configuration',
                    name: 'SafetyRelease removed',
                    description: 'Removed SafetyRelease entries (not supported in AS6)',
                    file: filePath,
                    autoFixed: true,
                    notes: 'SafetyRelease is no longer supported in AS6 and has been removed from package configuration.',
                    details: ['SafetyRelease entries have been removed from both Safety element and TechnologyPackages section']
                });
            }
        });
        
        console.log(`SafetyRelease removal complete: ${removedCount} entries removed`);
    }

    /**
     * Add ChannelBrowsePath to OpcUa_any device channels in .hw files
     * AS6 requires ChannelBrowsePath for each channel - AS4 often didn't have them
     * Preserves existing ChannelBrowsePath values from AS4, adds default "/0:Root" only for missing ones
     */
    autoApplyOpcUaAnyChannelBrowsePath() {
        console.log('Adding ChannelBrowsePath to OpcUa_any channels in .hw files...');
        
        let modifiedFiles = 0;
        let addedBrowsePaths = 0;
        let preservedBrowsePaths = 0;
        
        this.projectFiles.forEach((file, filePath) => {
            if (file.isBinary) return;
            
            const ext = filePath.toLowerCase().split('.').pop();
            if (ext !== 'hw') return;
            
            let content = file.content;
            let originalContent = content;
            
            // Find OpcUa_any modules
            // Pattern: <Module Name="..." Type="OpcUa_any" ...>...</Module>
            const opcuaAnyPattern = /<Module\s+[^>]*Type="OpcUa_any"[^>]*>([\s\S]*?)<\/Module>/gi;
            
            content = content.replace(opcuaAnyPattern, (moduleMatch) => {
                let moduleContent = moduleMatch;
                
                // Find all channel groups and their IDs
                // Pattern: <Group ID="Channel1" /> or <Group ID="Channel12" />
                const channelGroupPattern = /<Group\s+ID="Channel(\d+)"\s*\/>/gi;
                let channelMatch;
                const channelsToFix = [];
                
                // First pass: identify channels that need ChannelBrowsePath
                while ((channelMatch = channelGroupPattern.exec(moduleContent)) !== null) {
                    const channelNum = channelMatch[1];
                    
                    // Check if ChannelBrowsePath already exists for this channel
                    const browsePathPattern = new RegExp(`<Parameter\\s+ID="ChannelBrowsePath${channelNum}"\\s+Value="[^"]*"\\s*/>`, 'i');
                    if (browsePathPattern.test(moduleContent)) {
                        // ChannelBrowsePath already exists - preserve it (no action needed)
                        preservedBrowsePaths++;
                        console.log(`  Preserving existing ChannelBrowsePath${channelNum} in ${filePath}`);
                    } else {
                        // ChannelBrowsePath missing - need to add default
                        // Find the ChannelID parameter for this channel to insert after it
                        const channelIdPattern = new RegExp(`(<Parameter\\s+ID="ChannelID${channelNum}"\\s+Value="[^"]*"\\s*/>)`, 'i');
                        if (channelIdPattern.test(moduleContent)) {
                            channelsToFix.push({
                                channelNum: channelNum,
                                pattern: channelIdPattern
                            });
                        }
                    }
                }
                
                // Second pass: add default ChannelBrowsePath after each ChannelID that needs it
                channelsToFix.forEach(channel => {
                    moduleContent = moduleContent.replace(channel.pattern, (match, channelIdLine) => {
                        addedBrowsePaths++;
                        console.log(`  Adding default ChannelBrowsePath${channel.channelNum} in ${filePath}`);
                        // Add ChannelBrowsePath right after ChannelID with default value
                        return `${channelIdLine}\n    <Parameter ID="ChannelBrowsePath${channel.channelNum}" Value="/0:Root" />`;
                    });
                });
                
                return moduleContent;
            });
            
            if (content !== originalContent) {
                file.content = content;
                modifiedFiles++;
                
                this.analysisResults.push({
                    type: 'opcua_config',
                    severity: 'info',
                    category: 'configuration',
                    name: 'OpcUa_any ChannelBrowsePath added',
                    description: 'Added missing ChannelBrowsePath parameters to OpcUa_any device channels',
                    file: filePath,
                    autoFixed: true,
                    notes: 'AS6 requires ChannelBrowsePath for each OpcUa_any channel. Existing values preserved, default "/0:Root" added for missing channels.',
                    details: [`Preserved ${preservedBrowsePaths} existing browse paths, added ${addedBrowsePaths} default browse paths`]
                });
            }
        });
        
        console.log(`OpcUa_any ChannelBrowsePath update complete: ${modifiedFiles} files modified, ${addedBrowsePaths} default browse paths added, ${preservedBrowsePaths} existing paths preserved`);
    }

    /**
     * Visual Components firmware version must be updated for AS6
     * Changes <Vc FirmwareVersion="V4.xx.x" /> to <Vc FirmwareVersion="6.0.0" />
     */
    autoUpdateVcFirmwareVersion() {
        console.log('Updating Visual Components firmware version in .pkg files...');
        
        let updatedCount = 0;
        const targetVersion = '6.0.0';
        
        this.projectFiles.forEach((file, filePath) => {
            if (file.isBinary) return;
            
            const ext = filePath.toLowerCase().split('.').pop();
            if (ext !== 'pkg') return;
            
            let content = file.content;
            let modified = false;
            
            // Pattern: <Vc FirmwareVersion="V4.34.2" /> or any version
            const vcVersionPattern = /<Vc\s+FirmwareVersion="([^"]+)"\s*\/>/gi;
            
            content = content.replace(vcVersionPattern, (match, oldVersion) => {
                if (oldVersion !== targetVersion) {
                    updatedCount++;
                    modified = true;
                    console.log(`Updating VC FirmwareVersion in ${filePath}: ${oldVersion} -> ${targetVersion}`);
                    return `<Vc FirmwareVersion="${targetVersion}" />`;
                }
                return match;
            });
            
            if (modified) {
                file.content = content;
                
                this.analysisResults.push({
                    type: 'vc_firmware',
                    severity: 'info',
                    category: 'configuration',
                    name: 'Visual Components firmware updated',
                    description: 'Updated Visual Components FirmwareVersion to AS6 compatible version',
                    file: filePath,
                    autoFixed: true,
                    notes: `FirmwareVersion updated to ${targetVersion} for AS6 compatibility.`,
                    details: ['Visual Components firmware version has been updated to the AS6 required version']
                });
            }
        });
        
        console.log(`VC FirmwareVersion update complete: ${updatedCount} entries updated`);
    }

    /**
     * Remove MpWebXs technology package - not supported in AS6
     * This removes:
     * - MpWebXs library from Package.pkg and .sw files
     * - .mpwebxs configuration files from Package.pkg
     * - Actual .mpwebxs files from the project
     */
    autoRemoveMpWebXs() {
        console.log('Checking for MpWebXs (not supported in AS6)...');
        
        let removedLibraryCount = 0;
        let removedConfigCount = 0;
        const removedFiles = [];
        
        // Find all .mpwebxs files and remove them from the project
        const mpwebxsFiles = [];
        this.projectFiles.forEach((file, filePath) => {
            if (filePath.toLowerCase().endsWith('.mpwebxs')) {
                mpwebxsFiles.push(filePath);
            }
        });
        
        if (mpwebxsFiles.length > 0) {
            console.log(`Found ${mpwebxsFiles.length} .mpwebxs configuration files to remove`);
            
            // Remove the files from projectFiles
            mpwebxsFiles.forEach(filePath => {
                this.projectFiles.delete(filePath);
                removedFiles.push(filePath);
                console.log(`Removed .mpwebxs file: ${filePath}`);
                
                // Add finding for removed config file
                this.addFinding({
                    type: 'deprecated_config',
                    severity: 'info',
                    category: 'mapp',
                    name: 'MpWebXs configuration removed',
                    description: 'Removed .mpwebxs configuration file (not supported in AS6)',
                    file: filePath,
                    autoFixed: true,
                    notes: 'MpWebXs technology package is discontinued in AS6. Configuration file has been removed.'
                });
            });
        }
        
        // Remove .mpwebxs entries from Package.pkg files
        this.projectFiles.forEach((file, filePath) => {
            if (file.isBinary) return;
            
            const filePathLower = filePath.toLowerCase();
            if (!filePathLower.endsWith('package.pkg')) return;
            
            let content = file.content;
            let modified = false;
            
            // Remove MpWebXs library reference: <Object Type="Library">MpWebXs</Object>
            const libPattern = /<Object\s+Type="Library"[^>]*>\s*MpWebXs\s*<\/Object>/i;
            if (libPattern.test(content)) {
                const removePattern = /\s*<Object\s+Type="Library"[^>]*>\s*MpWebXs\s*<\/Object>\s*\n?/gi;
                content = content.replace(removePattern, '');
                console.log(`Removed MpWebXs library from ${filePath}`);
                removedLibraryCount++;
                modified = true;
            }
            
            // Remove .mpwebxs file references: <Object Type="File">*.mpwebxs</Object>
            const configPattern = /<Object\s+Type="File"[^>]*>[^<]*\.mpwebxs\s*<\/Object>/i;
            if (configPattern.test(content)) {
                const removeConfigPattern = /\s*<Object\s+Type="File"[^>]*>[^<]*\.mpwebxs\s*<\/Object>\s*\n?/gi;
                content = content.replace(removeConfigPattern, '');
                console.log(`Removed .mpwebxs file reference from ${filePath}`);
                removedConfigCount++;
                modified = true;
            }
            
            if (modified) {
                file.content = content;
            }
        });
        
        // Remove MpWebXs from .sw files
        this.projectFiles.forEach((file, filePath) => {
            if (file.isBinary) return;
            
            const filePathLower = filePath.toLowerCase();
            if (!filePathLower.endsWith('.sw')) return;
            
            let content = file.content;
            
            // Remove: <LibraryObject Name="MpWebXs" ... />
            const libPattern = /<LibraryObject\s+[^>]*Name="MpWebXs"/i;
            if (libPattern.test(content)) {
                const removePattern = /\s*<LibraryObject\s+[^>]*Name="MpWebXs"[^>]*\/>\s*\n?/gi;
                content = content.replace(removePattern, '');
                console.log(`Removed MpWebXs library from .sw file: ${filePath}`);
                removedLibraryCount++;
                file.content = content;
            }
        });
        
        // Remove all files from the MpWebXs library folder
        const mpwebxsLibraryFiles = [];
        this.projectFiles.forEach((file, filePath) => {
            const pathLower = filePath.toLowerCase();
            // Match paths like ".../Libraries/MpWebXs/..." or "Libraries\MpWebXs\..."
            if (pathLower.includes('/libraries/mpwebxs/') || pathLower.includes('\\libraries\\mpwebxs\\') ||
                pathLower.includes('/libraries/mpwebxs\\') || pathLower.includes('\\libraries\\mpwebxs/')) {
                mpwebxsLibraryFiles.push(filePath);
            }
        });
        
        if (mpwebxsLibraryFiles.length > 0) {
            console.log(`Found ${mpwebxsLibraryFiles.length} files in MpWebXs library folder to remove`);
            mpwebxsLibraryFiles.forEach(filePath => {
                this.projectFiles.delete(filePath);
                console.log(`Removed MpWebXs library file: ${filePath}`);
            });
            removedFiles.push(...mpwebxsLibraryFiles.map(f => f.split(/[/\\]/).pop())); // Just file names for summary
        }
        
        // Add summary finding if anything was removed
        if (removedLibraryCount > 0 || removedConfigCount > 0 || removedFiles.length > 0) {
            this.addFinding({
                type: 'library',
                severity: 'info',
                category: 'mapp',
                name: 'MpWebXs removed',
                description: 'MpWebXs technology package removed (not supported in AS6)',
                file: 'Multiple files',
                autoFixed: true,
                notes: `Removed: ${removedLibraryCount} library references, ${removedFiles.length} .mpwebxs config files. MpWebXs is discontinued in AS6.`,
                details: removedFiles
            });
        }
        
        console.log(`MpWebXs removal complete: ${removedLibraryCount} library refs, ${removedFiles.length} config files removed`);
    }

    /**
     * Replace acp10sys.br files in Physical/Motion folders with AS6 version
     * This file is part of the Acp10man library but also exists in Physical folders
     * and must be replaced with the AS6 version to avoid build errors
     */
    async replaceAcp10sysBrFiles() {
        const acp10sysFiles = [];
        
        // Find all acp10sys.br files in Physical folders (Motion subfolder)
        this.projectFiles.forEach((file, path) => {
            const pathLower = path.toLowerCase();
            if (pathLower.endsWith('acp10sys.br') && 
                (pathLower.includes('/physical/') || pathLower.includes('\\physical\\'))) {
                acp10sysFiles.push(path);
            }
        });
        
        if (acp10sysFiles.length === 0) {
            return; // No acp10sys.br files to replace
        }
        
        console.log(`Found ${acp10sysFiles.length} acp10sys.br files in Physical folders to replace`);
        
        // Fetch the AS6 version from Acp10Arnc0 technology package
        const as6FilePath = 'LibrariesForAS6/TechnologyPackages/Acp10Arnc0/6.2.0/Library/Acp10man/V6.02.0/SG4/Powerlink/acp10sys.br';
        
        try {
            const response = await fetch(as6FilePath);
            if (!response.ok) {
                console.warn(`Could not fetch AS6 acp10sys.br: ${response.status}`);
                return;
            }
            
            const as6Content = await response.arrayBuffer();
            
            // Replace each acp10sys.br file with the AS6 version
            for (const path of acp10sysFiles) {
                this.projectFiles.set(path, {
                    content: as6Content,
                    isBinary: true,
                    type: 'binary'
                });
                console.log(`Replaced acp10sys.br with AS6 version: ${path}`);
                
                // Add to analysis results
                this.analysisResults.push({
                    severity: 'info',
                    category: 'motion',
                    name: 'Motion System File Updated',
                    description: 'acp10sys.br replaced with AS6 version from Acp10Arnc0 6.2.0',
                    file: path,
                    autoFixed: true
                });
            }
        } catch (error) {
            console.error('Failed to fetch AS6 acp10sys.br:', error);
        }
    }

    /**
     * Add mCoWebSc.mcowebservercfg file to mappCockpit folders in Physical configurations.
     * This file is required for AS6 mappCockpit web server configuration.
     * 
     * Project structure: ROOT/Physical/CONFIG/CPU/mappCockpit/
     * We find mappCockpit folders by looking for existing mappCockpit/Package.pkg files.
     */
    async addMappCockpitWebServerConfig() {
        // First check if mappCockpit is used in the project
        const requiredPackages = this.getRequiredTechnologyPackages();
        if (!requiredPackages.has('mappCockpit')) {
            console.log('mappCockpit not used in project, skipping webserver config');
            return;
        }
        
        // Get the mappCockpit version
        const mappCockpitVersion = requiredPackages.get('mappCockpit').version || '6.0.0';
        console.log(`mappCockpit version: ${mappCockpitVersion}`);
        
        // Find mappCockpit folders by looking for mappCockpit/Package.pkg
        const mappCockpitFolders = [];
        this.projectFiles.forEach((file, path) => {
            // Match: .../mappCockpit/Package.pkg
            if (path.toLowerCase().endsWith('mappcockpit/package.pkg') || 
                path.toLowerCase().endsWith('mappcockpit\\package.pkg')) {
                const separator = path.includes('/') ? '/' : '\\';
                const folderPath = path.substring(0, path.lastIndexOf(separator));
                mappCockpitFolders.push({ path: folderPath, separator, packagePkg: path });
            }
        });
        
        if (mappCockpitFolders.length === 0) {
            console.log('No mappCockpit folders found');
            return;
        }
        
        console.log(`Found ${mappCockpitFolders.length} mappCockpit folder(s)`);
        
        // Fetch the mCoWebSc.mcowebservercfg template file
        const templatePath = `LibrariesForAS6/TechnologyPackages/mappCockpit/${mappCockpitVersion}/ObjectCatalog/Elements/mcowebservercfg/Template/mCoWebSc.mcowebservercfg`;
        
        try {
            const response = await fetch(templatePath);
            if (!response.ok) {
                console.warn(`Could not fetch mCoWebSc.mcowebservercfg template: ${response.status}`);
                return;
            }
            
            const templateContent = await response.text();
            
            // Add the webserver config file to each mappCockpit folder
            for (const { path: folderPath, separator, packagePkg } of mappCockpitFolders) {
                const webServerConfigPath = folderPath + separator + 'mCoWebSc.mcowebservercfg';
                
                // Check if the file already exists
                if (this.projectFiles.has(webServerConfigPath)) {
                    console.log(`mCoWebSc.mcowebservercfg already exists in ${folderPath}`);
                    continue;
                }
                
                // Add the webserver config file
                this.projectFiles.set(webServerConfigPath, {
                    content: templateContent,
                    isBinary: false,
                    type: 'mapp_cockpit',
                    name: 'mCoWebSc.mcowebservercfg',
                    extension: '.mcowebservercfg',
                    hasBOM: false
                });
                console.log(`Added mCoWebSc.mcowebservercfg to ${folderPath}`);
                
                // Update Package.pkg to include the new file
                const packageFile = this.projectFiles.get(packagePkg);
                if (packageFile && packageFile.content && !packageFile.content.includes('mCoWebSc.mcowebservercfg')) {
                    let packageContent = packageFile.content;
                    const insertPoint = packageContent.lastIndexOf('</Objects>');
                    if (insertPoint !== -1) {
                        const newEntry = '    <Object Type="File">mCoWebSc.mcowebservercfg</Object>\n  ';
                        packageContent = packageContent.substring(0, insertPoint) + newEntry + packageContent.substring(insertPoint);
                        this.projectFiles.set(packagePkg, { ...packageFile, content: packageContent });
                        console.log(`Updated Package.pkg to include mCoWebSc.mcowebservercfg`);
                    }
                }
                
                // Add to analysis results
                this.analysisResults.push({
                    severity: 'info',
                    category: 'mappCockpit',
                    name: 'mappCockpit WebServer Config Added',
                    description: `Added mCoWebSc.mcowebservercfg for AS6 mappCockpit web server configuration`,
                    file: webServerConfigPath,
                    autoFixed: true
                });
            }
        } catch (error) {
            console.error('Failed to add mappCockpit webserver config:', error);
        }
    }

    /**
     * Get all CPU folder paths from the Physical configuration.
     * CPU folders are identified by looking for Cpu.sw files in Physical/{Config}/{CPU}/ structure.
     * 
     * @returns {Array<{cpuPath: string, separator: string}>} Array of CPU folder paths
     */
    getAllCpuFolderPaths() {
        const cpuFolders = [];
        
        this.projectFiles.forEach((file, path) => {
            // Look for Cpu.sw files which indicate a CPU folder
            // Path structure: ROOT/Physical/CONFIG_NAME/CPU_NAME/Cpu.sw
            const pathLower = path.toLowerCase();
            if (pathLower.endsWith('cpu.sw') || pathLower.endsWith('cpu.sw')) {
                const separator = path.includes('/') ? '/' : '\\';
                // Get the CPU folder path (parent of Cpu.sw)
                const cpuPath = path.substring(0, path.lastIndexOf(separator));
                cpuFolders.push({ cpuPath, separator });
            }
        });
        
        console.log(`Found ${cpuFolders.length} CPU folder(s) in Physical configuration`);
        return cpuFolders;
    }

    /**
     * Add AccessAndSecurity/UserRoleSystem folder with BRRole.brrole to all CPU configurations.
     * This is required for AS6 projects to have proper user role definitions.
     * 
     * Project structure: ROOT/Physical/CONFIG/CPU/AccessAndSecurity/UserRoleSystem/
     */
    async addUserRoleSystemFiles() {
        console.log('Adding AccessAndSecurity/UserRoleSystem files to CPU configurations...');
        
        const cpuFolders = this.getAllCpuFolderPaths();
        
        if (cpuFolders.length === 0) {
            console.log('No CPU folders found, skipping UserRoleSystem setup');
            return;
        }
        
        // Template path for BRRole.brrole
        const brRoleTemplatePath = 'LibrariesForAS6/TechnologyPackages/AAS/n.d/ObjectCatalog/Elements/AccessAndSecurity/Template/AccessAndSecurity/UserRoleSystem/BRRole.brrole';
        const userRolePkgTemplatePath = 'LibrariesForAS6/TechnologyPackages/AAS/n.d/ObjectCatalog/Elements/AccessAndSecurity/Template/AccessAndSecurity/UserRoleSystem/Package.pkg';
        const accessSecurityPkgTemplatePath = 'LibrariesForAS6/TechnologyPackages/AAS/n.d/ObjectCatalog/Elements/AccessAndSecurity/Template/AccessAndSecurity/Package.pkg';
        
        try {
            // Fetch template files
            const [brRoleResponse, userRolePkgResponse, accessSecurityPkgResponse] = await Promise.all([
                fetch(brRoleTemplatePath),
                fetch(userRolePkgTemplatePath),
                fetch(accessSecurityPkgTemplatePath)
            ]);
            
            if (!brRoleResponse.ok) {
                console.warn(`Could not fetch BRRole.brrole template: ${brRoleResponse.status}`);
                return;
            }
            if (!userRolePkgResponse.ok) {
                console.warn(`Could not fetch UserRoleSystem Package.pkg template: ${userRolePkgResponse.status}`);
                return;
            }
            if (!accessSecurityPkgResponse.ok) {
                console.warn(`Could not fetch AccessAndSecurity Package.pkg template: ${accessSecurityPkgResponse.status}`);
                return;
            }
            
            const brRoleContent = await brRoleResponse.text();
            const userRolePkgContent = await userRolePkgResponse.text();
            const accessSecurityPkgContent = await accessSecurityPkgResponse.text();
            
            // Add files to each CPU folder
            for (const { cpuPath, separator } of cpuFolders) {
                const accessSecurityPath = cpuPath + separator + 'AccessAndSecurity';
                const userRoleSystemPath = accessSecurityPath + separator + 'UserRoleSystem';
                const brRolePath = userRoleSystemPath + separator + 'BRRole.brrole';
                const userRolePkgPath = userRoleSystemPath + separator + 'Package.pkg';
                const accessSecurityPkgPath = accessSecurityPath + separator + 'Package.pkg';
                
                // Check if BRRole.brrole already exists - if so, skip this CPU
                if (this.projectFiles.has(brRolePath)) {
                    console.log(`BRRole.brrole already exists in ${cpuPath}`);
                    continue;
                }
                
                // Add BRRole.brrole
                this.projectFiles.set(brRolePath, {
                    content: brRoleContent,
                    isBinary: false,
                    type: 'brrole',
                    name: 'BRRole.brrole',
                    extension: '.brrole',
                    hasBOM: false
                });
                console.log(`Added BRRole.brrole to ${userRoleSystemPath}`);
                
                // Add or update UserRoleSystem/Package.pkg
                if (!this.projectFiles.has(userRolePkgPath)) {
                    // Create new UserRoleSystem/Package.pkg with BRRole.brrole
                    this.projectFiles.set(userRolePkgPath, {
                        content: userRolePkgContent,
                        isBinary: false,
                        type: 'package',
                        name: 'Package.pkg',
                        extension: '.pkg',
                        hasBOM: false
                    });
                    console.log(`Created UserRoleSystem/Package.pkg in ${userRoleSystemPath}`);
                } else {
                    // Update existing UserRoleSystem/Package.pkg to include BRRole.brrole if not already present
                    const userRolePkgFile = this.projectFiles.get(userRolePkgPath);
                    if (userRolePkgFile && typeof userRolePkgFile.content === 'string' && 
                        !userRolePkgFile.content.includes('BRRole.brrole')) {
                        let pkgContent = userRolePkgFile.content;
                        const insertPoint = pkgContent.indexOf('</Objects>');
                        if (insertPoint !== -1) {
                            const newEntry = '    <Object Type="File">BRRole.brrole</Object>\n  ';
                            pkgContent = pkgContent.substring(0, insertPoint) + newEntry + pkgContent.substring(insertPoint);
                            this.projectFiles.set(userRolePkgPath, { ...userRolePkgFile, content: pkgContent });
                            console.log(`Updated UserRoleSystem/Package.pkg to include BRRole.brrole`);
                        }
                    }
                }
                
                // Add or update AccessAndSecurity/Package.pkg
                if (!this.projectFiles.has(accessSecurityPkgPath)) {
                    // Create AccessAndSecurity/Package.pkg with just UserRoleSystem
                    const minimalAccessSecurityPkg = `<?xml version="1.0" encoding="utf-8"?>
<?AutomationStudio Version=4.2.1.186?>
<Package PackageType="AccessAndSecurity" xmlns="http://br-automation.co.at/AS/Package">
  <Objects>
    <Object Type="Package">UserRoleSystem</Object>
  </Objects>
</Package>`;
                    this.projectFiles.set(accessSecurityPkgPath, {
                        content: minimalAccessSecurityPkg,
                        isBinary: false,
                        type: 'package',
                        name: 'Package.pkg',
                        extension: '.pkg',
                        hasBOM: false
                    });
                    console.log(`Created AccessAndSecurity/Package.pkg in ${accessSecurityPath}`);
                } else {
                    // Update existing AccessAndSecurity/Package.pkg to include UserRoleSystem if not already present
                    const accessPkgFile = this.projectFiles.get(accessSecurityPkgPath);
                    if (accessPkgFile && typeof accessPkgFile.content === 'string' && 
                        !accessPkgFile.content.includes('UserRoleSystem')) {
                        let pkgContent = accessPkgFile.content;
                        const insertPoint = pkgContent.indexOf('</Objects>');
                        if (insertPoint !== -1) {
                            const newEntry = '    <Object Type="Package">UserRoleSystem</Object>\n  ';
                            pkgContent = pkgContent.substring(0, insertPoint) + newEntry + pkgContent.substring(insertPoint);
                            this.projectFiles.set(accessSecurityPkgPath, { ...accessPkgFile, content: pkgContent });
                            console.log(`Updated AccessAndSecurity/Package.pkg to include UserRoleSystem`);
                        }
                    }
                }
                
                // Add to analysis results
                this.analysisResults.push({
                    severity: 'info',
                    category: 'AccessAndSecurity',
                    name: 'UserRoleSystem Added',
                    description: `Added AccessAndSecurity/UserRoleSystem with BRRole.brrole for AS6 user role definitions`,
                    file: brRolePath,
                    autoFixed: true
                });
            }
        } catch (error) {
            console.error('Failed to add UserRoleSystem files:', error);
        }
    }

    getRequiredTechnologyPackages() {
        // Collect all technology packages and libraries that need to be included
        const requiredPackages = new Map(); // packageName -> { version, libraries: Map, isLibrary2: bool }
        const detectedLibraries = new Set(); // All library names detected in the project
        
        // Build a case-insensitive lookup for library mappings
        const libraryMappingLower = {};
        const libraryMappingOriginalCase = {};
        Object.entries(DeprecationDatabase.as6Format.libraryMapping).forEach(([key, value]) => {
            libraryMappingLower[key.toLowerCase()] = value;
            libraryMappingOriginalCase[key.toLowerCase()] = key; // Keep original case for index lookup
        });
        
        // Helper to add a library to the required packages
        const addLibrary = (libName) => {
            const libNameLower = libName.toLowerCase();
            const mapping = libraryMappingLower[libNameLower];
            const originalCaseLibName = libraryMappingOriginalCase[libNameLower] || libName;
            if (!mapping) return;
            
            if (mapping.techPackage) {
                // Technology Package library
                const packageName = mapping.techPackage;
                const version = mapping.as6Version || '6.0.0';
                const libVersion = mapping.as6LibVersion || version;
                
                if (!requiredPackages.has(packageName)) {
                    requiredPackages.set(packageName, {
                        version: version,
                        libraries: new Map(),
                        isLibrary2: false
                    });
                }
                
                // Use originalCaseLibName to match the index file casing
                requiredPackages.get(packageName).libraries.set(originalCaseLibName, {
                    version: libVersion,
                    source: 'TechnologyPackage'
                });
            } else if (mapping.source === 'Library_2') {
                // Library_2 library
                const libVersion = mapping.as6LibVersion;
                
                // Skip runtime libraries with null version - they're built into AR, no files to fetch
                if (libVersion === null || libVersion === undefined) {
                    return;
                }
                
                if (!requiredPackages.has('Library_2')) {
                    requiredPackages.set('Library_2', {
                        version: null,
                        libraries: new Map(),
                        isLibrary2: true
                    });
                }
                
                // Use originalCaseLibName to match the index file casing
                requiredPackages.get('Library_2').libraries.set(originalCaseLibName, {
                    version: libVersion,
                    source: 'Library_2'
                });
            }
        };
        
        // Method 1: Scan .lby files for <Dependency> tags
        this.projectFiles.forEach((file, path) => {
            if (!path.toLowerCase().endsWith('.lby')) return;
            if (typeof file.content !== 'string') return;
            
            // Extract dependencies from XML: <Dependency ObjectName="LibName" />
            const depPattern = /ObjectName\s*=\s*["']([^"']+)["']/gi;
            let match;
            while ((match = depPattern.exec(file.content)) !== null) {
                const libName = match[1];
                detectedLibraries.add(libName);
            }
        });
        
        // Method 2: Scan code files for library references
        // Look for known library prefixes in function calls and type references
        const libraryPrefixes = Object.keys(DeprecationDatabase.as6Format.libraryMapping);
        
        this.projectFiles.forEach((file, path) => {
            const ext = path.toLowerCase().split('.').pop();
            if (!['st', 'c', 'h', 'typ', 'var', 'fun'].includes(ext)) return;
            if (typeof file.content !== 'string') return;
            
            // Check for each known library name in the content
            for (const libName of libraryPrefixes) {
                // Look for library usage patterns: LibName_Function, LibName.Type, LibNameFunc
                const patterns = [
                    new RegExp(`\\b${libName}_\\w+`, 'i'),      // LibName_Function
                    new RegExp(`\\b${libName}[A-Z]\\w*`, 'i'),  // LibNameFunction (camelCase)
                    new RegExp(`\\bADR\\s*\\(\\s*${libName}`, 'i'), // ADR(libName references
                ];
                
                for (const pattern of patterns) {
                    if (pattern.test(file.content)) {
                        detectedLibraries.add(libName);
                        break;
                    }
                }
            }
        });
        
        // Method 3: Check for libraries in project's Libraries folder
        this.projectFiles.forEach((file, path) => {
            const pathLower = path.toLowerCase();
            if (!pathLower.includes('/libraries/') && !pathLower.includes('\\libraries\\')) {
                return;
            }
            
            const pathParts = path.split(/[/\\]/);
            const libIndex = pathParts.findIndex(p => p.toLowerCase() === 'libraries');
            if (libIndex >= 0 && libIndex < pathParts.length - 1) {
                const libName = pathParts[libIndex + 1];
                detectedLibraries.add(libName);
            }
        });
        
        // Method 4: Scan Package.pkg files for library references
        this.projectFiles.forEach((file, path) => {
            const pathLower = path.toLowerCase();
            if (!pathLower.endsWith('package.pkg')) return;
            if (typeof file.content !== 'string') return;
            
            // Match: <Object Type="Library">LibName</Object> or <Object Type="Library" Description="...">LibName</Object>
            const libPattern = /<Object\s+[^>]*Type\s*=\s*["']Library["'][^>]*>\s*([^<]+?)\s*<\/Object>/gi;
            let match;
            while ((match = libPattern.exec(file.content)) !== null) {
                const libName = match[1].trim();
                if (libName && !libName.includes('<')) {
                    detectedLibraries.add(libName);
                }
            }
        });
        
        // Method 5: Scan .sw files for LibraryObject references
        this.projectFiles.forEach((file, path) => {
            const pathLower = path.toLowerCase();
            if (!pathLower.endsWith('.sw')) return;
            if (typeof file.content !== 'string') return;
            
            // Match: <LibraryObject Name="LibName" ... />
            const libPattern = /<LibraryObject\s+[^>]*Name\s*=\s*["']([^"']+)["']/gi;
            let match;
            while ((match = libPattern.exec(file.content)) !== null) {
                const libName = match[1].trim();
                detectedLibraries.add(libName);
            }
        });
        
        console.log(`Detected ${detectedLibraries.size} library references:`, Array.from(detectedLibraries).join(', '));
        
        // Check for deprecated libraries that need replacement (AsString → AsBrStr, etc.)
        // Add their replacement libraries to the detected set ONLY if not already present
        const deprecatedLibraryReplacements = new Map();
        detectedLibraries.forEach(libName => {
            const deprecation = DeprecationDatabase.findLibrary(libName);
            if (deprecation && deprecation.autoReplace && deprecation.replacement) {
                const replacementLib = deprecation.replacement.name;
                // Only add replacement if it's not already in the project
                const replacementLibLower = replacementLib.toLowerCase();
                const alreadyExists = Array.from(detectedLibraries).some(
                    lib => lib.toLowerCase() === replacementLibLower
                );
                if (!alreadyExists) {
                    deprecatedLibraryReplacements.set(libName, replacementLib);
                    console.log(`  Deprecated library '${libName}' -> replacement '${replacementLib}' will be added`);
                } else {
                    console.log(`  Deprecated library '${libName}' -> replacement '${replacementLib}' already exists in project, skipping`);
                    // Still track the replacement for function renaming purposes
                    deprecatedLibraryReplacements.set(libName, replacementLib);
                }
            }
        });
        
        // Add replacement libraries to detected set (only if not already present)
        deprecatedLibraryReplacements.forEach((replacementLib, oldLib) => {
            const replacementLibLower = replacementLib.toLowerCase();
            const alreadyExists = Array.from(detectedLibraries).some(
                lib => lib.toLowerCase() === replacementLibLower
            );
            if (!alreadyExists) {
                detectedLibraries.add(replacementLib);
            }
        });
        
        // Add all detected libraries to required packages
        detectedLibraries.forEach(libName => {
            const libNameLower = libName.toLowerCase();
            const mapping = libraryMappingLower[libNameLower];
            if (mapping) {
                console.log(`  Library '${libName}' -> mapped to`, mapping);
                addLibrary(libName);
            } else {
                console.log(`  Library '${libName}' -> NO MAPPING (customized library, will not be replaced)`);
            }
        });
        
        // Store deprecated library replacements for later use
        this.deprecatedLibraryReplacements = deprecatedLibraryReplacements;
        
        console.log(`Required packages: ${requiredPackages.size}`);
        requiredPackages.forEach((pkg, name) => {
            console.log(`  ${name}: ${pkg.libraries.size} libraries - ${Array.from(pkg.libraries.keys()).join(', ')}`);
        });
        
        return requiredPackages;
    }

    generateLibraryCopyScript(requiredPackages) {
        // DEPRECATED - no longer used
        // AS6 libraries are now fetched from LibrariesForAS6 folder and included directly
        return '';
    }

    /**
     * Load the AS6 libraries index from the server
     * This index contains the file lists for all available AS6 libraries
     */
    async loadAS6LibrariesIndex() {
        if (this.as6LibrariesIndex) {
            return this.as6LibrariesIndex;
        }
        
        // Check if we're running from file:// protocol - fetch won't work
        if (window.location.protocol === 'file:') {
            console.error('Cannot load AS6 libraries when running from file:// protocol.');
            console.error('Please run this tool via a local web server:');
            console.error('  Option 1: npx http-server (if Node.js is installed)');
            console.error('  Option 2: python -m http.server 8080');
            console.error('  Option 3: Use VS Code Live Server extension');
            return null;
        }
        
        try {
            // Add cache-busting to ensure fresh index is loaded
            const cacheBuster = `?t=${Date.now()}`;
            const response = await fetch('as6-libraries-index.json' + cacheBuster, { cache: 'no-store' });
            if (!response.ok) {
                throw new Error(`Failed to load AS6 libraries index: ${response.status}`);
            }
            this.as6LibrariesIndex = await response.json();
            console.log('AS6 libraries index loaded:', 
                Object.keys(this.as6LibrariesIndex.Library_2 || {}).length, 'Library_2 libraries,',
                Object.keys(this.as6LibrariesIndex.TechnologyPackages || {}).length, 'technology packages');
            return this.as6LibrariesIndex;
        } catch (error) {
            console.error('Failed to load AS6 libraries index:', error);
            console.error('Make sure you are running this tool via a local web server (not opening the HTML file directly)');
            return null;
        }
    }

    /**
     * Fetch AS6 library files from the LibrariesForAS6 folder on the server
     * @param {Map} requiredPackages - Map of required packages from getRequiredTechnologyPackages()
     * @param {Function} progressCallback - Optional callback for progress updates
     * @returns {Promise<Map>} - Map of relativePath -> { content, isBinary } for all library files
     */
    async fetchAS6LibraryFiles(requiredPackages, progressCallback) {
        const libraryFiles = new Map(); // relativePath -> { content, isBinary }
        const baseUrl = 'LibrariesForAS6';
        
        // Load the index
        const index = await this.loadAS6LibrariesIndex();
        if (!index) {
            console.warn('Could not load AS6 libraries index, skipping library replacement');
            return libraryFiles;
        }
        
        // Collect all files we need to fetch
        const filesToFetch = [];
        
        console.log('Processing requiredPackages for library file fetching:', requiredPackages.size, 'packages');
        
        for (const [packageName, pkgInfo] of requiredPackages) {
            console.log(`  Package: ${packageName}, isLibrary2: ${pkgInfo.isLibrary2}, libraries:`, Array.from(pkgInfo.libraries.keys()));
            
            for (const [libName, libInfo] of pkgInfo.libraries) {
                let files = [];
                let basePath = '';
                let hasVersionFolder = false;
                let targetVersionPrefix = '';
                
                if (pkgInfo.isLibrary2) {
                    // Library_2 library
                    const allFiles = index.Library_2?.[libName] || [];
                    console.log(`    Library_2 lookup for '${libName}': found ${allFiles.length} files`);
                    basePath = `${baseUrl}/Library_2/${libName}`;
                    
                    // Check if this library has version subfolders by looking at file paths
                    // Files like "V6.5.0/Binary.lby" indicate version folders
                    const hasVersionSubfolders = allFiles.some(f => /^V\d+\.\d+\.\d+\//.test(f));
                    
                    if (hasVersionSubfolders && libInfo.version) {
                        // Filter to only files for the target version
                        targetVersionPrefix = libInfo.version.startsWith('V') ? libInfo.version : `V${libInfo.version}`;
                        files = allFiles.filter(f => f.startsWith(targetVersionPrefix + '/'));
                        hasVersionFolder = true;
                        console.log(`Library ${libName}: using version ${targetVersionPrefix}, found ${files.length} files`);
                    } else {
                        // No version subfolders, use all files directly
                        files = allFiles;
                    }
                } else {
                    // Technology Package library - find the right version
                    // First try the library's specific version (libInfo.version), then fall back to package version
                    const pkgVersions = index.TechnologyPackages?.[packageName];
                    const libSpecificVersion = libInfo.version; // e.g., "6.2.0" for MpServer
                    
                    if (pkgVersions) {
                        // Try library-specific version first (some libraries like MpServer only exist in certain versions)
                        let versionData = null;
                        let usedVersion = null;
                        
                        // Priority 1: Use the library's specific version from the mapping
                        if (libSpecificVersion && pkgVersions[libSpecificVersion]?.[libName]) {
                            versionData = pkgVersions[libSpecificVersion];
                            usedVersion = libSpecificVersion;
                        }
                        // Priority 2: Fall back to package version
                        else if (pkgVersions[pkgInfo.version]?.[libName]) {
                            versionData = pkgVersions[pkgInfo.version];
                            usedVersion = pkgInfo.version;
                        }
                        // Priority 3: Search all versions to find one that contains this library
                        else {
                            for (const [ver, verData] of Object.entries(pkgVersions)) {
                                if (verData[libName]) {
                                    versionData = verData;
                                    usedVersion = ver;
                                    break;
                                }
                            }
                        }
                        
                        if (versionData && versionData[libName]) {
                            const libData = versionData[libName];
                            files = libData.files || [];
                            basePath = `${baseUrl}/TechnologyPackages/${packageName}/${usedVersion}/Library/${libName}/${libData.version}`;
                            console.log(`      Found ${files.length} files for ${libName}, basePath: ${basePath}`);
                        } else {
                            console.warn(`      Library ${libName} not found in any version of ${packageName}`);
                        }
                    }
                }
                
                if (files.length > 0) {
                    for (const file of files) {
                        // For version-folder libraries, strip the version prefix from target path
                        let targetFile = file;
                        if (hasVersionFolder && targetVersionPrefix) {
                            targetFile = file.substring(targetVersionPrefix.length + 1); // +1 for the /
                        }
                        
                        filesToFetch.push({
                            url: `${basePath}/${file}`,
                            targetPath: `Libraries/${libName}/${targetFile}`,
                            libName
                        });
                    }
                } else {
                    console.warn(`Library ${libName} not found in AS6 libraries index`);
                }
            }
        }
        
        console.log(`Fetching ${filesToFetch.length} AS6 library files...`);
        if (filesToFetch.length > 0) {
            console.log('First 10 files to fetch:');
            filesToFetch.slice(0, 10).forEach((f, i) => console.log(`  ${i+1}. ${f.url} -> ${f.targetPath}`));
        }
        
        // Fetch files in batches to avoid overwhelming the browser
        const batchSize = 20;
        let fetched = 0;
        
        for (let i = 0; i < filesToFetch.length; i += batchSize) {
            const batch = filesToFetch.slice(i, i + batchSize);
            
            const results = await Promise.allSettled(
                batch.map(async (fileInfo) => {
                    const isBinary = this.isBinaryFile(fileInfo.url);
                    try {
                        // Add cache-busting timestamp to ensure fresh files are fetched
                        const cacheBuster = `?t=${Date.now()}`;
                        const response = await fetch(fileInfo.url + cacheBuster, { cache: 'no-store' });
                        if (response.ok) {
                            const content = isBinary 
                                ? await response.arrayBuffer() 
                                : await response.text();
                            return { 
                                path: fileInfo.targetPath, 
                                content, 
                                isBinary,
                                success: true 
                            };
                        } else {
                            console.warn(`Failed to fetch ${fileInfo.url}: HTTP ${response.status}`);
                        }
                    } catch (e) {
                        console.warn(`Error fetching ${fileInfo.url}:`, e.message);
                    }
                    return { path: fileInfo.targetPath, success: false };
                })
            );
            
            for (const result of results) {
                if (result.status === 'fulfilled' && result.value.success) {
                    libraryFiles.set(result.value.path, {
                        content: result.value.content,
                        isBinary: result.value.isBinary
                    });
                    fetched++;
                }
            }
            
            if (progressCallback) {
                progressCallback(fetched, filesToFetch.length);
            }
        }
        
        console.log(`Successfully fetched ${fetched}/${filesToFetch.length} AS6 library files`);
        if (fetched === 0 && filesToFetch.length > 0) {
            console.error('WARNING: No library files were fetched! Check browser console for fetch errors.');
            console.error('Make sure you are running this tool via a web server (not file:// protocol).');
        }
        return libraryFiles;
    }

    isBinaryFile(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        return ['a', 'o', 'br', 'png', 'jpg', 'gif', 'bmp', 'ico'].includes(ext);
    }

    showTechnologyPackageDialog(requiredPackages) {
        return new Promise((resolve) => {
            const dialog = document.getElementById('techPackageDialog');
            const listContainer = document.getElementById('techPackageList');
            const btnContinue = document.getElementById('btnTechPackageContinue');
            const btnCancel = document.getElementById('btnTechPackageCancel');
            
            // Build the list of required packages
            let listHTML = '';
            requiredPackages.forEach((info, packageName) => {
                // Get library names from the Map keys
                const libNames = Array.from(info.libraries.keys());
                const librariesList = libNames.slice(0, 5).join(', ');
                const moreLibs = libNames.length > 5 ? `, +${libNames.length - 5} more` : '';
                
                // Use different icon and format for Library_2 vs Technology Packages
                const icon = info.isLibrary2 ? '📁' : '📦';
                const versionText = info.version ? `<span class="tech-package-version">v${info.version}</span>` : '<span class="tech-package-version">(bundled with AS6)</span>';
                
                listHTML += `
                    <div class="tech-package-item">
                        <span class="tech-package-icon">${icon}</span>
                        <div class="tech-package-info">
                            <div class="tech-package-name">
                                ${packageName} ${versionText}
                            </div>
                            <div class="tech-package-libraries">
                                Libraries: ${librariesList}${moreLibs}
                            </div>
                        </div>
                    </div>
                `;
            });
            
            listContainer.innerHTML = listHTML;
            dialog.classList.remove('hidden');
            
            // Handle button clicks
            const handleContinue = () => {
                dialog.classList.add('hidden');
                btnContinue.removeEventListener('click', handleContinue);
                btnCancel.removeEventListener('click', handleCancel);
                resolve({ continue: true });
            };
            
            const handleCancel = () => {
                dialog.classList.add('hidden');
                btnContinue.removeEventListener('click', handleContinue);
                btnCancel.removeEventListener('click', handleCancel);
                resolve({ continue: false });
            };
            
            btnContinue.addEventListener('click', handleContinue);
            btnCancel.addEventListener('click', handleCancel);
        });
    }

    addFinding(finding) {
        const id = `finding_${this.analysisResults.length + 1}`;
        finding.id = id;
        finding.status = 'pending'; // pending, selected, applied, skipped
        this.analysisResults.push(finding);
    }

    hasFinding(name, file) {
        return this.analysisResults.some(f => f.name === name && f.file === file);
    }

    getLineNumber(content, index) {
        return content.substring(0, index).split('\n').length;
    }

    getCodeContext(content, index, contextLines = 2) {
        const lines = content.split('\n');
        const lineNum = this.getLineNumber(content, index) - 1;
        const start = Math.max(0, lineNum - contextLines);
        const end = Math.min(lines.length, lineNum + contextLines + 1);
        return lines.slice(start, end).join('\n');
    }

    /**
     * Replace a name in code, variable declarations, and comments
     * This ensures comprehensive updates when renaming function blocks or functions
     * @param {string} content - File content
     * @param {string} oldName - Original name to replace
     * @param {string} newName - New name to use
     * @returns {string} - Updated content
     */
    replaceWithVariableAndCommentUpdates(content, oldName, newName) {
        // 1. Replace in code (function block calls, type declarations)
        // Use word boundary to avoid partial matches
        const codePattern = new RegExp(`\\b${this.escapeRegex(oldName)}\\b`, 'g');
        let result = content.replace(codePattern, newName);
        
        // 2. Replace in variable declarations (VAR ... END_VAR blocks)
        // Pattern: variableName : OldFBType; or variableName : OldFBType := ...;
        const varPattern = new RegExp(
            `(:\\s*)${this.escapeRegex(oldName)}(\\s*(?:;|:=|\\())`, 
            'g'
        );
        result = result.replace(varPattern, `$1${newName}$2`);
        
        // 3. Replace in single-line comments ( // ... )
        const singleLineCommentPattern = new RegExp(
            `(\\/\\/.*)\\b${this.escapeRegex(oldName)}\\b`, 
            'g'
        );
        result = result.replace(singleLineCommentPattern, `$1${newName}`);
        
        // 4. Replace in multi-line comments ( (* ... *) )
        const multiLinePattern = new RegExp(
            `(\\(\\*[^*]*?)\\b${this.escapeRegex(oldName)}\\b([^*]*?\\*\\))`, 
            'g'
        );
        result = result.replace(multiLinePattern, `$1${newName}$2`);
        
        return result;
    }

    /**
     * Escape special regex characters in a string
     * @param {string} str - String to escape
     * @returns {string} - Escaped string safe for use in RegExp
     */
    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // ==========================================
    // ANALYSIS UI
    // ==========================================

    displayAnalysisResults() {
        if (this.analysisResults.length === 0) {
            this.elements.analysisEmpty.classList.remove('hidden');
            this.elements.analysisResults.classList.add('hidden');
            
            // Update empty state for successful scan
            this.elements.analysisEmpty.innerHTML = `
                <div class="empty-icon">✅</div>
                <p>No deprecations found!</p>
                <p class="help-text">Your project appears to be compatible with AS6.</p>
            `;
            return;
        }
        
        // Assign unique IDs to all findings if not present
        this.analysisResults.forEach((finding, index) => {
            if (!finding.id) {
                finding.id = `finding_${index}_${Date.now()}`;
            }
        });
        
        this.elements.analysisEmpty.classList.add('hidden');
        this.elements.analysisResults.classList.remove('hidden');
        
        // Update summary counts
        const counts = { error: 0, warning: 0, info: 0, blocking: 0 };
        this.analysisResults.forEach(f => {
            counts[f.severity]++;
            if (f.blocking) counts.blocking++;
        });
        
        this.elements.errorCount.textContent = counts.error;
        this.elements.warningCount.textContent = counts.warning;
        this.elements.infoCount.textContent = counts.info;
        this.elements.compatibleCount.textContent = this.projectFiles.size - this.analysisResults.length;
        
        // Show blocking error banner if there are blocking issues
        if (this.hasBlockingErrors || counts.blocking > 0) {
            this.showBlockingErrorBanner(counts.blocking);
        }
        
        // Render findings list
        this.renderFindingsList();
    }

    renderFindingsList() {
        const container = this.elements.findingsList;
        container.innerHTML = '';
        
        // Group by type
        const grouped = {
            project: [],
            compiler: [],
            runtime: [],
            technology_package: [],
            package: [],
            library: [],
            library_version: [],
            function: [],
            function_block: [],
            hardware: [],
            task_config: [],
            motion: [],
            localization: [],
            visualization: []
        };
        
        this.getFilteredFindings().forEach(finding => {
            if (grouped[finding.type]) {
                grouped[finding.type].push(finding);
            } else {
                grouped.project.push(finding);
            }
        });
        
        // Render each group
        Object.entries(grouped).forEach(([type, findings]) => {
            if (findings.length === 0) return;
            
            const groupEl = document.createElement('div');
            groupEl.className = 'findings-group';
            
            const header = document.createElement('div');
            header.className = 'group-header';
            header.innerHTML = `
                <span class="group-icon">${this.getTypeIcon(type)}</span>
                <span class="group-name">${this.formatTypeName(type)}</span>
                <span class="group-count">(${findings.length})</span>
            `;
            groupEl.appendChild(header);
            
            findings.forEach(finding => {
                groupEl.appendChild(this.createFindingCard(finding));
            });
            
            container.appendChild(groupEl);
        });
        
        this.updateSelectedCount();
    }

    /**
     * Show a prominent banner for blocking errors that prevent AS6 conversion
     * @param {number} blockingCount - Number of blocking issues
     */
    showBlockingErrorBanner(blockingCount) {
        // Remove existing banner if present
        const existingBanner = document.getElementById('blockingErrorBanner');
        if (existingBanner) {
            existingBanner.remove();
        }
        
        // Create blocking error banner
        const banner = document.createElement('div');
        banner.id = 'blockingErrorBanner';
        banner.className = 'blocking-error-banner';
        banner.innerHTML = `
            <div class="blocking-error-content">
                <span class="blocking-icon">🚫</span>
                <div class="blocking-text">
                    <strong>BLOCKING ERRORS DETECTED</strong>
                    <p>${blockingCount} issue(s) must be resolved before AS6 conversion is possible.</p>
                </div>
                <button class="btn btn-small" onclick="document.getElementById('severityFilter').value='error'; window.converter.filterFindings();">
                    Show Blocking Issues
                </button>
            </div>
        `;
        
        // Add banner styling if not present
        if (!document.getElementById('blockingBannerStyles')) {
            const style = document.createElement('style');
            style.id = 'blockingBannerStyles';
            style.textContent = `
                .blocking-error-banner {
                    background: linear-gradient(135deg, #c0392b 0%, #e74c3c 100%);
                    color: white;
                    padding: 15px 20px;
                    border-radius: 8px;
                    margin-bottom: 15px;
                    box-shadow: 0 4px 12px rgba(192, 57, 43, 0.3);
                    animation: pulse-warning 2s infinite;
                }
                @keyframes pulse-warning {
                    0%, 100% { box-shadow: 0 4px 12px rgba(192, 57, 43, 0.3); }
                    50% { box-shadow: 0 4px 20px rgba(192, 57, 43, 0.5); }
                }
                .blocking-error-content {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }
                .blocking-icon {
                    font-size: 32px;
                }
                .blocking-text p {
                    margin: 5px 0 0 0;
                    opacity: 0.9;
                }
                .blocking-error-banner .btn {
                    background: white;
                    color: #c0392b;
                    border: none;
                    flex-shrink: 0;
                }
                .finding-card.severity-error.blocking {
                    border-left: 4px solid #c0392b;
                    background: linear-gradient(to right, rgba(192, 57, 43, 0.1), transparent);
                }
            `;
            document.head.appendChild(style);
        }
        
        // Insert banner before the filter bar
        const filterBar = document.querySelector('.filter-bar');
        if (filterBar && filterBar.parentNode) {
            filterBar.parentNode.insertBefore(banner, filterBar);
        }
        
        // Disable download button when blocking errors exist
        if (this.elements.btnDownload) {
            this.elements.btnDownload.disabled = true;
            this.elements.btnDownload.title = 'Cannot download - blocking errors must be resolved first';
        }
    }

    createFindingCard(finding) {
        const card = document.createElement('div');
        card.className = `finding-card severity-${finding.severity}${finding.blocking ? ' blocking' : ''}`;
        card.dataset.id = finding.id;
        
        const isSelected = this.selectedFindings.has(finding.id);
        
        card.innerHTML = `
            <div class="finding-header">
                <label class="finding-checkbox">
                    <input type="checkbox" ${isSelected ? 'checked' : ''}>
                    <span class="finding-name">${finding.name}</span>
                </label>
                ${finding.blocking ? '<span class="blocking-badge">🚫 BLOCKING</span>' : ''}
                <span class="severity-badge ${finding.severity}">${finding.severity.toUpperCase()}</span>
            </div>
            <div class="finding-body">
                <p class="finding-description">${finding.description}</p>
                ${finding.blocking ? `<div class="blocking-warning">⚠️ This issue must be resolved before AS6 conversion is possible.</div>` : ''}
                <div class="finding-meta">
                    <span class="finding-file">📄 ${finding.file}</span>
                    ${finding.line ? `<span class="finding-line">Line ${finding.line}</span>` : ''}
                </div>
                ${finding.replacement ? `
                    <div class="finding-replacement">
                        <strong>Replacement:</strong> ${finding.replacement.name || finding.replacement}
                        ${finding.replacement.description ? `<br><em>${finding.replacement.description}</em>` : ''}
                    </div>
                ` : '<div class="finding-replacement warning">No direct replacement available</div>'}
                ${finding.notes ? `<div class="finding-notes"><strong>Notes:</strong> ${finding.notes}</div>` : ''}
                ${finding.migration ? `<div class="finding-migration"><strong>Migration:</strong> ${finding.migration}</div>` : ''}
                ${finding.eol ? `<div class="finding-eol"><strong>End of Life:</strong> ${finding.eol}</div>` : ''}
            </div>
            <div class="finding-actions">
                <button class="btn btn-small btn-details" data-id="${finding.id}">📋 Details</button>
            </div>
        `;
        
        // Bind checkbox event
        const checkbox = card.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                this.selectedFindings.add(finding.id);
            } else {
                this.selectedFindings.delete(finding.id);
            }
            this.updateSelectedCount();
        });
        
        // Bind details button
        const detailsBtn = card.querySelector('.btn-details');
        detailsBtn.addEventListener('click', () => this.showFindingDetails(finding));
        
        return card;
    }

    getFilteredFindings() {
        const search = this.elements.searchFilter.value.toLowerCase();
        const severity = this.elements.severityFilter.value;
        const type = this.elements.typeFilter.value;
        
        return this.analysisResults.filter(finding => {
            if (search && !finding.name.toLowerCase().includes(search) && 
                !finding.description.toLowerCase().includes(search)) {
                return false;
            }
            if (severity !== 'all' && finding.severity !== severity) {
                return false;
            }
            if (type !== 'all' && finding.type !== type) {
                return false;
            }
            return true;
        });
    }

    filterFindings() {
        this.renderFindingsList();
    }

    selectAllFindings(select) {
        const filtered = this.getFilteredFindings();
        filtered.forEach(finding => {
            if (select) {
                this.selectedFindings.add(finding.id);
            } else {
                this.selectedFindings.delete(finding.id);
            }
        });
        this.renderFindingsList();
    }

    updateSelectedCount() {
        const count = this.selectedFindings.size;
        this.elements.selectedCount.textContent = `${count} item${count !== 1 ? 's' : ''} selected`;
        this.elements.btnPreview.disabled = count === 0;
    }

    showFindingDetails(finding) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${finding.name}</h3>
                    <button class="modal-close">×</button>
                </div>
                <div class="modal-body">
                    <div class="detail-section">
                        <h4>Description</h4>
                        <p>${finding.description}</p>
                    </div>
                    <div class="detail-section">
                        <h4>Location</h4>
                        <p>File: ${finding.file}<br>Line: ${finding.line || 'N/A'}</p>
                    </div>
                    <div class="detail-section">
                        <h4>Code Context</h4>
                        <pre class="code-block">${this.escapeHtml(finding.context || finding.original)}</pre>
                    </div>
                    ${finding.replacement ? `
                        <div class="detail-section">
                            <h4>Recommended Replacement</h4>
                            <p><strong>${finding.replacement.name || finding.replacement}</strong></p>
                            ${finding.replacement.description ? `<p>${finding.replacement.description}</p>` : ''}
                        </div>
                    ` : ''}
                    ${finding.functionMappings ? `
                        <div class="detail-section">
                            <h4>Function Mappings</h4>
                            <table class="mapping-table">
                                <tr><th>Old</th><th>New</th><th>Notes</th></tr>
                                ${finding.functionMappings.map(m => `
                                    <tr>
                                        <td><code>${m.old}</code></td>
                                        <td><code>${m.new}</code></td>
                                        <td>${m.notes || ''}</td>
                                    </tr>
                                `).join('')}
                            </table>
                        </div>
                    ` : ''}
                    ${finding.notes ? `
                        <div class="detail-section">
                            <h4>Additional Notes</h4>
                            <p>${finding.notes}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    getTypeIcon(type) {
        const icons = {
            library: '📚',
            library_version: '📚',
            function: '⚙️',
            function_block: '🧩',
            deprecated_function_call: '🔄',
            deprecated_constant: '🔢',
            deprecated_motion_type: '🔀',
            deprecated_function_block: '🚫',
            deprecated_struct_member: '🚫',
            deprecated_member_rename: '✏️',
            hardware: '🔌',
            project: '📁',
            technology_package: '📦',
            package: '📋',
            task_config: '⏱️',
            motion: '🔄',
            localization: '🌐',
            compiler: '🛠️',
            runtime: '▶️',
            visualization: '🖥️'
        };
        return icons[type] || '📄';
    }

    formatTypeName(type) {
        const names = {
            library: 'Libraries',
            library_version: 'Library Versions',
            function: 'Functions',
            function_block: 'Function Blocks',
            deprecated_function_call: 'Deprecated Function Calls',
            deprecated_constant: 'Deprecated Constants',
            deprecated_motion_type: 'Deprecated Motion Types',
            deprecated_function_block: 'Removed Function Blocks',
            deprecated_struct_member: 'Removed Struct Members',
            deprecated_member_rename: 'Renamed Members',
            hardware: 'Hardware Modules',
            project: 'Project Format',
            technology_package: 'Technology Packages',
            package: 'Package Files',
            task_config: 'Task Configuration',
            motion: 'Motion & Axis',
            localization: 'Localization (TMX)',
            compiler: 'Compiler Settings',
            runtime: 'Automation Runtime',
            visualization: 'Visualization (VC3/VC4)',
            safety_config: 'Safety Configuration',
            vc_firmware: 'Visual Components'
        };
        return names[type] || type;
    }

    getTypeName(type) {
        return `${this.getTypeIcon(type)} ${this.formatTypeName(type)}`;
    }

    shortenPath(path, maxLength = 50) {
        if (!path) return '';
        if (path.length <= maxLength) return path;
        
        // Try to show the last parts of the path
        const parts = path.split(/[/\\]/);
        let result = parts[parts.length - 1]; // Start with filename
        
        for (let i = parts.length - 2; i >= 0 && result.length < maxLength; i--) {
            const newResult = parts[i] + '/' + result;
            if (newResult.length > maxLength) {
                return '.../' + result;
            }
            result = newResult;
        }
        return result;
    }

    resetAnalysisUI() {
        // Remove blocking error banner if present
        const blockingBanner = document.getElementById('blockingErrorBanner');
        if (blockingBanner) {
            blockingBanner.remove();
        }
        
        // Re-enable download button
        if (this.elements.btnDownload) {
            this.elements.btnDownload.disabled = true; // Will be enabled when there are results
            this.elements.btnDownload.title = '';
        }
        
        this.elements.analysisEmpty.classList.remove('hidden');
        this.elements.analysisResults.classList.add('hidden');
        this.elements.analysisEmpty.innerHTML = `
            <div class="empty-icon">🔍</div>
            <p>No analysis results yet</p>
            <p class="help-text">Upload a project and click "Scan for Deprecations" to begin.</p>
        `;
    }

    // ==========================================
    // PREVIEW & CONVERSION
    // ==========================================

    showPreview() {
        if (this.selectedFindings.size === 0) return;
        
        const selectedItems = this.analysisResults.filter(f => this.selectedFindings.has(f.id));
        
        // Count affected files
        const affectedFiles = new Set(selectedItems.map(f => f.file));
        
        this.elements.previewItemCount.textContent = selectedItems.length;
        this.elements.previewFileCount.textContent = affectedFiles.size;
        
        this.elements.previewEmpty.classList.add('hidden');
        this.elements.previewContent.classList.remove('hidden');
        
        this.renderPreviewList(selectedItems);
        this.switchTab('preview');
    }

    renderPreviewList(items) {
        const container = this.elements.previewList;
        container.innerHTML = '';
        
        items.forEach(finding => {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.dataset.id = finding.id;
            
            const conversion = this.generateConversion(finding);
            const isApplied = this.appliedConversions.has(finding.id);
            
            previewItem.innerHTML = `
                <div class="preview-header" data-toggle="content">
                    <span class="preview-toggle">▼</span>
                    <span class="preview-name">${finding.name}</span>
                    <span class="severity-badge ${finding.severity}">${finding.severity.toUpperCase()}</span>
                    <span class="preview-status ${isApplied ? 'applied' : 'pending'}">
                        ${isApplied ? '✅ Applied' : '⏳ Pending'}
                    </span>
                </div>
                <div class="preview-content">
                    <div class="preview-info">
                        <p><strong>File:</strong> ${finding.file}</p>
                        <p><strong>Type:</strong> ${this.formatTypeName(finding.type)}</p>
                    </div>
                    <div class="code-comparison">
                        <div class="code-before">
                            <h5>Before</h5>
                            <pre class="code-block">${this.escapeHtml(conversion.before)}</pre>
                        </div>
                        <div class="code-after">
                            <h5>After</h5>
                            <pre class="code-block">${this.escapeHtml(conversion.after)}</pre>
                        </div>
                    </div>
                    ${conversion.notes ? `<p class="conversion-notes"><strong>Note:</strong> ${conversion.notes}</p>` : ''}
                    <div class="preview-actions">
                        <button class="btn btn-small btn-apply" data-id="${finding.id}" ${isApplied ? 'disabled' : ''}>
                            ${isApplied ? '✅ Applied' : '✅ Apply'}
                        </button>
                        <button class="btn btn-small btn-undo" data-id="${finding.id}" ${!isApplied ? 'disabled' : ''}>
                            ↩️ Undo
                        </button>
                        <button class="btn btn-small btn-skip" data-id="${finding.id}">
                            ⏭️ Skip
                        </button>
                    </div>
                </div>
            `;
            
            // Bind toggle
            previewItem.querySelector('.preview-header').addEventListener('click', () => {
                previewItem.classList.toggle('collapsed');
                previewItem.querySelector('.preview-toggle').textContent = 
                    previewItem.classList.contains('collapsed') ? '►' : '▼';
            });
            
            // Bind action buttons
            previewItem.querySelector('.btn-apply').addEventListener('click', (e) => {
                e.stopPropagation();
                this.applyConversion(finding.id);
            });
            
            previewItem.querySelector('.btn-undo').addEventListener('click', (e) => {
                e.stopPropagation();
                this.undoConversion(finding.id);
            });
            
            previewItem.querySelector('.btn-skip').addEventListener('click', (e) => {
                e.stopPropagation();
                this.skipConversion(finding.id);
            });
            
            container.appendChild(previewItem);
        });
    }

    generateConversion(finding) {
        let before = finding.context || finding.original || '';
        let after = before;
        let notes = '';
        
        // If no context/original available, return null to signal no conversion possible
        if (!before && finding.type !== 'project') {
            return { before: null, after: null, notes: 'No source context available for conversion.' };
        }
        
        if (finding.type === 'project' && finding.name === 'AS4 Project File') {
            // Full project file conversion to AS6 format
            const file = this.projectFiles.get(finding.file);
            if (file) {
                before = file.content.substring(0, 500) + '\n... (truncated for display)';
                after = DeprecationDatabase.convertProjectFileToAS6(file.content);
                after = after.substring(0, 500) + '\n... (truncated for display)';
                notes = 'Complete project file will be converted to AS6 format with updated XML structure, namespace, and technology packages.';
            }
        } else if (finding.type === 'compiler' && finding.conversion) {
            // GCC compiler version update
            before = finding.original;
            after = `GccVersion="${finding.conversion.to}"`;
            notes = `GCC compiler updated from ${finding.conversion.from} to ${finding.conversion.to}`;
        } else if (finding.type === 'runtime' && finding.conversion) {
            // Automation Runtime version update
            before = finding.original;
            after = `AutomationRuntime Version="${finding.conversion.to}"`;
            notes = `Automation Runtime updated from ${finding.conversion.from} to ${finding.conversion.to}`;
        } else if (finding.type === 'technology_package' && finding.replacement) {
            // Technology package version update
            const oldPkg = finding.original;
            const tpRef = DeprecationDatabase.as6Format.technologyPackages[finding.replacement.name] || 
                          DeprecationDatabase.as6Format.technologyPackages[finding.name];
            if (tpRef) {
                after = `<${finding.replacement.name} Version="${tpRef.as6Version}" />`;
                notes = finding.notes;
            }
        } else if (finding.type === 'library' && finding.replacement) {
            // Replace library name
            const oldLib = finding.name;
            const newLib = finding.replacement.name;
            after = before.replace(new RegExp(oldLib, 'gi'), newLib);
            notes = finding.notes;
        } else if (finding.type === 'function' && finding.replacement) {
            // Replace function name
            const oldFunc = finding.name;
            const newFunc = finding.replacement.name;
            after = before.replace(new RegExp(oldFunc, 'gi'), newFunc);
            notes = finding.replacement.notes || finding.notes;
        } else if (finding.type === 'deprecated_function_call' && finding.conversion) {
            // Deprecated library function call replacement (e.g., memset → brsmemset)
            const oldFunc = finding.conversion.from;
            const newFunc = finding.conversion.to;
            const escapedOld = oldFunc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            after = before.replace(new RegExp(`\\b${escapedOld}\\s*\\(`, 'gi'), `${newFunc}(`);
            notes = finding.notes || `Replace ${oldFunc} with ${newFunc}`;
        } else if (finding.type === 'deprecated_constant' && finding.conversion) {
            // Deprecated constant replacement (e.g., amPI → brmPI)
            const oldConst = finding.conversion.from;
            const newConst = finding.conversion.to;
            const escapedOld = oldConst.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            after = before.replace(new RegExp(`\\b${escapedOld}\\b`, 'gi'), newConst);
            notes = finding.notes || `Replace ${oldConst} with ${newConst}`;
        } else if (finding.type === 'deprecated_motion_type' && finding.conversion) {
            // Deprecated motion type replacement (e.g., McAcpAxCamAutParType → McCamAutParType)
            const oldType = finding.conversion.from;
            const newType = finding.conversion.to;
            const escapedOld = oldType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            after = before.replace(new RegExp(`\\b${escapedOld}\\b`, 'gi'), newType);
            notes = finding.notes || `Replace ${oldType} with ${newType}`;
        } else if (finding.type === 'deprecated_member_rename' && finding.conversion) {
            // Member rename replacement (e.g., MpReportCore_0.Name → MpReportCore_0.FileName)
            // Uses pattern-based replacement to preserve the variable name
            const pattern = new RegExp(finding.conversion.pattern, 'gi');
            after = before.replace(pattern, finding.conversion.replacement);
            notes = finding.notes || `Replace ${finding.conversion.from} with ${finding.conversion.to}`;
        } else if (finding.type === 'hardware' && finding.replacement) {
            // Replace hardware reference
            after = before.replace(finding.name, finding.replacement.name);
            notes = `Hardware replacement: ${finding.name} → ${finding.replacement.name}. Manual verification required.`;
        } else if (finding.type === 'project' || finding.type === 'technology_package') {
            // Project-related findings handled by full conversion
            notes = finding.notes || 'Included in project file conversion.';
        } else {
            notes = 'Manual conversion required. No automatic replacement available.';
        }
        
        return { before, after, notes };
    }

    collectUsedLibraries() {
        const libraries = new Set();
        
        // Collect from Package.pkg files
        this.projectFiles.forEach((file, path) => {
            if (path.toLowerCase().endsWith('package.pkg')) {
                // Extract library references from Package.pkg files
                const objectPattern = /<Object\s+([^>]*)>([^<]*)<\/Object>/gi;
                let match;
                while ((match = objectPattern.exec(file.content)) !== null) {
                    const attrs = match[1];
                    const objectName = match[2].trim();
                    const typeMatch = attrs.match(/Type="([^"]+)"/);
                    if (typeMatch && typeMatch[1] === 'Library') {
                        libraries.add(objectName);
                    }
                }
            }
        });
        
        // Collect from .sw files
        this.projectFiles.forEach((file, path) => {
            if (path.toLowerCase().endsWith('.sw')) {
                const libraryPattern = /<LibraryObject\s+[^>]*Name="([^"]+)"/gi;
                let match;
                while ((match = libraryPattern.exec(file.content)) !== null) {
                    libraries.add(match[1]);
                }
            }
        });
        
        return Array.from(libraries);
    }

    /**
     * Detect technology packages used in the project based on file types and folders
     * This catches packages like mappView that don't have traditional libraries
     */
    detectUsedTechPackages() {
        const techPackages = new Set();
        
        // mappView detection: Look for mappView files/folders
        const mappViewExtensions = ['.binding', '.eventbinding', '.mappviewcfg', '.content', '.page', '.layout', '.dialog'];
        
        this.projectFiles.forEach((file, path) => {
            const pathLower = path.toLowerCase();
            const ext = this.getFileExtension(path);
            
            // Check for mappView by file extensions or folder name
            if (mappViewExtensions.includes(ext) || pathLower.includes('/mappview/') || pathLower.includes('\\mappview\\')) {
                techPackages.add('mappView');
            }
            
            // Check for mappVision by file extensions or folder name
            if (['.visionapplication', '.visioncomponent', '.vicfg'].includes(ext) || 
                pathLower.includes('/mappvision/') || pathLower.includes('\\mappvision\\')) {
                techPackages.add('mappVision');
            }
        });
        
        console.log('Detected technology packages from files:', Array.from(techPackages));
        return Array.from(techPackages);
    }

    applyConversion(findingId) {
        const finding = this.analysisResults.find(f => f.id === findingId);
        if (!finding) {
            console.warn('applyConversion: Finding not found for ID:', findingId);
            return;
        }
        
        const file = this.projectFiles.get(finding.file);
        if (!file) {
            console.warn('applyConversion: File not found:', finding.file);
            return;
        }
        
        // Skip binary files - they can't be text-converted
        if (file.isBinary) {
            console.warn('applyConversion: Skipping binary file:', finding.file);
            finding.status = 'skipped';
            finding.notes = (finding.notes || '') + ' (Binary file - manual conversion required)';
            this.updatePreviewItem(findingId, false);
            return;
        }
        
        // Store original for undo
        const originalContent = file.content;
        
        // Ensure content is a string
        if (typeof originalContent !== 'string') {
            console.warn('applyConversion: File content is not a string:', finding.file);
            finding.status = 'skipped';
            finding.notes = (finding.notes || '') + ' (Non-text content - manual conversion required)';
            this.updatePreviewItem(findingId, false);
            return;
        }
        
        let convertedContent;
        
        // Handle different conversion types
        if (finding.type === 'project' && finding.name === 'AS4 Project File') {
            // Full project file conversion using the database method
            // Collect libraries used in the project for subVersion generation
            const usedLibraries = this.collectUsedLibraries();
            const usedTechPackages = this.detectUsedTechPackages();
            convertedContent = DeprecationDatabase.convertProjectFileToAS6(originalContent, { 
                usedLibraries,
                usedTechPackages 
            });
        } else if (finding.type === 'compiler' && finding.conversion) {
            // GCC compiler version replacement
            convertedContent = originalContent.replace(
                `GccVersion="${finding.conversion.from}"`,
                `GccVersion="${finding.conversion.to}"`
            );
        } else if (finding.type === 'runtime' && finding.conversion) {
            // Automation Runtime version replacement - escape special regex chars in version
            const escapedFrom = finding.conversion.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            convertedContent = originalContent.replace(
                new RegExp(`(AutomationRuntime\\s+Version=")${escapedFrom}(")`,'g'),
                `$1${finding.conversion.to}$2`
            );
        } else if (finding.type === 'library_version' && finding.conversion) {
            // Library version handling
            const conv = finding.conversion;
            
            if (conv.action === 'update_version' && conv.to) {
                // Update library version in .lby file
                let content = originalContent;
                
                // Update the Library Version attribute
                content = content.replace(
                    /<Library\s+Version="[^"]+"/,
                    `<Library Version="${conv.to}"`
                );
                
                // Update all Dependency FromVersion attributes
                content = content.replace(
                    /(<Dependency[^>]*FromVersion=")[^"]+(")/g,
                    `$1${conv.to}$2`
                );
                
                // Update all Dependency ToVersion attributes
                content = content.replace(
                    /(<Dependency[^>]*ToVersion=")[^"]+(")/g,
                    `$1${conv.to}$2`
                );
                
                convertedContent = content;
                finding.notes = (finding.notes || '') + ` [Version updated to ${conv.to}]`;
            } else if (conv.to) {
                // Update version number (for custom libraries)
                const escapedFrom = conv.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                convertedContent = originalContent.replace(
                    new RegExp(`(<Library\\s+[^>]*Version=")${escapedFrom}(")`,'g'),
                    `$1${conv.to}$2`
                );
            } else {
                // No action needed
                convertedContent = originalContent;
            }
        } else if (finding.type === 'function_block' && finding.conversion && finding.autoReplace) {
            // Function block replacement with variable and comment updates
            const oldName = finding.conversion.from;
            const newName = finding.conversion.to;
            
            // Replace all occurrences of the function block name
            // This covers: FB type declarations, FB calls, and references
            convertedContent = this.replaceWithVariableAndCommentUpdates(originalContent, oldName, newName);
            
            // Track variable replacements for cross-file consistency
            this.functionBlockReplacements = this.functionBlockReplacements || new Map();
            this.functionBlockReplacements.set(oldName, newName);
        } else if (finding.type === 'function' && finding.conversion && finding.autoReplace) {
            // Function replacement (e.g., memset → brsmemset)
            const oldFunc = finding.conversion.from;
            const newFunc = finding.conversion.to;
            
            // Replace function call: oldFunc( → newFunc(
            const escapedOld = oldFunc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pattern = new RegExp(`\\b${escapedOld}\\s*\\(`, 'g');
            convertedContent = originalContent.replace(pattern, `${newFunc}(`);
            
            // Track function replacements
            this.functionReplacements = this.functionReplacements || new Map();
            this.functionReplacements.set(oldFunc, newFunc);
        } else if (finding.type === 'deprecated_function_call' && finding.conversion && finding.autoReplace) {
            // Deprecated library function call replacement (AsString → AsBrStr functions)
            const oldFunc = finding.conversion.from;
            const newFunc = finding.conversion.to;
            
            // Replace function call: oldFunc( → newFunc(
            // Use regex to match word boundary to avoid partial replacements
            const escapedOld = oldFunc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pattern = new RegExp(`\\b${escapedOld}\\s*\\(`, 'g');
            convertedContent = originalContent.replace(pattern, `${newFunc}(`);
            
            // Track function replacements for reporting
            this.functionReplacements = this.functionReplacements || new Map();
            this.functionReplacements.set(oldFunc, newFunc);
        } else if (finding.type === 'deprecated_constant' && finding.conversion && finding.autoReplace) {
            // Deprecated library constant replacement (AsMath → AsBrMath constants like amPI → brmPI)
            const oldConst = finding.conversion.from;
            const newConst = finding.conversion.to;
            
            // Replace constant: use word boundary to match standalone identifiers
            const escapedOld = oldConst.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pattern = new RegExp(`\\b${escapedOld}\\b`, 'g');
            convertedContent = originalContent.replace(pattern, newConst);
            
            // Track constant replacements for reporting
            this.constantReplacements = this.constantReplacements || new Map();
            this.constantReplacements.set(oldConst, newConst);
        } else if (finding.type === 'deprecated_motion_type' && finding.conversion && finding.autoReplace) {
            // Deprecated motion type replacement (McAcpAx* → Mc* types)
            const oldType = finding.conversion.from;
            const newType = finding.conversion.to;
            
            // Replace type: use word boundary to match standalone identifiers
            const escapedOld = oldType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pattern = new RegExp(`\\b${escapedOld}\\b`, 'g');
            convertedContent = originalContent.replace(pattern, newType);
            
            // Track type replacements for reporting
            this.motionTypeReplacements = this.motionTypeReplacements || new Map();
            this.motionTypeReplacements.set(oldType, newType);
        } else if (finding.type === 'deprecated_member_rename' && finding.conversion && finding.autoReplace) {
            // Struct/FB member rename (e.g., MpReportCore_0.Name → MpReportCore_0.FileName)
            // Uses pattern-based replacement to only match variables containing the FB type name
            const pattern = new RegExp(finding.conversion.pattern, 'gi');
            convertedContent = originalContent.replace(pattern, finding.conversion.replacement);
            
            // Track member renames for reporting
            this.memberRenames = this.memberRenames || new Map();
            this.memberRenames.set(finding.conversion.from, finding.conversion.to);
        } else if (finding.type === 'library' && finding.autoReplace && finding.replacement) {
            // Library reference replacement (e.g., AsString → AsBrStr in LIBRARY declarations)
            const oldLib = finding.name;
            const newLib = finding.replacement.name;
            
            // Check if this is a Package.pkg file
            if (finding.file.toLowerCase().endsWith('package.pkg')) {
                // For Package.pkg files, check if the replacement library already exists
                // If so, remove the deprecated library entry instead of renaming
                // IMPORTANT: Only match Type="Library", not Type="Package" or Type="File"
                const newLibPattern = new RegExp(`<Object\\s+Type="Library"[^>]*>\\s*${newLib}\\s*<\\/Object>`, 'i');
                const oldLibLinePattern = new RegExp(`\\s*<Object\\s+Type="Library"[^>]*>\\s*${oldLib}\\s*<\\/Object>\\s*\\n?`, 'gi');
                
                if (newLibPattern.test(originalContent)) {
                    // Replacement library already exists - remove the deprecated library entry
                    convertedContent = originalContent.replace(oldLibLinePattern, '');
                    console.log(`Removed duplicate library entry '${oldLib}' from Package.pkg (replacement '${newLib}' already exists)`);
                } else {
                    // Replacement library doesn't exist - rename the deprecated library
                    const escapedOld = oldLib.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const pattern = new RegExp(`(<Object\\s+Type="Library"[^>]*>\\s*)${escapedOld}(\\s*<\\/Object>)`, 'gi');
                    convertedContent = originalContent.replace(pattern, `$1${newLib}$2`);
                }
            } else if (finding.file.toLowerCase().endsWith('.sw')) {
                // For .sw files, check if the replacement library already exists
                // Format: <LibraryObject Name="AsBrStr" ... />
                const newLibPattern = new RegExp(`<LibraryObject\\s+[^>]*Name="${newLib}"`, 'i');
                const oldLibLinePattern = new RegExp(`\\s*<LibraryObject\\s+[^>]*Name="${oldLib}"[^>]*\\/>\\s*\\n?`, 'gi');
                
                if (newLibPattern.test(originalContent)) {
                    // Replacement library already exists - remove the deprecated library entry
                    convertedContent = originalContent.replace(oldLibLinePattern, '');
                    console.log(`Removed duplicate library entry '${oldLib}' from .sw file (replacement '${newLib}' already exists)`);
                } else {
                    // Replacement library doesn't exist - rename the deprecated library
                    const escapedOld = oldLib.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const pattern = new RegExp(`(Name=")${escapedOld}(")`, 'gi');
                    convertedContent = originalContent.replace(pattern, `$1${newLib}$2`);
                }
            } else {
                // Replace LIBRARY declaration in code files: LIBRARY AsString → LIBRARY AsBrStr
                const escapedOld = oldLib.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const pattern = new RegExp(`(\\{?\\s*LIBRARY\\s+)${escapedOld}(\\s*\\}?)`, 'gi');
                convertedContent = originalContent.replace(pattern, `$1${newLib}$2`);
            }
            
            // Track library replacements
            this.libraryReplacements = this.libraryReplacements || new Map();
            this.libraryReplacements.set(oldLib, newLib);
        } else {
            // Standard text replacement conversion
            const conversion = this.generateConversion(finding);
            
            // Ensure conversion has valid before/after values
            if (!conversion || !conversion.before || !conversion.after) {
                // This is expected for informational findings that don't require code changes
                // console.log('applyConversion: Skipping finding (no conversion available):', findingId);
                finding.status = 'skipped';
                finding.notes = (finding.notes || '') + ' (Informational - no automatic conversion needed)';
                this.updatePreviewItem(findingId, false);
                return;
            }
            
            // Check if before and after are the same (no actual change)
            if (conversion.before === conversion.after) {
                // console.log('applyConversion: No change needed for finding:', findingId);
                finding.status = 'skipped';
                finding.notes = (finding.notes || '') + ' (No change needed)';
                this.updatePreviewItem(findingId, false);
                return;
            }
            
            convertedContent = originalContent.replace(conversion.before, conversion.after);
        }
        
        this.appliedConversions.set(findingId, {
            original: originalContent,
            converted: convertedContent
        });
        
        // Apply conversion
        file.content = convertedContent;
        finding.status = 'applied';
        
        // If this is the main project file conversion, also mark related findings as applied
        if (finding.type === 'project' && finding.name === 'AS4 Project File') {
            this.analysisResults.forEach(f => {
                if (f.file === finding.file && 
                    (f.type === 'technology_package' || f.name === 'IEC Settings Format' || f.name === 'Missing XML Namespace')) {
                    f.status = 'applied';
                    f.notes = (f.notes || '') + ' (Included in project file conversion)';
                }
            });
        }
        
        // Update UI
        this.updatePreviewItem(findingId, true);
        this.elements.btnUndoAll.disabled = false;
    }

    undoConversion(findingId) {
        const finding = this.analysisResults.find(f => f.id === findingId);
        if (!finding) return;
        
        const stored = this.appliedConversions.get(findingId);
        if (!stored) return;
        
        const file = this.projectFiles.get(finding.file);
        if (!file) return;
        
        // Restore original
        file.content = stored.original;
        finding.status = 'pending';
        this.appliedConversions.delete(findingId);
        
        // Update UI
        this.updatePreviewItem(findingId, false);
        
        if (this.appliedConversions.size === 0) {
            this.elements.btnUndoAll.disabled = true;
        }
    }

    skipConversion(findingId) {
        const finding = this.analysisResults.find(f => f.id === findingId);
        if (finding) {
            finding.status = 'skipped';
            this.selectedFindings.delete(findingId);
        }
        
        // Remove from preview
        const item = document.querySelector(`.preview-item[data-id="${findingId}"]`);
        if (item) {
            item.remove();
        }
        
        this.updateSelectedCount();
    }

    updatePreviewItem(findingId, isApplied) {
        const item = document.querySelector(`.preview-item[data-id="${findingId}"]`);
        if (!item) return;
        
        const status = item.querySelector('.preview-status');
        const applyBtn = item.querySelector('.btn-apply');
        const undoBtn = item.querySelector('.btn-undo');
        
        status.className = `preview-status ${isApplied ? 'applied' : 'pending'}`;
        status.textContent = isApplied ? '✅ Applied' : '⏳ Pending';
        applyBtn.disabled = isApplied;
        applyBtn.textContent = isApplied ? '✅ Applied' : '✅ Apply';
        undoBtn.disabled = !isApplied;
    }

    applyAllConversions() {
        console.log('applyAllConversions called, selectedFindings:', this.selectedFindings.size);
        
        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;
        
        try {
            this.selectedFindings.forEach(id => {
                if (!this.appliedConversions.has(id)) {
                    try {
                        this.applyConversion(id);
                        // Check if it was skipped or applied
                        const finding = this.analysisResults.find(f => f.id === id);
                        if (finding && finding.status === 'skipped') {
                            skipCount++;
                        } else {
                            successCount++;
                        }
                    } catch (convError) {
                        console.error('Error applying conversion for ID:', id, convError);
                        errorCount++;
                        // Mark the finding as having an error
                        const finding = this.analysisResults.find(f => f.id === id);
                        if (finding) {
                            finding.status = 'error';
                            finding.notes = (finding.notes || '') + ` (Error: ${convError.message})`;
                        }
                    }
                }
            });
            
            console.log(`Conversions complete: ${successCount} applied, ${skipCount} skipped, ${errorCount} errors`);
            
            // Generate report
            this.generateReport();
            
            console.log('Report generated, switching to report tab...');
            
            // Switch to report tab
            this.switchTab('report');
            
        } catch (error) {
            console.error('Error in applyAllConversions:', error);
            alert('Error applying conversions: ' + error.message);
        }
    }

    undoAllConversions() {
        const idsToUndo = Array.from(this.appliedConversions.keys());
        idsToUndo.forEach(id => this.undoConversion(id));
    }

    toggleAllPreviews(expand) {
        document.querySelectorAll('.preview-item').forEach(item => {
            item.classList.toggle('collapsed', !expand);
            item.querySelector('.preview-toggle').textContent = expand ? '▼' : '►';
        });
    }

    resetPreviewUI() {
        this.elements.previewEmpty.classList.remove('hidden');
        this.elements.previewContent.classList.add('hidden');
        this.elements.previewList.innerHTML = '';
    }

    // ==========================================
    // REPORT GENERATION
    // ==========================================

    generateReport() {
        const report = this.buildReportData();
        
        this.elements.reportEmpty.classList.add('hidden');
        this.elements.reportContent.classList.remove('hidden');
        
        // Set date
        this.elements.reportDate.textContent = new Date().toLocaleString();
        
        // Render summary
        this.elements.reportSummary.innerHTML = `
            <div class="report-stats">
                <div class="stat-item">
                    <span class="stat-value">${report.totalFindings}</span>
                    <span class="stat-label">Total Issues Found</span>
                </div>
                <div class="stat-item error">
                    <span class="stat-value">${report.bySeveity.error}</span>
                    <span class="stat-label">Errors (Blocking)</span>
                </div>
                <div class="stat-item warning">
                    <span class="stat-value">${report.bySeveity.warning}</span>
                    <span class="stat-label">Warnings</span>
                </div>
                <div class="stat-item info">
                    <span class="stat-value">${report.bySeveity.info}</span>
                    <span class="stat-label">Info</span>
                </div>
            </div>
            <div class="report-progress">
                <div class="progress-item">
                    <span class="progress-label">Conversions Applied:</span>
                    <span class="progress-value">${report.applied} of ${report.totalFindings}</span>
                </div>
                <div class="progress-item">
                    <span class="progress-label">Files Modified:</span>
                    <span class="progress-value">${report.filesModified}</span>
                </div>
            </div>
        `;
        
        // Render findings table - grouped by type in collapsible sections
        const findingsByType = {};
        this.analysisResults.forEach(f => {
            const typeName = this.getTypeName(f.type);
            if (!findingsByType[typeName]) {
                findingsByType[typeName] = [];
            }
            findingsByType[typeName].push(f);
        });

        let findingsHTML = '';
        Object.entries(findingsByType).forEach(([typeName, findings]) => {
            const errorCount = findings.filter(f => f.severity === 'error').length;
            const warningCount = findings.filter(f => f.severity === 'warning').length;
            const appliedCount = findings.filter(f => f.status === 'applied').length;
            
            // Determine badge class based on severity
            let badgeClass = 'info';
            if (errorCount > 0) badgeClass = 'error';
            else if (warningCount > 0) badgeClass = 'warning';
            
            findingsHTML += `
                <details class="findings-group">
                    <summary class="findings-group-header">
                        <span class="findings-group-title">${typeName}</span>
                        <span class="findings-group-badges">
                            <span class="badge count">${findings.length} items</span>
                            ${errorCount > 0 ? `<span class="badge error">${errorCount} errors</span>` : ''}
                            ${warningCount > 0 ? `<span class="badge warning">${warningCount} warnings</span>` : ''}
                            ${appliedCount > 0 ? `<span class="badge applied">${appliedCount} applied</span>` : ''}
                        </span>
                    </summary>
                    <div class="findings-group-content">
                        <table class="report-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Severity</th>
                                    <th>File</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${findings.map(f => `
                                    <tr class="${f.status}">
                                        <td>${f.name}</td>
                                        <td><span class="severity-badge ${f.severity}">${f.severity}</span></td>
                                        <td title="${f.file}">${this.shortenPath(f.file)}</td>
                                        <td><span class="status-badge ${f.status || 'pending'}">${f.status || 'pending'}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </details>
            `;
        });

        this.elements.reportFindings.innerHTML = findingsHTML || '<p>No findings to display.</p>';
        
        // Render changes
        const appliedChanges = this.analysisResults.filter(f => f.status === 'applied');
        this.elements.reportChanges.innerHTML = appliedChanges.length > 0 ? `
            <div class="changes-list">
                ${appliedChanges.map(f => {
                    const conv = this.generateConversion(f);
                    const beforeText = (conv && conv.before) ? conv.before.substring(0, 100) : '(no preview)';
                    const afterText = (conv && conv.after) ? conv.after.substring(0, 100) : '(no preview)';
                    return `
                        <div class="change-item">
                            <h5>${f.name} (${f.file || 'auto-applied'})</h5>
                            <div class="code-diff">
                                <div class="diff-before"><span class="diff-label">-</span> ${this.escapeHtml(beforeText)}...</div>
                                <div class="diff-after"><span class="diff-label">+</span> ${this.escapeHtml(afterText)}...</div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        ` : '<p>No changes applied yet.</p>';
        
        // Render recommendations
        const hasLibraryReplacements = this.deprecatedLibraryReplacements && this.deprecatedLibraryReplacements.size > 0;
        const libraryReplacementNotes = hasLibraryReplacements ? 
            Array.from(this.deprecatedLibraryReplacements.entries())
                .map(([old, newLib]) => `<li class="info">🔄 Library ${old} → ${newLib}: Function calls and library references have been updated.</li>`)
                .join('') : '';
        
        this.elements.reportRecommendations.innerHTML = `
            <ul class="recommendations-list">
                ${report.bySeveity.error > 0 ? '<li class="error">⚠️ Address all ERROR severity items before migrating to AS6.</li>' : ''}
                ${report.bySeveity.warning > 0 ? '<li class="warning">📋 Review WARNING items and plan updates accordingly.</li>' : ''}
                ${libraryReplacementNotes}
                <li>✅ Test all converted code thoroughly in AS6 environment.</li>
                <li>📚 Consult B&R documentation for detailed migration guides.</li>
                <li>💾 Keep backups of original AS4 project files.</li>
            </ul>
        `;
        
        this.switchTab('report');
    }

    buildReportData() {
        const bySeveity = { error: 0, warning: 0, info: 0 };
        this.analysisResults.forEach(f => bySeveity[f.severity]++);
        
        const filesModified = new Set();
        this.appliedConversions.forEach((_, id) => {
            const finding = this.analysisResults.find(f => f.id === id);
            if (finding) filesModified.add(finding.file);
        });
        
        return {
            timestamp: new Date().toISOString(),
            totalFindings: this.analysisResults.length,
            bySeveity,
            applied: this.appliedConversions.size,
            skipped: this.analysisResults.filter(f => f.status === 'skipped').length,
            filesModified: filesModified.size,
            findings: this.analysisResults
        };
    }

    resetReportUI() {
        this.elements.reportEmpty.classList.remove('hidden');
        this.elements.reportContent.classList.add('hidden');
    }

    // ==========================================
    // EXPORT FUNCTIONS
    // ==========================================

    exportReport(format) {
        const report = this.buildReportData();
        let content, filename, mimeType;
        
        switch (format) {
            case 'json':
                content = JSON.stringify(report, null, 2);
                filename = 'as4-to-as6-report.json';
                mimeType = 'application/json';
                break;
                
            case 'csv':
                content = this.generateCSV(report);
                filename = 'as4-to-as6-report.csv';
                mimeType = 'text/csv';
                break;
                
            case 'html':
            default:
                content = this.generateHTMLReport(report);
                filename = 'as4-to-as6-report.html';
                mimeType = 'text/html';
                break;
        }
        
        this.downloadFile(content, filename, mimeType);
    }

    generateCSV(report) {
        const headers = ['Type', 'Name', 'Severity', 'Description', 'File', 'Line', 'Replacement', 'Status'];
        const rows = report.findings.map(f => [
            f.type,
            f.name,
            f.severity,
            `"${f.description.replace(/"/g, '""')}"`,
            f.file,
            f.line || '',
            f.replacement ? f.replacement.name || f.replacement : '',
            f.status
        ]);
        
        return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }

    generateHTMLReport(report) {
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>AS4 to AS6 Conversion Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #2c3e50; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .summary-card { padding: 15px; border-radius: 8px; text-align: center; }
        .error { background: #ffe0e0; }
        .warning { background: #fff3cd; }
        .info { background: #d1ecf1; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
        th { background: #f5f5f5; }
        .severity-badge { padding: 3px 8px; border-radius: 4px; font-size: 12px; }
        .severity-badge.error { background: #e74c3c; color: white; }
        .severity-badge.warning { background: #f39c12; color: white; }
        .severity-badge.info { background: #3498db; color: white; }
    </style>
</head>
<body>
    <h1>AS4 to AS6 Conversion Report</h1>
    <p>Generated: ${report.timestamp}</p>
    
    <h2>Summary</h2>
    <div class="summary">
        <div class="summary-card error">
            <h3>${report.bySeveity.error}</h3>
            <p>Errors</p>
        </div>
        <div class="summary-card warning">
            <h3>${report.bySeveity.warning}</h3>
            <p>Warnings</p>
        </div>
        <div class="summary-card info">
            <h3>${report.bySeveity.info}</h3>
            <p>Info</p>
        </div>
    </div>
    
    <h2>Findings</h2>
    <table>
        <thead>
            <tr>
                <th>Type</th>
                <th>Name</th>
                <th>Severity</th>
                <th>Description</th>
                <th>File</th>
                <th>Replacement</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            ${report.findings.map(f => `
                <tr>
                    <td>${f.type}</td>
                    <td>${f.name}</td>
                    <td><span class="severity-badge ${f.severity}">${f.severity}</span></td>
                    <td>${f.description}</td>
                    <td>${f.file}</td>
                    <td>${f.replacement ? (f.replacement.name || f.replacement) : 'N/A'}</td>
                    <td>${f.status}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    <h2>Recommendations</h2>
    <ul>
        <li>Address all ERROR severity items before migrating to AS6.</li>
        <li>Test converted code thoroughly in AS6 environment.</li>
        <li>Consult B&R documentation for detailed migration guides.</li>
    </ul>
</body>
</html>`;
    }

    async downloadConvertedProject() {
        // Check for blocking errors before allowing download
        if (this.hasBlockingErrors) {
            const blockingFindings = this.analysisResults.filter(f => f.blocking || f.severity === 'error');
            const blockingMessages = blockingFindings.map(f => `• ${f.name}: ${f.description}`).join('\n');
            alert(`Cannot download converted project - blocking errors found:\n\n${blockingMessages}\n\nResolve these issues in the source AS4 project before migrating to AS6.`);
            return;
        }
        
        // Check if JSZip is available
        if (typeof JSZip === 'undefined') {
            alert('JSZip library not loaded. Please check your internet connection and refresh the page.');
            return;
        }
        
        // Check for required technology packages and show warning dialog
        const requiredPackages = this.getRequiredTechnologyPackages();
        
        if (requiredPackages.size > 0) {
            const dialogResult = await this.showTechnologyPackageDialog(requiredPackages);
            if (!dialogResult.continue) {
                return; // User cancelled
            }
        }
        
        // Replace acp10sys.br files in Physical folders with AS6 version
        await this.replaceAcp10sysBrFiles();
        
        // Add mCoWebSc.mcowebservercfg to mappCockpit folders if mappCockpit is used
        await this.addMappCockpitWebServerConfig();
        
        // Add AccessAndSecurity/UserRoleSystem with BRRole.brrole to all CPU configurations
        await this.addUserRoleSystemFiles();
        
        // Show progress dialog
        const progressDialog = document.getElementById('downloadProgressDialog');
        const progressBar = document.getElementById('progressBar');
        const progressPercent = document.getElementById('progressPercent');
        const progressMessage = document.getElementById('progressMessage');
        
        progressDialog.classList.remove('hidden');
        progressBar.style.width = '0%';
        progressPercent.textContent = '0%';
        progressMessage.textContent = 'Creating ZIP archive...';
        
        const zip = new JSZip();
        const projectName = this.getProjectName();
        
        // Create project folder in ZIP
        const projectFolder = zip.folder(projectName + '_AS6');
        
        // Build the set of technology package libraries that SHOULD be replaced with AS6 versions.
        // Libraries without AS6 replacement files (as6LibVersion: null) are kept as-is from AS4.
        const techPackageLibraries = new Set();
        
        Object.entries(DeprecationDatabase.as6Format.libraryMapping).forEach(([libName, mapping]) => {
            const hasReplacementFiles = mapping.as6LibVersion !== null && mapping.as6LibVersion !== undefined;
            if ((mapping.techPackage || mapping.source === 'Library_2') && hasReplacementFiles) {
                techPackageLibraries.add(libName.toLowerCase());
            }
        });
        
        // ── Fetch AS6 library files FIRST, so we know which replacements succeeded ──
        // This prevents the scenario where AS4 files are skipped but the fetch fails,
        // leaving the converted project with missing libraries.
        let as6LibraryFiles = new Map();
        let successfullyFetchedLibraries = new Set(); // lowercase lib names that were actually fetched
        
        if (requiredPackages.size > 0) {
            progressMessage.textContent = 'Fetching AS6 library files...';
            progressBar.style.width = '5%';
            progressPercent.textContent = '5%';
            
            console.log('=== Starting AS6 library fetch ===');
            console.log('Required packages:', requiredPackages.size);
            requiredPackages.forEach((pkg, name) => {
                console.log(`  Package: ${name}, libraries: ${pkg.libraries.size}`);
                pkg.libraries.forEach((lib, libName) => {
                    console.log(`    - ${libName}: version=${lib.version}`);
                });
            });
            
            as6LibraryFiles = await this.fetchAS6LibraryFiles(requiredPackages, (fetched, total) => {
                const pct = 5 + Math.floor((fetched / total) * 15);
                progressBar.style.width = pct + '%';
                progressPercent.textContent = pct + '%';
            });
            
            console.log(`=== Fetched ${as6LibraryFiles.size} AS6 library files ===`);
            if (as6LibraryFiles.size > 0) {
                const fileList = Array.from(as6LibraryFiles.keys());
                console.log('First 10 fetched files:', fileList.slice(0, 10));
            }
            
            // Build set of library names for which we actually fetched replacement files
            for (const [relativePath] of as6LibraryFiles) {
                const libMatch = relativePath.match(/^Libraries[/\\]([^/\\]+)/i);
                if (libMatch) {
                    successfullyFetchedLibraries.add(libMatch[1].toLowerCase());
                }
            }
            console.log(`Successfully fetched replacements for ${successfullyFetchedLibraries.size} libraries: ${Array.from(successfullyFetchedLibraries).join(', ')}`);
            
            // Warn about libraries that should have been replaced but weren't fetched
            const missingReplacements = [];
            for (const libName of techPackageLibraries) {
                if (!successfullyFetchedLibraries.has(libName)) {
                    missingReplacements.push(libName);
                }
            }
            if (missingReplacements.length > 0) {
                console.warn(`WARNING: ${missingReplacements.length} library replacements could not be fetched (AS4 versions will be kept): ${missingReplacements.join(', ')}`);
            }
        } else {
            console.log('=== No required packages detected, skipping AS6 library fetch ===');
        }
        
        // ── Add project files to ZIP, skipping ONLY libraries that were successfully fetched ──
        progressMessage.textContent = 'Creating ZIP archive...';
        let fileCount = 0;
        let skippedLibraryFiles = 0;
        const totalFiles = this.projectFiles.size;
        this.projectFiles.forEach((file, path) => {
            const pathParts = path.toLowerCase().split(/[/\\]/);
            const libIndex = pathParts.indexOf('libraries');
            let skipLibraryFile = false;
            
            if (libIndex >= 0 && libIndex < pathParts.length - 1) {
                const libName = pathParts[libIndex + 1];
                // Only skip if we SUCCESSFULLY fetched AS6 replacement files for this library
                if (successfullyFetchedLibraries.has(libName)) {
                    skipLibraryFile = true;
                    skippedLibraryFiles++;
                }
            }
            
            if (!skipLibraryFile) {
                if (file.isBinary) {
                    projectFolder.file(path, file.content, { binary: true });
                } else {
                    projectFolder.file(path, file.content);
                }
            }
            fileCount++;
            const percent = 20 + Math.floor((fileCount / totalFiles) * 30);
            progressBar.style.width = percent + '%';
            progressPercent.textContent = percent + '%';
        });
        
        if (skippedLibraryFiles > 0) {
            console.log(`Skipped ${skippedLibraryFiles} AS4 library files (replaced with AS6 versions)`);
        }
        
        // Add AS6 structural changes info
        progressMessage.textContent = 'Adding migration information...';
        progressBar.style.width = '55%';
        progressPercent.textContent = '55%';
        
        const structuralChanges = DeprecationDatabase.getAS6StructuralChanges();
        projectFolder.file('_AS6_migration_info.json', JSON.stringify({
            conversionDate: new Date().toISOString(),
            sourceVersion: 'AS4.x',
            targetVersion: 'AS6.x',
            structuralChanges: structuralChanges,
            libraryUpdates: 'Technology package libraries have been replaced with AS6 versions.',
            libraryFilesReplaced: skippedLibraryFiles,
            as6LibrariesIncluded: requiredPackages.size > 0,
            notes: [
                'This project has been converted from AS4 to AS6 format.',
                'Review all changes before importing into Automation Studio 6.',
                'Library .lby files have been updated with AS6-compatible version numbers.',
                'AS6 library files have been included from bundled Technology Packages.',
                'The project should be ready to open in Automation Studio 6.'
            ]
        }, null, 2));
        
        // Add conversion report as JSON
        const report = this.buildReportData();
        projectFolder.file('_conversion-report.json', JSON.stringify(report, null, 2));
        
        // Add conversion summary as text
        const summary = this.generateConversionSummary();
        projectFolder.file('_conversion-summary.txt', summary);
        
        // Add fetched AS6 library files to the ZIP (in Logical/Libraries folder)
        if (as6LibraryFiles.size > 0) {
            progressMessage.textContent = 'Adding AS6 library files to ZIP...';
            progressBar.style.width = '56%';
            progressPercent.textContent = '56%';
            
            // Determine the project folder prefix from existing files
            let projectFolderPrefix = '';
            for (const [path] of this.projectFiles) {
                if (path.toLowerCase().includes('safelogic')) continue;
                const logicalLibrariesMatch = path.match(/^(.*?)Logical[/\\]Libraries[/\\]/i);
                if (logicalLibrariesMatch) {
                    projectFolderPrefix = logicalLibrariesMatch[1];
                    break;
                }
            }
            
            if (!projectFolderPrefix) {
                for (const [path] of this.projectFiles) {
                    if (path.toLowerCase().includes('safelogic')) continue;
                    const logicalMatch = path.match(/^(.*?)Logical[/\\]/i);
                    if (logicalMatch) {
                        projectFolderPrefix = logicalMatch[1];
                        break;
                    }
                }
            }
            
            console.log(`Project folder prefix: "${projectFolderPrefix}"`);
            
            // Build set of custom library paths (NOT being replaced) to avoid overwriting them
            const existingLibraryPaths = new Set();
            for (const [path] of this.projectFiles) {
                const pathLower = path.toLowerCase();
                if (pathLower.includes('/libraries/') || pathLower.includes('\\libraries\\')) {
                    const libMatch = pathLower.match(/libraries[/\\]([^/\\]+)/i);
                    if (libMatch) {
                        const libName = libMatch[1].toLowerCase();
                        if (!techPackageLibraries.has(libName)) {
                            existingLibraryPaths.add(libName);
                        }
                    }
                }
            }
            
            let addedLibFiles = 0;
            let skippedLibFiles = 0;
            for (const [relativePath, fileData] of as6LibraryFiles) {
                const libMatch = relativePath.match(/^Libraries[/\\]([^/\\]+)/i);
                const libName = libMatch ? libMatch[1].toLowerCase() : null;
                
                if (libName && existingLibraryPaths.has(libName)) {
                    if (skippedLibFiles < 3) {
                        console.log(`  Skipping (custom library, not being replaced): ${relativePath}`);
                    }
                    skippedLibFiles++;
                    continue;
                }
                
                const zipPath = `${projectFolderPrefix}Logical/${relativePath}`;
                if (addedLibFiles < 5) {
                    console.log(`  Adding: ${zipPath} (binary: ${fileData.isBinary})`);
                }
                if (fileData.isBinary) {
                    projectFolder.file(zipPath, fileData.content, { binary: true });
                } else {
                    projectFolder.file(zipPath, fileData.content);
                }
                addedLibFiles++;
            }
            console.log(`Added ${addedLibFiles} AS6 library files to ZIP, skipped ${skippedLibFiles} (custom libraries not being replaced)`);
        } else if (requiredPackages.size > 0) {
            // Required packages were detected but no files were fetched - show warning
            const missingLibs = Array.from(techPackageLibraries).join(', ');
            console.error('WARNING: AS6 library files could not be fetched. AS4 library versions have been preserved as fallback.');
            console.error('Libraries that could not be updated:', missingLibs);
            console.error('Make sure you are running this tool via a web server (not file:// protocol).');
            
            const warningNote = `\n\n=== WARNING ===\nAS6 library files could not be fetched. The AS4 library versions have been preserved as fallback.\nThe following libraries were NOT updated to AS6 versions:\n${missingLibs}\n\nTo fix: ensure you are running this tool via a web server and check the browser console for errors.`;
            projectFolder.file('_conversion-summary.txt', summary + warningNote);
        }
        
        // Generate ZIP file
        try {
            progressMessage.textContent = 'Compressing files...';
            progressBar.style.width = '60%';
            progressPercent.textContent = '60%';
            
            const blob = await zip.generateAsync({ 
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
            }, (metadata) => {
                // Update progress during compression
                const percent = 60 + Math.floor(metadata.percent * 0.4); // 60-100%
                progressBar.style.width = percent + '%';
                progressPercent.textContent = percent + '%';
            });
            
            // Download the ZIP
            progressMessage.textContent = 'Finalizing download...';
            progressBar.style.width = '95%';
            progressPercent.textContent = '95%';
            
            const filename = `${projectName}_AS6_converted.zip`;
            this.downloadBlob(blob, filename);
            
            // Complete
            progressBar.style.width = '100%';
            progressPercent.textContent = '100%';
            progressMessage.textContent = 'Download complete!';
            
            // Hide dialog after 1 second
            setTimeout(() => {
                progressDialog.classList.add('hidden');
            }, 1000);
            
        } catch (error) {
            console.error('Error creating ZIP:', error);
            progressDialog.classList.add('hidden');
            alert('Error creating ZIP file: ' + error.message);
        }
    }
    
    getProjectName() {
        // Try to extract project name from .apj file or folder structure
        for (const [path, file] of this.projectFiles) {
            if (file.extension === '.apj') {
                // Use the .apj filename without extension
                return file.name.replace('.apj', '');
            }
        }
        
        // Fallback: use first folder name or default
        const firstPath = Array.from(this.projectFiles.keys())[0] || '';
        const parts = firstPath.split(/[\/\\]/);
        if (parts.length > 1) {
            return parts[0];
        }
        
        return 'AS6_Project';
    }
    
    generateConversionSummary() {
        const report = this.buildReportData();
        let summary = '============================================\n';
        summary += '  AS4 to AS6 Conversion Summary\n';
        summary += '============================================\n\n';
        summary += `Generated: ${new Date().toLocaleString()}\n`;
        summary += `Tool Version: 1.0\n\n`;
        
        summary += '--- Statistics ---\n';
        summary += `Total Issues Found: ${report.totalFindings}\n`;
        summary += `  - Errors: ${report.bySeveity.error}\n`;
        summary += `  - Warnings: ${report.bySeveity.warning}\n`;
        summary += `  - Info: ${report.bySeveity.info}\n\n`;
        
        summary += `Conversions Applied: ${report.applied}\n`;
        summary += `Conversions Skipped: ${report.skipped}\n`;
        summary += `Files Modified: ${report.filesModified}\n\n`;
        
        summary += '--- Applied Changes ---\n';
        this.analysisResults.filter(f => f.status === 'applied').forEach(f => {
            summary += `[${f.severity.toUpperCase()}] ${f.name}\n`;
            summary += `  File: ${f.file}\n`;
            if (f.replacement) {
                summary += `  Replaced with: ${f.replacement.name || f.replacement}\n`;
            }
            summary += '\n';
        });
        
        summary += '--- Pending/Skipped Items ---\n';
        this.analysisResults.filter(f => f.status !== 'applied').forEach(f => {
            summary += `[${f.severity.toUpperCase()}] ${f.name} - ${f.status}\n`;
            summary += `  File: ${f.file}\n`;
            if (f.notes) {
                summary += `  Notes: ${f.notes}\n`;
            }
            summary += '\n';
        });
        
        summary += '============================================\n';
        summary += '  Please review all changes before use!\n';
        summary += '============================================\n';
        
        return summary;
    }
    
    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ==========================================
    // UTILITIES
    // ==========================================

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    window.converter = new AS4Converter();
});
