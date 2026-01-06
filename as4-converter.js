/**
 * AS4 to AS6 Conversion Tool
 * Main application logic for analyzing and converting B&R Automation Studio projects
 */

class AS4Converter {
    constructor() {
        this.projectFiles = new Map(); // filename -> { content, type, path }
        this.analysisResults = []; // Array of Finding objects
        this.selectedFindings = new Set(); // IDs of selected items
        this.appliedConversions = new Map(); // finding ID -> { original, converted }
        this.undoStack = [];
        this.isEdgeBrowser = this.detectEdge();
        
        this.initializeUI();
        this.bindEvents();
        this.checkBrowserCompatibility();
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
                dirReader.readEntries(async entries => {
                    for (const entry of entries) {
                        await this.traverseFileTree(entry, files, path + item.name + '/');
                    }
                    resolve();
                });
            }
        });
    }

    handleFolderSelect(files) {
        try {
            const fileArray = Array.from(files);
            
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
        
        // All supported B&R Automation Studio file extensions
        const relevantExtensions = [
            // Code files
            '.st', '.fun', '.typ', '.var', '.prg', '.svar',
            // Hardware and config
            '.hw', '.hwl', '.sw', '.per',
            // Project and package
            '.xml', '.pkg', '.apj',
            // Motion/Axis
            '.ax', '.apt', '.ncm', '.ncc', '.dob',
            // Localization
            '.tmx', '.textconfig', '.units',
            // I/O and mapping
            '.iom', '.vvm',
            // Libraries
            '.lby', '.br',
            // mappView / Visualization
            '.content', '.eventbinding', '.binding', '.action',
            '.page', '.layout', '.dialog', '.theme', '.styles',
            '.vis', '.mappviewcfg', '.widgetlibrary', '.snippet',
            // OPC UA
            '.uaserver',
            // mapp components
            '.mpalarmxcore', '.mpalarmxhistory', '.mprecipexml', '.mprecipecsv', '.mpdatarecorder',
            // Security and access
            '.role', '.user', '.firewallRules',
            // DTM / Device configuration
            '.dtm', '.dtmdre', '.dtmtre', '.dtmdri',
            // Media/assets
            '.jpg', '.svg', '.png',
            // Documentation
            '.md', '.doc'
        ];
        // Folders to exclude (temp/build artifacts)
        const excludedFolders = ['Temp', 'Binaries', 'Diagnosis'];
        
        const relevantFiles = files.filter(file => {
            const filePath = file.relativePath || file.webkitRelativePath || file.name;
            const pathParts = filePath.split(/[/\\]/);
            
            // Exclude files in temp/build folders
            if (pathParts.some(part => excludedFolders.includes(part))) {
                return false;
            }
            
            const ext = this.getFileExtension(file.name);
            return relevantExtensions.includes(ext);
        });
        
        // Show progress
        this.elements.btnScan.textContent = `Loading... 0/${relevantFiles.length}`;
        this.elements.btnScan.disabled = true;
        
        for (let i = 0; i < relevantFiles.length; i += batchSize) {
            const batch = relevantFiles.slice(i, i + batchSize);
            
            await Promise.all(batch.map(async (file) => {
                try {
                    const content = await this.readFileContent(file);
                    const ext = this.getFileExtension(file.name);
                    const type = this.getFileType(ext);
                    
                    this.projectFiles.set(file.relativePath || file.webkitRelativePath || file.name, {
                        content,
                        type,
                        name: file.name,
                        extension: ext
                    });
                } catch (err) {
                    console.warn(`Failed to read file: ${file.name}`, err);
                }
            }));
            
            // Update progress and yield to UI
            this.elements.btnScan.textContent = `Loading... ${Math.min(i + batchSize, relevantFiles.length)}/${relevantFiles.length}`;
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        this.elements.btnScan.textContent = '🔍 Scan for Deprecations';
        this.updateProjectInfo();
    }

    async handleZipUpload(file) {
        // Note: Full ZIP support would require a library like JSZip
        // For now, show a message
        alert('ZIP upload requires the JSZip library. Please use folder selection instead.');
    }

    async processFiles(files) {
        try {
            this.projectFiles.clear();
            
            // All supported B&R Automation Studio file extensions
            const relevantExtensions = [
                // Code files
                '.st', '.fun', '.typ', '.var', '.prg', '.svar',
                // Hardware and config
                '.hw', '.hwl', '.sw', '.per',
                // Project and package
                '.xml', '.pkg', '.apj',
                // Motion/Axis
                '.ax', '.apt', '.ncm', '.ncc', '.dob',
                // Localization
                '.tmx', '.textconfig', '.units',
                // I/O and mapping
                '.iom', '.vvm',
                // Libraries
                '.lby', '.br',
                // mappView / Visualization
                '.content', '.eventbinding', '.binding', '.action',
                '.page', '.layout', '.dialog', '.theme', '.styles',
                '.vis', '.mappviewcfg', '.widgetlibrary', '.snippet',
                // OPC UA
                '.uaserver',
                // mapp components
                '.mpalarmxcore', '.mpalarmxhistory', '.mprecipexml', '.mprecipecsv', '.mpdatarecorder',
                // Security and access
                '.role', '.user', '.firewallRules',
                // DTM / Device configuration
                '.dtm', '.dtmdre', '.dtmtre', '.dtmdri',
                // Media/assets
                '.jpg', '.svg', '.png',
                // Documentation
                '.md', '.doc'
            ];
            
            // Folders to exclude (temp/build artifacts)
            const excludedFolders = ['Temp', 'Binaries', 'Diagnosis'];
            
            // Filter relevant files first
            const relevantFiles = files.filter(file => {
                const filePath = file.relativePath || file.webkitRelativePath || file.name;
                const pathParts = filePath.split(/[/\\]/);
                
                // Exclude files in temp/build folders
                if (pathParts.some(part => excludedFolders.includes(part))) {
                    return false;
                }
                
                const ext = this.getFileExtension(file.name);
                return relevantExtensions.includes(ext);
            });
            
            // Process files with error handling
            for (const file of relevantFiles) {
                try {
                    const content = await this.readFileContent(file);
                    const ext = this.getFileExtension(file.name);
                    const type = this.getFileType(ext);
                    
                    this.projectFiles.set(file.relativePath || file.webkitRelativePath || file.name, {
                        content,
                        type,
                        name: file.name,
                        extension: ext
                    });
                } catch (err) {
                    console.warn(`Skipping file ${file.name}:`, err);
                }
            }
            
            this.updateProjectInfo();
        } catch (error) {
            console.error('Error processing files:', error);
            alert('Error processing files: ' + error.message);
        }
    }

    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
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
                reader.readAsText(file);
            } catch (err) {
                clearTimeout(timeout);
                reject(err);
            }
        });
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
            
            // OPC UA
            '.uaserver': 'opcua',
            
            // mapp components
            '.mpalarmxcore': 'mapp_component',
            '.mpalarmxhistory': 'mapp_component',
            '.mprecipexml': 'mapp_component',
            '.mprecipecsv': 'mapp_component',
            '.mpdatarecorder': 'mapp_component',
            
            // Security and access
            '.role': 'security',
            '.user': 'security',
            '.firewallRules': 'security',
            
            // DTM / Device configuration
            '.dtm': 'dtm',
            '.dtmdre': 'dtm',
            '.dtmtre': 'dtm',
            '.dtmdri': 'dtm',
            
            // Media/assets
            '.jpg': 'media',
            '.svg': 'media',
            '.png': 'media',
            
            // Documentation
            '.md': 'documentation',
            '.doc': 'documentation'
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
        
        // Show/hide elements
        this.elements.projectInfo.classList.toggle('hidden', stats.total === 0);
        this.elements.btnScan.disabled = stats.total === 0;
        this.elements.btnClear.disabled = stats.total === 0;
        
        // Build file tree
        this.renderFileTree();
    }

    renderFileTree() {
        const tree = document.createElement('ul');
        tree.className = 'tree-list';
        
        const sortedPaths = Array.from(this.projectFiles.keys()).sort();
        
        sortedPaths.forEach(path => {
            const file = this.projectFiles.get(path);
            const li = document.createElement('li');
            li.className = 'tree-item';
            li.innerHTML = `
                <span class="file-icon">${this.getFileIcon(file.type)}</span>
                <span class="file-name">${path}</span>
            `;
            tree.appendChild(li);
        });
        
        this.elements.fileTree.innerHTML = '';
        this.elements.fileTree.appendChild(tree);
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
        
        this.updateProjectInfo();
        this.resetAnalysisUI();
        this.resetPreviewUI();
        this.resetReportUI();
    }

    // ==========================================
    // ANALYSIS ENGINE
    // ==========================================

    async runAnalysis() {
        this.analysisResults = [];
        this.selectedFindings.clear();
        
        // Show loading state
        this.elements.btnScan.disabled = true;
        this.elements.btnScan.textContent = '⏳ Analyzing...';
        
        try {
            // Analyze each file
            for (const [path, file] of this.projectFiles) {
                await this.analyzeFile(path, file);
            }
            
            // Sort results by severity
            this.analysisResults.sort((a, b) => {
                const severityOrder = { error: 0, warning: 1, info: 2 };
                return (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3);
            });
            
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
                    functionMappings: deprecation.functionMappings
                });
            }
        }
        
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
                        original: match[0]
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
                        original: obj.raw
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
                        original: match[0]
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
        
        // Check if this is an AS4 5.x library that needs upgrading
        const is5xVersion = version && version.match(/^5\.\d+/);
        
        // Look up library in mapping database
        const mapping = DeprecationDatabase.as6Format.libraryMapping[libraryName];
        
        if (is5xVersion && mapping && mapping.techPackage) {
            // Technology package library - should be removed from local Libraries folder
            // AS6 will use the library from the installed technology package
            this.addFinding({
                type: 'library_version',
                name: libraryName,
                severity: 'warning',
                description: `Library should be removed - provided by ${mapping.techPackage} technology package`,
                replacement: {
                    name: `${mapping.techPackage} ${mapping.as6Version}`,
                    description: `Library is included in ${mapping.techPackage} technology package`
                },
                notes: `This library is part of the ${mapping.techPackage} technology package. ` +
                       `In AS6, remove the local copy from Logical/Libraries and ensure the ` +
                       `${mapping.techPackage} ${mapping.as6Version} technology package is installed. ` +
                       `The library will be automatically available from the installed package.`,
                file: path,
                original: version,
                conversion: {
                    libraryName: libraryName,
                    from: version,
                    to: null, // Don't update version - library should be removed
                    techPackage: mapping.techPackage,
                    source: mapping.source,
                    action: 'remove', // Mark for removal instead of version update
                    automated: false // Manual action required
                }
            });
        } else if (is5xVersion && mapping && mapping.source === 'Library_2') {
            // Core runtime library - bundled with Automation Runtime
            // Can be removed from local Libraries folder
            this.addFinding({
                type: 'library_version',
                name: libraryName,
                severity: 'info',
                description: `Library bundled with Automation Runtime - local copy can be removed`,
                replacement: {
                    name: 'AR bundled',
                    description: 'Library is bundled with Automation Runtime'
                },
                notes: `This library is bundled with the Automation Runtime. ` +
                       `The local copy in Logical/Libraries can be removed. ` +
                       `AS6 will use the library from the installed runtime.`,
                file: path,
                original: version,
                conversion: {
                    libraryName: libraryName,
                    from: version,
                    to: null,
                    source: mapping.source,
                    action: 'remove',
                    automated: false
                }
            });
        } else if (is5xVersion && !mapping) {
            // Unknown 5.x library - might be user/custom library
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
            needsUpgrade: is5xVersion && mapping
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
            hardware: 'Hardware Modules',
            project: 'Project Format',
            technology_package: 'Technology Packages',
            package: 'Package Files',
            task_config: 'Task Configuration',
            motion: 'Motion & Axis',
            localization: 'Localization (TMX)',
            compiler: 'Compiler Settings',
            runtime: 'Automation Runtime',
            visualization: 'Visualization (VC3/VC4)'
        };
        return names[type] || type;
    }

    resetAnalysisUI() {
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
        let before = finding.context || finding.original;
        let after = before;
        let notes = '';
        
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
            notes = finding.replacement.notes;
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

    applyConversion(findingId) {
        const finding = this.analysisResults.find(f => f.id === findingId);
        if (!finding) return;
        
        const file = this.projectFiles.get(finding.file);
        if (!file) return;
        
        // Store original for undo
        const originalContent = file.content;
        let convertedContent;
        
        // Handle different conversion types
        if (finding.type === 'project' && finding.name === 'AS4 Project File') {
            // Full project file conversion using the database method
            convertedContent = DeprecationDatabase.convertProjectFileToAS6(originalContent);
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
            
            if (conv.action === 'remove') {
                // Mark library for removal from converted project
                // Instead of modifying the file, we'll exclude it during download
                this.librariesToRemove = this.librariesToRemove || new Set();
                
                // Get the library folder path (remove the filename from path)
                const pathParts = finding.file.split(/[/\\]/);
                pathParts.pop(); // Remove Binary.lby or similar
                const libraryFolderPath = pathParts.join('/');
                
                this.librariesToRemove.add(libraryFolderPath);
                this.librariesToRemove.add(conv.libraryName); // Also store library name for reference
                
                // Don't modify the content - just mark as applied
                convertedContent = originalContent;
                finding.notes = (finding.notes || '') + ' [Library will be excluded from converted project]';
            } else if (conv.source === 'Library_2' && conv.to) {
                // Library is bundled with AR - update version if specified
                const escapedFrom = conv.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                convertedContent = originalContent.replace(
                    new RegExp(`(<Library\\s+)Version="${escapedFrom}"`, 'g'),
                    '$1'
                );
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
        } else {
            // Standard text replacement conversion
            const conversion = this.generateConversion(finding);
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
        this.selectedFindings.forEach(id => {
            if (!this.appliedConversions.has(id)) {
                this.applyConversion(id);
            }
        });
        
        // Generate report
        this.generateReport();
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
        
        // Render findings table
        this.elements.reportFindings.innerHTML = `
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Type</th>
                        <th>Name</th>
                        <th>Severity</th>
                        <th>File</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.analysisResults.map(f => `
                        <tr class="${f.status}">
                            <td>${this.getTypeIcon(f.type)}</td>
                            <td>${f.name}</td>
                            <td><span class="severity-badge ${f.severity}">${f.severity}</span></td>
                            <td>${f.file}</td>
                            <td>${f.status}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        // Render changes
        const appliedChanges = this.analysisResults.filter(f => f.status === 'applied');
        this.elements.reportChanges.innerHTML = appliedChanges.length > 0 ? `
            <div class="changes-list">
                ${appliedChanges.map(f => {
                    const conv = this.generateConversion(f);
                    return `
                        <div class="change-item">
                            <h5>${f.name} (${f.file})</h5>
                            <div class="code-diff">
                                <div class="diff-before"><span class="diff-label">-</span> ${this.escapeHtml(conv.before.substring(0, 100))}...</div>
                                <div class="diff-after"><span class="diff-label">+</span> ${this.escapeHtml(conv.after.substring(0, 100))}...</div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        ` : '<p>No changes applied yet.</p>';
        
        // Render recommendations
        this.elements.reportRecommendations.innerHTML = `
            <ul class="recommendations-list">
                ${report.bySeveity.error > 0 ? '<li class="error">⚠️ Address all ERROR severity items before migrating to AS6.</li>' : ''}
                ${report.bySeveity.warning > 0 ? '<li class="warning">📋 Review WARNING items and plan updates accordingly.</li>' : ''}
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
        
        const zip = new JSZip();
        const projectName = this.getProjectName();
        
        // Create project folder in ZIP
        const projectFolder = zip.folder(projectName + '_AS6');
        
        // Add all project files with their directory structure
        // Exclude libraries that are marked for removal (technology package libraries)
        const removedLibraries = [];
        this.projectFiles.forEach((file, path) => {
            // Check if this file is in a library folder marked for removal
            let shouldExclude = false;
            if (this.librariesToRemove && this.librariesToRemove.size > 0) {
                for (const libPath of this.librariesToRemove) {
                    // Check if path starts with the library folder path
                    if (path.startsWith(libPath + '/') || path.startsWith(libPath + '\\') || path === libPath) {
                        shouldExclude = true;
                        if (!removedLibraries.includes(libPath)) {
                            removedLibraries.push(libPath);
                        }
                        break;
                    }
                }
            }
            
            if (!shouldExclude) {
                // Preserve the directory structure
                projectFolder.file(path, file.content);
            }
        });
        
        // Add AS6 structural changes info
        const structuralChanges = DeprecationDatabase.getAS6StructuralChanges();
        projectFolder.file('_AS6_migration_info.json', JSON.stringify({
            conversionDate: new Date().toISOString(),
            sourceVersion: 'AS4.x',
            targetVersion: 'AS6.x',
            structuralChanges: structuralChanges,
            removedLibraries: removedLibraries.length > 0 ? {
                count: removedLibraries.length,
                paths: removedLibraries,
                reason: 'These libraries are provided by AS6 technology packages and should not be included in the project. Install the required technology packages in Automation Studio 6.'
            } : null,
            notes: [
                'This project has been converted from AS4 to AS6 format.',
                'Review all changes before importing into Automation Studio 6.',
                'Some manual adjustments may be required for hardware and library configurations.',
                'New AS6 directories (AccessAndSecurity, Connectivity) may need to be created manually.',
                removedLibraries.length > 0 ? `${removedLibraries.length} technology package libraries were removed. Install the required technology packages in AS6.` : null
            ].filter(Boolean)
        }, null, 2));
        
        // Add conversion report as JSON
        const report = this.buildReportData();
        projectFolder.file('_conversion-report.json', JSON.stringify(report, null, 2));
        
        // Add conversion summary as text
        const summary = this.generateConversionSummary();
        projectFolder.file('_conversion-summary.txt', summary);
        
        // Generate ZIP file
        try {
            const blob = await zip.generateAsync({ 
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
            }, (metadata) => {
                // Update progress if needed
                console.log(`Zipping: ${metadata.percent.toFixed(0)}%`);
            });
            
            // Download the ZIP
            const filename = `${projectName}_AS6_converted.zip`;
            this.downloadBlob(blob, filename);
            
        } catch (error) {
            console.error('Error creating ZIP:', error);
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
