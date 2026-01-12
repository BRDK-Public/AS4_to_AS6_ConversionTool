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
            // Library binary files (for user libraries that need their compiled binaries)
            '.a', '.o',
            // ANSI C source files (critical for custom libraries)
            '.c', '.h',
            // mappView / Visualization
            '.content', '.eventbinding', '.binding', '.action',
            '.page', '.layout', '.dialog', '.theme', '.styles',
            '.vis', '.mappviewcfg', '.widgetlibrary', '.snippet',
            // mappView custom widgets and keyboards
            '.numpad', '.compoundwidget', '.stylesset',
            // OPC UA
            '.uaserver', '.uad',
            // mapp components
            '.mpalarmxcore', '.mpalarmxhistory', '.mprecipexml', '.mprecipecsv', '.mpdatarecorder',
            '.mpalarmxlist', '.mpalarmxcategory', '.mpalarmxquery',
            // Security and access
            '.role', '.user', '.firewallrules',
            // DTM / Device configuration
            '.dtm', '.dtmdre', '.dtmtre', '.dtmdri',
            // Motion/Data objects
            '.ett',
            // Language/Localization
            '.language',
            // Safety
            '.sfapp', '.swt',
            // Media/assets
            '.jpg', '.svg', '.png', '.gif', '.bmp', '.ico',
            // Build scripts
            '.ps1', '.bat', '.cmd',
            // Git/config
            '.gitignore',
            // Licenses and docs
            '.md', '.doc', '.txt'
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
        
        // Debug: Log filtered binary files
        const filteredBinaryFiles = relevantFiles.filter(f => {
            const ext = this.getFileExtension(f.name);
            return ['.a', '.br', '.o'].includes(ext);
        });
        console.log(`Binary files after filtering: ${filteredBinaryFiles.length}`);
        filteredBinaryFiles.slice(0, 10).forEach(f => console.log(`  - ${f.webkitRelativePath || f.name}`));
        
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
                    const isBinary = AS4Converter.BINARY_EXTENSIONS.includes(ext);
                    
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
                // Library binary files (for user libraries that need their compiled binaries)
                '.a', '.o',
                // ANSI C source files (critical for custom libraries)
                '.c', '.h',
                // mappView / Visualization
                '.content', '.eventbinding', '.binding', '.action',
                '.page', '.layout', '.dialog', '.theme', '.styles',
                '.vis', '.mappviewcfg', '.widgetlibrary', '.snippet',
                // mappView custom widgets and keyboards
                '.numpad', '.compoundwidget', '.stylesset',
                // OPC UA
                '.uaserver', '.uad',
                // mapp components
                '.mpalarmxcore', '.mpalarmxhistory', '.mprecipexml', '.mprecipecsv', '.mpdatarecorder',
                '.mpalarmxlist', '.mpalarmxcategory', '.mpalarmxquery',
                // Security and access
                '.role', '.user', '.firewallrules',
                // DTM / Device configuration
                '.dtm', '.dtmdre', '.dtmtre', '.dtmdri',
                // Motion/Data objects
                '.ett',
                // Language/Localization
                '.language',
                // Safety
                '.sfapp', '.swt',
                // Media/assets
                '.jpg', '.svg', '.png', '.gif', '.bmp', '.ico',
                // Build scripts
                '.ps1', '.bat', '.cmd',
                // Git/config
                '.gitignore',
                // Licenses and docs
                '.md', '.doc', '.txt'
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
            
            // Debug: Log filtered binary files
            const filteredBinaryFiles = relevantFiles.filter(f => {
                const ext = this.getFileExtension(f.name);
                return ['.a', '.br', '.o'].includes(ext);
            });
            console.log(`Binary files after filtering (processFiles): ${filteredBinaryFiles.length}`);
            filteredBinaryFiles.slice(0, 10).forEach(f => console.log(`  - ${f.webkitRelativePath || f.name}`));
            
            // Process files with error handling
            for (const file of relevantFiles) {
                try {
                    const content = await this.readFileContent(file);
                    const ext = this.getFileExtension(file.name);
                    const type = this.getFileType(ext);
                    const isBinary = AS4Converter.BINARY_EXTENSIONS.includes(ext);
                    
                    this.projectFiles.set(file.relativePath || file.webkitRelativePath || file.name, {
                        content,
                        type,
                        name: file.name,
                        extension: ext,
                        isBinary: isBinary
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

    // Binary file extensions that should not be read as text
    static BINARY_EXTENSIONS = ['.a', '.o', '.br', '.png', '.jpg', '.gif', '.bmp', '.ico', '.svg'];
    
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
            
            // Auto-apply library version updates for technology package libraries
            this.autoApplyLibraryVersionUpdates();
            
            // Auto-apply function replacements (memset→brsmemset, etc.)
            this.autoApplyFunctionReplacements();
            
            // Auto-apply OPC UA conversion (OpcUA → OpcUaCs, FileVersion 10, config files)
            this.autoApplyUadFileConversion();
            
            // Auto-apply mappServices AlarmX conversion (split core file to AS6 format)
            this.autoApplyMappServicesConversion();
            
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
            
            // Only process source files (.st, .c, .cpp)
            const ext = filePath.toLowerCase().split('.').pop();
            if (!['st', 'c', 'cpp', 'h'].includes(ext)) {
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
                    
                    // Add a finding for the replacement
                    this.addFinding({
                        type: 'function',
                        name: oldFunc,
                        file: filePath,
                        severity: 'info',
                        status: 'applied',
                        replacement: funcPattern.replacement,
                        notes: `[Auto-applied: ${oldFunc} → ${newFunc}]`
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
            
            // Create UaDvConfig.uadcfg
            const uaDvConfigPath = opcuaCsPath + '/UaDvConfig.uadcfg';
            this.projectFiles.set(uaDvConfigPath, {
                content: this.getUaDvConfigTemplate(),
                isBinary: false,
                type: 'xml'
            });
            changes.push('Created UaDvConfig.uadcfg');
            
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
          <Property ID="None" Value="0" />
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
          <Property ID="AnonymousIdentityToken" Value="0" />
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
        console.log('Converting mappServices AlarmX configuration to AS6 format...');
        
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
     */
    convertMpAlarmXCore(originalPath, file) {
        const content = file.content;
        const pathParts = originalPath.split(/[\/\\]/);
        const fileName = pathParts.pop();
        const folderPath = pathParts.join('/') + '/';
        const baseName = fileName.replace(/\.mpalarmxcore$/i, '');
        
        console.log(`Converting AlarmX core file: ${originalPath}`);
        
        const changes = [];
        
        // Parse the AS4 content
        const bySeverityMatch = content.match(/<Group ID="mapp\.AlarmX\.Core">\s*<Group ID="BySeverity">([\s\S]*?)<\/Group>\s*<\/Group>/);
        const configurationMatch = content.match(/<Group ID="mapp\.AlarmX\.Core\.Configuration">([\s\S]*?)<\/Group>\s*(?=<Group ID="mapp\.AlarmX\.Core\.Snippets">|<\/Element>)/);
        const snippetsMatch = content.match(/<Group ID="mapp\.AlarmX\.Core\.Snippets">([\s\S]*?)<\/Group>\s*<\/Element>/);
        
        if (!bySeverityMatch) {
            console.log(`  Skipping ${fileName} - no BySeverity section found (may already be AS6 format)`);
            return;
        }
        
        // Extract Element ID (e.g., "mpAlarmXCore")
        const elementIdMatch = content.match(/<Element ID="([^"]+)" Type="mpalarmxcore">/);
        const elementId = elementIdMatch ? elementIdMatch[1] : 'mpAlarmXCore';
        
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
        
        // Delete the original file
        this.projectFiles.delete(originalPath);
        changes.push(`Removed original file: ${fileName}`);
        
        // Add new files
        const newCorePath = folderPath + baseName + '_1.mpalarmxcore';
        this.projectFiles.set(newCorePath, {
            content: newCoreContent,
            type: 'mapp_component',
            name: baseName + '_1.mpalarmxcore',
            extension: '.mpalarmxcore',
            isBinary: false
        });
        changes.push(`Created ${baseName}_1.mpalarmxcore with Mapping format`);
        
        const newListPath = folderPath + baseName + '_L.mpalarmxlist';
        this.projectFiles.set(newListPath, {
            content: newListContent,
            type: 'mapp_component',
            name: baseName + '_L.mpalarmxlist',
            extension: '.mpalarmxlist',
            isBinary: false
        });
        changes.push(`Created ${baseName}_L.mpalarmxlist with alarm definitions`);
        
        const newCategoryPath = folderPath + baseName + '_C.mpalarmxcategory';
        this.projectFiles.set(newCategoryPath, {
            content: newCategoryContent,
            type: 'mapp_component',
            name: baseName + '_C.mpalarmxcategory',
            extension: '.mpalarmxcategory',
            isBinary: false
        });
        changes.push(`Created ${baseName}_C.mpalarmxcategory`);
        
        const newQueryPath = folderPath + baseName + '_Q.mpalarmxquery';
        this.projectFiles.set(newQueryPath, {
            content: newQueryContent,
            type: 'mapp_component',
            name: baseName + '_Q.mpalarmxquery',
            extension: '.mpalarmxquery',
            isBinary: false
        });
        changes.push(`Created ${baseName}_Q.mpalarmxquery`);
        
        // Handle history file renaming (e.g., CfgAlarmH.mpalarmxhistory -> CfgAlarm_2.mpalarmxhistory)
        // Look for a history file that matches the pattern {baseName}H.mpalarmxhistory
        const historyFilePattern = new RegExp(`${baseName}H\\.mpalarmxhistory$`, 'i');
        let historyConverted = false;
        
        this.projectFiles.forEach((hFile, hPath) => {
            if (historyFilePattern.test(hPath) && hPath.toLowerCase().startsWith(folderPath.toLowerCase())) {
                // Rename the history file
                const newHistoryPath = folderPath + baseName + '_2.mpalarmxhistory';
                
                // Update history file content to AS6 format
                let historyContent = hFile.content;
                if (typeof historyContent === 'string') {
                    // Add the mapp.Gen group if not present
                    if (!historyContent.includes('mapp.Gen')) {
                        historyContent = historyContent.replace(
                            /(<Element ID="[^"]+" Type="mpalarmxhistory")(\s*\/>|\s*>)/,
                            '$1>\n    <Group ID="mapp.Gen">\n      <Property ID="Audit" Value="FALSE" />\n    </Group>\n  </Element'
                        );
                        // Fix self-closing element
                        historyContent = historyContent.replace(/<\/Element\s*\/>/, '</Element>');
                    }
                }
                
                this.projectFiles.delete(hPath);
                this.projectFiles.set(newHistoryPath, {
                    content: historyContent,
                    type: 'mapp_component',
                    name: baseName + '_2.mpalarmxhistory',
                    extension: '.mpalarmxhistory',
                    isBinary: false
                });
                changes.push(`Renamed ${baseName}H.mpalarmxhistory to ${baseName}_2.mpalarmxhistory`);
                
                // Create the history query file
                const historyQueryPath = folderPath + baseName + 'H_.mpalarmxquery';
                this.projectFiles.set(historyQueryPath, {
                    content: this.generateAS6HistoryQueryFile(),
                    type: 'mapp_component',
                    name: baseName + 'H_.mpalarmxquery',
                    extension: '.mpalarmxquery',
                    isBinary: false
                });
                changes.push(`Created ${baseName}H_.mpalarmxquery`);
                
                historyConverted = true;
            }
        });
        
        // Update Package.pkg in the same folder
        const pkgPath = folderPath + 'Package.pkg';
        const pkgFile = this.projectFiles.get(pkgPath);
        if (pkgFile && typeof pkgFile.content === 'string') {
            let pkgContent = pkgFile.content;
            
            // Remove old entries
            pkgContent = pkgContent.replace(new RegExp(`<Object Type="File">${baseName}\\.mpalarmxcore</Object>\\s*`, 'gi'), '');
            if (historyConverted) {
                pkgContent = pkgContent.replace(new RegExp(`<Object Type="File">${baseName}H\\.mpalarmxhistory</Object>\\s*`, 'gi'), '');
            }
            
            // Add new entries before </Objects>
            const newEntries = [
                `    <Object Type="File">${baseName}_1.mpalarmxcore</Object>`,
                `    <Object Type="File">${baseName}_C.mpalarmxcategory</Object>`,
                `    <Object Type="File">${baseName}_L.mpalarmxlist</Object>`,
                `    <Object Type="File">${baseName}_Q.mpalarmxquery</Object>`
            ];
            
            if (historyConverted) {
                newEntries.push(`    <Object Type="File">${baseName}_2.mpalarmxhistory</Object>`);
                newEntries.push(`    <Object Type="File">${baseName}H_.mpalarmxquery</Object>`);
            }
            
            pkgContent = pkgContent.replace(
                /<\/Objects>/,
                newEntries.join('\n') + '\n  </Objects>'
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
        
        // Parse each severity group
        const groupRegex = /<Group ID="\[\d+\]">([\s\S]*?)<\/Group>/g;
        let groupMatch;
        
        while ((groupMatch = groupRegex.exec(bySeverityContent)) !== null) {
            const groupContent = groupMatch[1];
            
            // Extract severity value
            const severityMatch = groupContent.match(/<Property ID="Severity" Value="(\d+)"/);
            if (!severityMatch) {
                // Empty group - create a None entry
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
        
        console.log(`Detected ${detectedLibraries.size} library references:`, Array.from(detectedLibraries).join(', '));
        
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
                    console.log(`    TechPkg lookup for '${packageName}' lib '${libName}': libVersion='${libSpecificVersion}', pkgVersion='${pkgInfo.version}'`);
                    
                    if (pkgVersions) {
                        // Try library-specific version first (some libraries like MpServer only exist in certain versions)
                        let versionData = null;
                        let usedVersion = null;
                        
                        // Priority 1: Use the library's specific version from the mapping
                        if (libSpecificVersion && pkgVersions[libSpecificVersion]?.[libName]) {
                            versionData = pkgVersions[libSpecificVersion];
                            usedVersion = libSpecificVersion;
                            console.log(`      Using library-specific version '${libSpecificVersion}' for ${libName}`);
                        }
                        // Priority 2: Fall back to package version
                        else if (pkgVersions[pkgInfo.version]?.[libName]) {
                            versionData = pkgVersions[pkgInfo.version];
                            usedVersion = pkgInfo.version;
                            console.log(`      Using package version '${pkgInfo.version}' for ${libName}`);
                        }
                        // Priority 3: Search all versions to find one that contains this library
                        else {
                            for (const [ver, verData] of Object.entries(pkgVersions)) {
                                if (verData[libName]) {
                                    versionData = verData;
                                    usedVersion = ver;
                                    console.log(`      Found ${libName} in version '${ver}' (searched all versions)`);
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
                        }
                    } catch (e) {
                        // File fetch failed
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
        console.log('applyAllConversions called, selectedFindings:', this.selectedFindings.size);
        
        try {
            this.selectedFindings.forEach(id => {
                if (!this.appliedConversions.has(id)) {
                    this.applyConversion(id);
                }
            });
            
            console.log('All conversions applied, generating report...');
            
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
        
        // Get list of technology package libraries whose files will be replaced with AS6 versions
        // We'll skip ALL files from these libraries and fetch fresh AS6 versions instead
        const techPackageLibraries = new Set();
        Object.entries(DeprecationDatabase.as6Format.libraryMapping).forEach(([libName, mapping]) => {
            if (mapping.techPackage || mapping.source === 'Library_2') {
                techPackageLibraries.add(libName.toLowerCase());
            }
        });
        
        // Add all project files with their directory structure
        // Skip files from technology package libraries - they'll be replaced with AS6 versions
        let fileCount = 0;
        let skippedLibraryFiles = 0;
        const totalFiles = this.projectFiles.size;
        this.projectFiles.forEach((file, path) => {
            // Check if this file is inside a technology package library folder
            const pathParts = path.toLowerCase().split(/[/\\]/);
            const libIndex = pathParts.indexOf('libraries');
            let isTechPackageLibrary = false;
            
            if (libIndex >= 0 && libIndex < pathParts.length - 1) {
                const libName = pathParts[libIndex + 1];
                if (techPackageLibraries.has(libName)) {
                    isTechPackageLibrary = true;
                    skippedLibraryFiles++;
                }
            }
            
            if (!isTechPackageLibrary) {
                // For binary files, pass the ArrayBuffer with binary option
                if (file.isBinary) {
                    projectFolder.file(path, file.content, { binary: true });
                } else {
                    projectFolder.file(path, file.content);
                }
            }
            fileCount++;
            // Update progress to 50% during file addition
            const percent = Math.floor((fileCount / totalFiles) * 50);
            progressBar.style.width = percent + '%';
            progressPercent.textContent = percent + '%';
        });
        
        if (skippedLibraryFiles > 0) {
            console.log(`Skipped ${skippedLibraryFiles} files from technology package libraries (will be replaced with AS6 versions)`);
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
        
        // Fetch and add AS6 library files from bundled LibrariesForAS6 folder
        if (requiredPackages.size > 0) {
            progressMessage.textContent = 'Fetching AS6 library files...';
            progressBar.style.width = '56%';
            progressPercent.textContent = '56%';
            
            console.log('=== Starting AS6 library fetch ===');
            console.log('Required packages:', requiredPackages.size);
            requiredPackages.forEach((pkg, name) => {
                console.log(`  Package: ${name}, libraries: ${pkg.libraries.size}`);
                pkg.libraries.forEach((lib, libName) => {
                    console.log(`    - ${libName}: version=${lib.version}`);
                });
            });
            
            const as6LibraryFiles = await this.fetchAS6LibraryFiles(requiredPackages, (fetched, total) => {
                const pct = 56 + Math.floor((fetched / total) * 4);
                progressBar.style.width = pct + '%';
                progressPercent.textContent = pct + '%';
            });
            
            console.log(`=== Fetched ${as6LibraryFiles.size} AS6 library files ===`);
            
            // Add AS6 library files to the ZIP (in Logical/Libraries folder)
            // Need to determine the project folder prefix from existing files
            let projectFolderPrefix = '';
            for (const [path] of this.projectFiles) {
                const logicalIndex = path.toLowerCase().indexOf('logical');
                if (logicalIndex > 0) {
                    projectFolderPrefix = path.substring(0, logicalIndex);
                    break;
                }
            }
            
            console.log(`Project folder prefix: "${projectFolderPrefix}"`);
            
            let addedLibFiles = 0;
            for (const [relativePath, fileData] of as6LibraryFiles) {
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
            console.log(`Added ${addedLibFiles} AS6 library files to ZIP (prefix: ${projectFolderPrefix})`);
        } else {
            console.log('=== No required packages, skipping AS6 library fetch ===');
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
