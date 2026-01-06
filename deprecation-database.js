/**
 * B&R Automation Studio AS4 to AS6 Deprecation Database
 * Contains deprecated libraries, functions, function blocks, and hardware modules
 * with their replacements and migration guidance.
 * 
 * Updated with verified AS6 project structure analysis (BlizzAS6/TowelFeederPLC)
 */

const DeprecationDatabase = {
    version: "2.0",
    lastUpdated: "2025-12-18",
    asVersions: {
        source: "AS4.x",
        target: "AS6.x"
    },

    // ==========================================
    // AS6 PROJECT FORMAT REFERENCE (VERIFIED)
    // ==========================================
    as6Format: {
        // Verified from BlizzAS6/TowelFeederPLC.apj
        xmlDeclaration: '<?xml version="1.0" encoding="utf-8"?>',
        processingInstruction: '<?AutomationStudio Version="6.5.0.305" WorkingVersion="6.1"?>',
        projectNamespace: 'http://br-automation.co.at/AS/Project',
        
        // Compiler settings - CRITICAL CHANGE
        compiler: {
            as4: { gcc: '4.1.2', description: 'GCC 4.1.2 (AS4 default)' },
            as6: { gcc: '11.3.0', description: 'GCC 11.3.0 (AS6 default)' }
        },
        
        // Automation Runtime version
        // AS4 uses versions like B4.83, C4.93, D4.73, E4.xx, F4.xx, etc. (letter prefix + 4.xx)
        // AS6 uses versions like 6.2.1
        automationRuntime: {
            as4: { versionPattern: /^[A-Z]4\.\d+(\.\d+)?$/, description: 'AR 4.xx (AS4 series)' },
            as6: { version: '6.2.1', description: 'AR 6.2.1 (AS6 default)' }
        },
        
        // AR version requirements for AS6 migration
        arVersionRequirements: {
            minimumVersion: 4.25,
            minimumVersionDisplay: 'B4.25',
            description: 'Projects must be on AR 4.25 or higher for reliable AS6 migration',
            upgradeNote: 'Upgrade to latest AS4 AR version (B4.93 or higher recommended) before migrating'
        },
        
        // Required new elements in AS6
        requiredElements: [
            { name: 'Communication', attributes: {}, required: true },
            { name: 'ANSIC', attributes: { DefaultIncludes: 'true' }, required: true },
            { name: 'IEC', attributes: {
                ExtendedConstants: 'true',
                IecExtendedComments: 'true',
                KeywordsAsStructureMembers: 'false',
                NamingConventions: 'true',
                Pointers: 'true',
                Preprocessor: 'false'
            }, required: true },
            { name: 'Motion', attributes: { RestartAcoposParameter: 'true', RestartInitParameter: 'true' }, required: false },
            { name: 'Project', attributes: { StoreRuntimeInProject: 'true' }, required: false },
            { name: 'Variables', attributes: { DefaultInitValue: '0', DefaultRetain: 'false', DefaultVolatile: 'true' }, required: true }
        ],
        
        // IEC settings format changed from nested elements to attributes
        iecSettingsFormat: 'attributes', // AS4 uses 'nested', AS6 uses 'attributes'
        
        // Technology packages (verified versions from real AS6 project)
        technologyPackages: {
            'Acp10Arnc0': { as4Version: '5.24.1', as6Version: '6.2.0', required: true },
            'mapp': { as4Version: '5.24.2', as6Version: null, replacedBy: 'mappServices' },
            'mappServices': { as4Version: null, as6Version: '6.2.0', newInAS6: true },
            'mappSafety': { as4Version: '5.24.1', as6Version: '6.2.0', required: false },
            'mappView': { as4Version: '5.24.1', as6Version: '6.2.0', required: false },
            'OpcUaCs': { as4Version: null, as6Version: '6.0.0', newInAS6: true },
            'OpcUaFx': { as4Version: null, as6Version: '6.1.0', newInAS6: true, subVersions: { FxPtpB: '6.1.0', FxPubSubB: '6.1.0', PubSub: '1.3.0' } }
        },
        
        // New directories in AS6 Physical configuration
        newPhysicalDirs: [
            'AccessAndSecurity/CertificateStore',
            'AccessAndSecurity/TransportLayerSecurity',
            'AccessAndSecurity/UserRoleSystem',
            'Connectivity/OpcUaCs',
            'Connectivity/OpcUaFx',
            'mappServices'
        ],
        
        // Package file structure reference
        packageFileFormat: {
            namespace: 'http://br-automation.co.at/AS/Package',
            fileVersion: '4.9', // Both AS4 and AS6 use this
            objectTypes: [
                'File',      // Regular files (.typ, .var, .st, .tmx, etc.)
                'Package',   // Sub-packages (directories)
                'Program',   // IEC programs
                'Library',   // Library references
                'DataObject' // NC data objects (Ax, Apt, etc.)
            ],
            objectLanguages: [
                'IEC',       // Structured Text
                'ANSIC',     // C programs
                'Binary',    // Binary libraries
                'Ax',        // Axis init parameters
                'Apt'        // ACOPOS parameter tables
            ]
        },
        
        // Task configuration structure
        taskConfigFormat: {
            taskClasses: ['Cyclic#1', 'Cyclic#2', 'Cyclic#3', 'Cyclic#4', 'Cyclic#5', 'Cyclic#6', 'Cyclic#7', 'Cyclic#8'],
            taskProperties: ['Name', 'Source', 'Memory', 'Language', 'Debugging'],
            ncDataObjectProperties: ['Name', 'Source', 'Memory', 'Language']
        },
        
        // Motion configuration files
        motionFileTypes: {
            '.ax': { name: 'Axis Init Parameters', language: 'Ax' },
            '.apt': { name: 'ACOPOS Parameter Table', language: 'Apt' },
            '.ncm': { name: 'NC Axis Mapping', language: null },
            '.ncc': { name: 'NC Configuration', language: null },
            '.dob': { name: 'Data Object', language: 'Ax' }
        },
        
        // Library to Technology Package mapping for AS6 upgrades
        // Maps AS4 5.x libraries to their AS6 6.x equivalents
        libraryMapping: {
            // mappServices (6.0.0) - Data management and services
            'MpAlarmX': { techPackage: 'mappServices', as6Version: '6.0.0', as6LibVersion: '6.0.0' },
            'MpAudit': { techPackage: 'mappServices', as6Version: '6.0.0', as6LibVersion: '6.0.0' },
            'MpBackup': { techPackage: 'mappServices', as6Version: '6.0.0', as6LibVersion: '6.0.0' },
            'MpCodeBox': { techPackage: 'mappServices', as6Version: '6.0.0', as6LibVersion: '6.0.0' },
            'MpCom': { techPackage: 'mappServices', as6Version: '6.0.0', as6LibVersion: '6.0.0' },
            'MpData': { techPackage: 'mappServices', as6Version: '6.0.0', as6LibVersion: '6.0.0' },
            'MpDatabase': { techPackage: 'mappServices', as6Version: '6.0.0', as6LibVersion: '6.0.0' },
            'MpFile': { techPackage: 'mappServices', as6Version: '6.0.0', as6LibVersion: '6.0.0' },
            'MpIO': { techPackage: 'mappServices', as6Version: '6.0.0', as6LibVersion: '6.0.0' },
            'MpRecipe': { techPackage: 'mappServices', as6Version: '6.0.0', as6LibVersion: '6.0.0' },
            'MpReport': { techPackage: 'mappServices', as6Version: '6.0.0', as6LibVersion: '6.0.0' },
            'MpSequence': { techPackage: 'mappServices', as6Version: '6.0.0', as6LibVersion: '6.0.0' },
            'MpUserX': { techPackage: 'mappServices', as6Version: '6.0.0', as6LibVersion: '6.0.0' },
            
            // mappView (6.0.0) - Visualization
            'MpServer': { techPackage: 'mappView', as6Version: '6.0.0', as6LibVersion: '6.0.0' },
            
            // mappMotion (6.0.0) - Motion control
            'MpAxis': { techPackage: 'mappMotion', as6Version: '6.0.0', as6LibVersion: '6.0.0' },
            'MpCnc': { techPackage: 'mappMotion', as6Version: '6.0.0', as6LibVersion: '6.0.0' },
            'MpRobotics': { techPackage: 'mappMotion', as6Version: '6.0.0', as6LibVersion: '6.0.0' },
            'McAcpAx': { techPackage: 'mappMotion', as6Version: '6.0.0', as6LibVersion: '6.0.0' },
            'McAxis': { techPackage: 'mappMotion', as6Version: '6.0.0', as6LibVersion: '6.0.0' },
            'McBase': { techPackage: 'mappMotion', as6Version: '6.0.0', as6LibVersion: '6.0.0' },
            
            // mappControl (6.0.0) - Advanced control
            'MpTemp': { techPackage: 'mappControl', as6Version: '6.0.0', as6LibVersion: '6.0.0' },
            
            // mappCockpit (6.0.0) - Diagnostics
            'CoTrace': { techPackage: 'mappCockpit', as6Version: '6.0.0', as6LibVersion: '6.0.0' },
            
            // Acp10Arnc0 (6.0.0) - ACOPOS motion (note: library versions use 6.00.0 format)
            'Acp10_MC': { techPackage: 'Acp10Arnc0', as6Version: '6.0.0', as6LibVersion: '6.00.0' },
            'Acp10man': { techPackage: 'Acp10Arnc0', as6Version: '6.0.0', as6LibVersion: '6.00.0' },
            'Acp10par': { techPackage: 'Acp10Arnc0', as6Version: '6.0.0', as6LibVersion: '6.00.0' },
            'Acp10sim': { techPackage: 'Acp10Arnc0', as6Version: '6.0.0', as6LibVersion: '6.00.0' },
            'NcGlobal': { techPackage: 'Acp10Arnc0', as6Version: '6.0.0', as6LibVersion: '6.00.0' },
            
            // MpBase - Core mapp component (included with most tech packages)
            'MpBase': { techPackage: 'mappServices', as6Version: '6.0.0', as6LibVersion: '6.0.0' },
            
            // MTTypes/MTData - Motion toolbox (Library_2)
            'MTTypes': { source: 'Library_2', as6LibVersion: null },
            'MTData': { source: 'Library_2', as6LibVersion: null },
            'MTAdvanced': { source: 'Library_2', as6LibVersion: null },
            'MTSystem': { source: 'Library_2', as6LibVersion: null },
            'MTTemp': { source: 'Library_2', as6LibVersion: null },
            
            // Core runtime libraries (Library_2 - no version, bundled with AR)
            'runtime': { source: 'Library_2', as6LibVersion: null },
            'brsystem': { source: 'Library_2', as6LibVersion: null },
            'sys_lib': { source: 'Library_2', as6LibVersion: null },
            'standard': { source: 'Library_2', as6LibVersion: null },
            'operator': { source: 'Library_2', as6LibVersion: null },
            'astime': { source: 'Library_2', as6LibVersion: null },
            'FileIO': { source: 'Library_2', as6LibVersion: null },
            'DataObj': { source: 'Library_2', as6LibVersion: null },
            'AsSem': { source: 'Library_2', as6LibVersion: null },
            'AsBrMath': { source: 'Library_2', as6LibVersion: null },
            'AsBrStr': { source: 'Library_2', as6LibVersion: null },
            'AsBrWStr': { source: 'Library_2', as6LibVersion: null },
            'AsIO': { source: 'Library_2', as6LibVersion: null },
            'AsIODiag': { source: 'Library_2', as6LibVersion: null },
            'AsUSB': { source: 'Library_2', as6LibVersion: null },
            'AsWeigh': { source: 'Library_2', as6LibVersion: null },
            'AsTCP': { source: 'Library_2', as6LibVersion: null },
            'AsUDP': { source: 'Library_2', as6LibVersion: null },
            'AsHttp': { source: 'Library_2', as6LibVersion: null },
            'AsXml': { source: 'Library_2', as6LibVersion: null },
            'AsZip': { source: 'Library_2', as6LibVersion: null },
            'AsMem': { source: 'Library_2', as6LibVersion: null },
            'AsOpcUac': { source: 'Library_2', as6LibVersion: null },
            'AsOpcUas': { source: 'Library_2', as6LibVersion: null },
            'AsIecCon': { source: 'Library_2', as6LibVersion: null },
            'ArEventLog': { source: 'Library_2', as6LibVersion: null },
            'ArProject': { source: 'Library_2', as6LibVersion: null },
            'ArUser': { source: 'Library_2', as6LibVersion: null },
            'ArSsl': { source: 'Library_2', as6LibVersion: null },
            'powerlnk': { source: 'Library_2', as6LibVersion: null }
        },
        
        // Visual Components support in AS6
        // VC3 is NOT supported in AS6 - project cannot be converted
        // VC4 is supported but may need stack size adjustments
        visualComponents: {
            vc3: {
                supported: false,
                severity: 'error',
                blocking: true,
                markers: ['Language="Vc3"', 'Language="VC3"', '<Vc3', 'ObjectType="VC3'],
                description: 'Visual Components 3 (VC3) is NOT supported in AS6',
                notes: 'VC3 must be migrated to VC4 or mappView before AS6 conversion. This is a blocking issue.',
                migration: 'Use B&R VC3 to VC4 migration tool or redesign with mappView'
            },
            vc4: {
                supported: true,
                severity: 'warning',
                blocking: false,
                markers: ['Language="Vc4"', 'Language="VC4"', '<Vc4', 'ObjectType="VC4'],
                description: 'Visual Components 4 (VC4) requires stack size verification',
                notes: 'VC4 is supported in AS6 but task stack sizes may need adjustment.',
                stackSizeRecommendation: 16384,
                migration: 'Verify task stack sizes are at least 16KB for VC4 tasks'
            }
        },
        
        // Security and access control requirements for AS6
        securityChecks: {
            userRoleSystem: {
                required: true,
                path: 'AccessAndSecurity/UserRoleSystem',
                description: 'User Role System folder required in AS6',
                notes: 'AS6 requires explicit security configuration'
            },
            certificateStore: {
                required: true,
                path: 'AccessAndSecurity/CertificateStore',
                description: 'Certificate Store folder required in AS6',
                notes: 'TLS/SSL certificates must be managed in AS6'
            },
            anslAuthentication: {
                hwAttribute: 'AnslAuthentication',
                description: 'ANSL authentication is mandatory in AS6',
                notes: 'ANSL (Automation Network Security Layer) must be configured'
            }
        }
    },
    
    // ==========================================
    // OBSOLETE FUNCTION BLOCKS
    // These FBs are deprecated and should be replaced with modern equivalents
    // ==========================================
    obsoleteFunctionBlocks: [
        // Legacy MC_BR motion function blocks -> Standard PLCopen
        {
            name: 'MC_BR_MoveAbsolute',
            pattern: /\bMC_BR_MoveAbsolute\b/g,
            replacement: 'MC_MoveAbsolute',
            severity: 'warning',
            category: 'motion',
            description: 'B&R-specific motion FB replaced by PLCopen standard',
            notes: 'Use standard PLCopen MC_MoveAbsolute. Parameters are compatible.',
            autoReplace: true
        },
        {
            name: 'MC_BR_MoveAdditive',
            pattern: /\bMC_BR_MoveAdditive\b/g,
            replacement: 'MC_MoveAdditive',
            severity: 'warning',
            category: 'motion',
            description: 'B&R-specific motion FB replaced by PLCopen standard',
            notes: 'Use standard PLCopen MC_MoveAdditive.',
            autoReplace: true
        },
        {
            name: 'MC_BR_MoveVelocity',
            pattern: /\bMC_BR_MoveVelocity\b/g,
            replacement: 'MC_MoveVelocity',
            severity: 'warning',
            category: 'motion',
            description: 'B&R-specific motion FB replaced by PLCopen standard',
            notes: 'Use standard PLCopen MC_MoveVelocity.',
            autoReplace: true
        },
        {
            name: 'MC_BR_Jog',
            pattern: /\bMC_BR_Jog\b/g,
            replacement: 'MC_Jog',
            severity: 'warning',
            category: 'motion',
            description: 'B&R-specific jog FB replaced by standard',
            notes: 'Use standard MC_Jog function block.',
            autoReplace: true
        },
        {
            name: 'MC_BR_Halt',
            pattern: /\bMC_BR_Halt\b/g,
            replacement: 'MC_Halt',
            severity: 'warning',
            category: 'motion',
            description: 'B&R-specific halt FB replaced by PLCopen standard',
            notes: 'Use standard PLCopen MC_Halt.',
            autoReplace: true
        },
        {
            name: 'MC_BR_Stop',
            pattern: /\bMC_BR_Stop\b/g,
            replacement: 'MC_Stop',
            severity: 'warning',
            category: 'motion',
            description: 'B&R-specific stop FB replaced by PLCopen standard',
            notes: 'Use standard PLCopen MC_Stop.',
            autoReplace: true
        },
        {
            name: 'MC_BR_Home',
            pattern: /\bMC_BR_Home\b/g,
            replacement: 'MC_Home',
            severity: 'warning',
            category: 'motion',
            description: 'B&R-specific home FB replaced by PLCopen standard',
            notes: 'Use standard PLCopen MC_Home.',
            autoReplace: true
        },
        {
            name: 'MC_BR_ReadActualPosition',
            pattern: /\bMC_BR_ReadActualPosition\b/g,
            replacement: 'MC_ReadActualPosition',
            severity: 'warning',
            category: 'motion',
            description: 'B&R-specific read position FB replaced by PLCopen standard',
            notes: 'Use standard PLCopen MC_ReadActualPosition.',
            autoReplace: true
        },
        // MTBasics legacy temperature/control FBs
        {
            name: 'MTBasicsPID',
            pattern: /\bMTBasicsPID\b/g,
            replacement: 'MpTempController',
            severity: 'warning',
            category: 'temperature',
            description: 'Legacy MTBasics PID controller replaced by mapp',
            notes: 'Consider migrating to MpTempController for advanced features.',
            autoReplace: false
        },
        {
            name: 'MTBasicsPWM',
            pattern: /\bMTBasicsPWM\b/g,
            replacement: 'MpTempController',
            severity: 'info',
            category: 'temperature',
            description: 'Legacy MTBasics PWM controller',
            notes: 'MpTempController includes PWM output capabilities.',
            autoReplace: false
        },
        // Legacy OPC UA function blocks
        {
            name: 'UaConnect',
            pattern: /\bUaConnect\b/g,
            replacement: 'UA_Connect',
            severity: 'warning',
            category: 'opcua',
            description: 'Legacy OPC UA connect FB',
            notes: 'Use UA_Connect from OpcUa library.',
            autoReplace: true
        },
        {
            name: 'UaDisconnect',
            pattern: /\bUaDisconnect\b/g,
            replacement: 'UA_Disconnect',
            severity: 'warning',
            category: 'opcua',
            description: 'Legacy OPC UA disconnect FB',
            notes: 'Use UA_Disconnect from OpcUa library.',
            autoReplace: true
        },
        {
            name: 'UaRead',
            pattern: /\bUaRead\b/g,
            replacement: 'UA_Read',
            severity: 'warning',
            category: 'opcua',
            description: 'Legacy OPC UA read FB',
            notes: 'Use UA_Read from OpcUa library.',
            autoReplace: true
        },
        {
            name: 'UaWrite',
            pattern: /\bUaWrite\b/g,
            replacement: 'UA_Write',
            severity: 'warning',
            category: 'opcua',
            description: 'Legacy OPC UA write FB',
            notes: 'Use UA_Write from OpcUa library.',
            autoReplace: true
        },
        // Legacy string functions
        {
            name: 'brsstrcat',
            pattern: /\bbrsstrcat\b/g,
            replacement: 'brstrcat',
            severity: 'info',
            category: 'string',
            description: 'Legacy string concatenation function',
            notes: 'Use AsBrStr library brstrcat function.',
            autoReplace: true
        },
        {
            name: 'brsstrcpy',
            pattern: /\bbrsstrcpy\b/g,
            replacement: 'brstrcpy',
            severity: 'info',
            category: 'string',
            description: 'Legacy string copy function',
            notes: 'Use AsBrStr library brstrcpy function.',
            autoReplace: true
        },
        {
            name: 'brssprintf',
            pattern: /\bbrssprintf\b/g,
            replacement: 'brsprintf',
            severity: 'info',
            category: 'string',
            description: 'Legacy string format function',
            notes: 'Use AsBrStr library brsprintf function.',
            autoReplace: true
        }
    ],

    // ==========================================
    // DEPRECATED LIBRARIES
    // ==========================================
    libraries: [
        // Completely discontinued libraries (no replacement)
        {
            id: "lib_asarcnet",
            name: "AsARCNET",
            severity: "error",
            category: "networking",
            description: "ARCNET networking library - discontinued",
            replacement: null,
            notes: "ARCNET technology is obsolete. Migrate to POWERLINK or Ethernet-based communication.",
            removedIn: "AS4.7"
        },
        {
            id: "lib_assgcio",
            name: "AsSGCIO",
            severity: "error",
            category: "io",
            description: "SGC I/O library - discontinued",
            replacement: null,
            notes: "Hardware-specific library no longer supported.",
            removedIn: "AS4.5"
        },
        {
            id: "lib_astpu",
            name: "AsTPU",
            severity: "error",
            category: "system",
            description: "TPU library - discontinued",
            replacement: null,
            notes: "TPU functionality integrated into runtime.",
            removedIn: "AS4.3"
        },
        {
            id: "lib_c220man",
            name: "C220man",
            severity: "error",
            category: "hardware",
            description: "C220 management library - discontinued",
            replacement: null,
            notes: "C220 hardware family no longer supported.",
            removedIn: "AS4.0"
        },
        {
            id: "lib_canio",
            name: "CANIO",
            severity: "error",
            category: "fieldbus",
            description: "CAN I/O library - discontinued",
            replacement: { name: "ArCanOpen", description: "Modern CANopen library" },
            notes: "Migrate to ArCanOpen for CAN-based communication.",
            removedIn: "AS4.5"
        },
        {
            id: "lib_dm_lib",
            name: "DM_Lib",
            severity: "error",
            category: "data",
            description: "Data management library - archived",
            replacement: null,
            notes: "Use modern data handling approaches.",
            removedIn: "AS4.7"
        },
        {
            id: "lib_fdd_lib",
            name: "FDD_lib",
            severity: "error",
            category: "storage",
            description: "Floppy disk drive library - discontinued",
            replacement: { name: "FileIO", description: "Modern file I/O library" },
            notes: "Floppy disk hardware obsolete. Use USB or network storage.",
            removedIn: "AS3.0"
        },
        {
            id: "lib_if361",
            name: "IF361",
            severity: "error",
            category: "communication",
            description: "IF361 interface library - discontinued",
            replacement: null,
            notes: "Hardware interface no longer manufactured.",
            removedIn: "AS4.3"
        },
        {
            id: "lib_io_lib",
            name: "IO_lib",
            severity: "warning",
            category: "io",
            description: "Legacy I/O library",
            replacement: { name: "AsIO", description: "Modern I/O library with async support" },
            notes: "IO_lib functions have direct equivalents in AsIO.",
            removedIn: "AS5.0",
            functionMappings: [
                { old: "IO_Read", new: "AsIO_Read" },
                { old: "IO_Write", new: "AsIO_Write" }
            ]
        },
        {
            id: "lib_ioconfig",
            name: "IOConfig",
            severity: "warning",
            category: "io",
            description: "I/O configuration library",
            replacement: { name: "ArIoConfig", description: "Updated I/O configuration" },
            notes: "API changes require code updates.",
            removedIn: "AS5.0"
        },
        {
            id: "lib_ioctrl",
            name: "IOCtrl",
            severity: "warning",
            category: "io",
            description: "I/O control library",
            replacement: { name: "ArIoCtrl", description: "Modern I/O control" },
            notes: "Minor API changes.",
            removedIn: "AS5.0"
        },
        {
            id: "lib_pb_lib",
            name: "PB_lib",
            severity: "error",
            category: "fieldbus",
            description: "PROFIBUS library - legacy",
            replacement: { name: "ArProfibus", description: "Modern PROFIBUS library" },
            notes: "Complete API redesign required.",
            removedIn: "AS4.9"
        },
        {
            id: "lib_pbixman",
            name: "PBIXMAN",
            severity: "error",
            category: "fieldbus",
            description: "PROFIBUS IX manager - discontinued",
            replacement: null,
            notes: "Functionality merged into ArProfibus.",
            removedIn: "AS4.5"
        },
        {
            id: "lib_rio_lib",
            name: "RIO_lib",
            severity: "error",
            category: "io",
            description: "Remote I/O library - discontinued",
            replacement: { name: "ArRemoteIo", description: "Modern remote I/O handling" },
            notes: "Architecture changes require code updates.",
            removedIn: "AS4.7"
        },
        {
            id: "lib_spsioman",
            name: "SPSIOMAN",
            severity: "error",
            category: "system",
            description: "SPS I/O manager - discontinued",
            replacement: null,
            notes: "Legacy system component.",
            removedIn: "AS4.0"
        },
        {
            id: "lib_tcpipmgr",
            name: "TCPIPMGR",
            severity: "error",
            category: "networking",
            description: "TCP/IP manager - discontinued",
            replacement: { name: "AsTCP", description: "Modern TCP library" },
            notes: "Use AsTCP for TCP/IP communication.",
            removedIn: "AS4.5"
        },
        
        // Partial discontinuation - some functions deprecated
        {
            id: "lib_asmc",
            name: "AsMc",
            severity: "warning",
            category: "motion",
            description: "Motion control library - partially deprecated",
            replacement: { name: "McAcpAx", description: "Modern motion control (mapp Motion)" },
            notes: "Basic functions available; advanced features moved to mapp Motion.",
            removedIn: "AS6.0",
            functionMappings: [
                { old: "MC_Power", new: "MC_Power", notes: "Interface unchanged" },
                { old: "MC_Home", new: "MC_Home", notes: "Interface unchanged" },
                { old: "MC_MoveAbsolute", new: "MC_MoveAbsolute", notes: "Interface unchanged" }
            ]
        },
        {
            id: "lib_asnetx",
            name: "AsNetX",
            severity: "warning",
            category: "networking",
            description: "Network extension library - partially deprecated",
            replacement: { name: "ArNetX", description: "Updated network library" },
            notes: "Some functions renamed with Ar prefix.",
            removedIn: "AS5.5"
        },
        {
            id: "lib_logging",
            name: "Logging",
            severity: "warning",
            category: "diagnostics",
            description: "Logging library - superseded",
            replacement: { name: "ArEventLog", description: "Event logging system" },
            notes: "ArEventLog provides more features and better integration.",
            removedIn: "AS5.0"
        },
        {
            id: "lib_asima",
            name: "AsIMA",
            severity: "warning",
            category: "weighing",
            description: "Weighing library - superseded",
            replacement: { name: "MpWeight", description: "mapp Weight component" },
            notes: "mapp Weight provides enhanced weighing functionality.",
            removedIn: "AS5.5"
        },
        {
            id: "lib_commserv",
            name: "Commserv",
            severity: "error",
            category: "communication",
            description: "Communication server - discontinued",
            replacement: { name: "AsTCP", description: "Use standard TCP/UDP libraries" },
            notes: "Legacy communication approach.",
            removedIn: "AS4.5"
        },
        {
            id: "lib_inaclnt",
            name: "INAclnt",
            severity: "error",
            category: "communication",
            description: "INA client library - discontinued",
            replacement: null,
            notes: "INA protocol no longer supported.",
            removedIn: "AS4.7"
        },
        {
            id: "lib_askey",
            name: "AsKey",
            severity: "error",
            category: "input",
            description: "Keyboard library - discontinued",
            replacement: null,
            notes: "Hardware keyboard support removed.",
            removedIn: "AS4.3"
        },
        {
            id: "lib_asslip",
            name: "AsSLIP",
            severity: "error",
            category: "networking",
            description: "SLIP protocol library - discontinued",
            replacement: null,
            notes: "SLIP protocol obsolete. Use Ethernet.",
            removedIn: "AS4.0"
        },
        {
            id: "lib_asarlog",
            name: "AsArLog",
            severity: "warning",
            category: "diagnostics",
            description: "AR logging library - superseded",
            replacement: { name: "ArEventLog", description: "Unified event logging" },
            notes: "ArEventLog replaces all logging libraries.",
            removedIn: "AS5.0",
            functionMappings: [
                { old: "AsArLogWrite", new: "ArEventLogWrite" },
                { old: "AsArLogCreate", new: "ArEventLogCreate" }
            ]
        },
        {
            id: "lib_assound",
            name: "AsSound",
            severity: "error",
            category: "multimedia",
            description: "Sound library - discontinued",
            replacement: null,
            notes: "Audio output not supported in modern controllers.",
            removedIn: "AS4.5"
        },
        {
            id: "lib_aserrtxt",
            name: "AsErrTxt",
            severity: "warning",
            category: "diagnostics",
            description: "Error text library - deprecated",
            replacement: { name: "ArEventLog", description: "Use event log for error messages" },
            notes: "Error handling integrated into event system.",
            removedIn: "AS5.0"
        },
        {
            id: "lib_asplksup",
            name: "AsPlkSup",
            severity: "warning",
            category: "networking",
            description: "POWERLINK support library - superseded",
            replacement: { name: "ArEpl", description: "Modern POWERLINK library" },
            notes: "ArEpl provides full POWERLINK functionality.",
            removedIn: "AS5.0"
        },
        {
            id: "lib_if661",
            name: "IF661",
            severity: "error",
            category: "communication",
            description: "IF661 interface library - discontinued",
            replacement: null,
            notes: "Hardware interface obsolete.",
            removedIn: "AS4.3"
        },
        {
            id: "lib_ppdpr",
            name: "ppdpr",
            severity: "error",
            category: "communication",
            description: "PPD/PR library - discontinued",
            replacement: null,
            notes: "Legacy protocol no longer supported.",
            removedIn: "AS4.0"
        },
        {
            id: "lib_printer",
            name: "printer",
            severity: "error",
            category: "output",
            description: "Printer library - discontinued",
            replacement: null,
            notes: "Direct printing not supported. Use file export.",
            removedIn: "AS4.5"
        },
        {
            id: "lib_spooler",
            name: "Spooler",
            severity: "error",
            category: "output",
            description: "Print spooler - discontinued",
            replacement: null,
            notes: "Printing functionality removed.",
            removedIn: "AS4.5"
        },
        {
            id: "lib_sram200x",
            name: "SRAM200x",
            severity: "error",
            category: "storage",
            description: "SRAM 200x library - discontinued",
            replacement: null,
            notes: "Hardware-specific storage no longer available.",
            removedIn: "AS4.0"
        },
        {
            id: "lib_asstring",
            name: "AsString",
            severity: "error",
            category: "utilities",
            description: "String manipulation library - superseded",
            replacement: { name: "AsBrStr", description: "Modern string library with Unicode support" },
            notes: "AsBrStr provides enhanced string functions with internationalization.",
            removedIn: "AS5.0",
            functionMappings: [
                { old: "strlen", new: "brsstrlen", notes: "Return type may differ" },
                { old: "strcpy", new: "brsstrcpy", notes: "Same interface" },
                { old: "strcat", new: "brsstrcat", notes: "Same interface" },
                { old: "strcmp", new: "brsstrcmp", notes: "Same interface" },
                { old: "strncpy", new: "brsstrncpy", notes: "Same interface" },
                { old: "atoi", new: "brsatoi", notes: "Same interface" },
                { old: "itoa", new: "brsitoa", notes: "Same interface" }
            ]
        },
        {
            id: "lib_asmath",
            name: "AsMath",
            severity: "error",
            category: "utilities",
            description: "Math library - superseded",
            replacement: { name: "AsBrMath", description: "Modern math library" },
            notes: "Direct function replacements available.",
            removedIn: "AS5.0",
            functionMappings: [
                { old: "sin", new: "SIN", notes: "Built-in function" },
                { old: "cos", new: "COS", notes: "Built-in function" },
                { old: "sqrt", new: "SQRT", notes: "Built-in function" },
                { old: "abs", new: "ABS", notes: "Built-in function" }
            ]
        },
        {
            id: "lib_ascisman",
            name: "AsCisMan",
            severity: "warning",
            category: "system",
            description: "CIS manager - deprecated",
            replacement: { name: "ArCis", description: "Modern CIS library" },
            notes: "API changes required.",
            removedIn: "AS5.5"
        },
        {
            id: "lib_convert",
            name: "CONVERT",
            severity: "warning",
            category: "utilities",
            description: "Data conversion library - superseded",
            replacement: { name: "AsIecCon", description: "IEC conversion functions" },
            notes: "AsIecCon follows IEC standards.",
            removedIn: "AS5.0"
        },
        {
            id: "lib_aspciext",
            name: "AsPciExt",
            severity: "error",
            category: "hardware",
            description: "PCI extension library - discontinued",
            replacement: null,
            notes: "PCI hardware architecture changed.",
            removedIn: "AS4.7"
        },
        {
            id: "lib_aswstr",
            name: "AsWStr",
            severity: "error",
            category: "utilities",
            description: "Wide string library - superseded",
            replacement: { name: "AsBrWStr", description: "Modern wide string library" },
            notes: "Full Unicode support in replacement.",
            removedIn: "AS5.0"
        },
        {
            id: "lib_net2000",
            name: "NET2000",
            severity: "error",
            category: "networking",
            description: "NET2000 library - discontinued",
            replacement: null,
            notes: "Legacy networking protocol.",
            removedIn: "AS4.0"
        },
        {
            id: "lib_fb_lib",
            name: "FB_lib",
            severity: "error",
            category: "utilities",
            description: "Function block library - archived",
            replacement: null,
            notes: "Standard function blocks now in runtime.",
            removedIn: "AS4.5"
        },
        {
            id: "lib_dpmaster",
            name: "DPMaster",
            severity: "error",
            category: "fieldbus",
            description: "PROFIBUS DP master - discontinued",
            replacement: { name: "ArProfibus", description: "Modern PROFIBUS implementation" },
            notes: "ArProfibus includes master functionality.",
            removedIn: "AS4.9"
        },
        {
            id: "lib_asprofibus",
            name: "AsPROFIBUS",
            severity: "warning",
            category: "fieldbus",
            description: "PROFIBUS library - superseded",
            replacement: { name: "ArProfibus", description: "Modern PROFIBUS library" },
            notes: "API compatibility layer available.",
            removedIn: "AS5.0"
        },
        {
            id: "lib_assafety",
            name: "AsSafety",
            severity: "warning",
            category: "safety",
            description: "Safety library - superseded",
            replacement: { name: "MpSafety", description: "mapp Safety component" },
            notes: "mapp Safety provides certified safety functions.",
            removedIn: "AS5.5"
        },
        {
            id: "lib_loopcont",
            name: "LoopCont",
            severity: "warning",
            category: "control",
            description: "Loop control library - superseded",
            replacement: { name: "MpTemp", description: "mapp Temperature / mapp Control" },
            notes: "mapp components provide advanced control algorithms.",
            removedIn: "AS5.5"
        },
        {
            id: "lib_ashydcon",
            name: "AsHydCon",
            severity: "warning",
            category: "hydraulics",
            description: "Hydraulic control library - superseded",
            replacement: { name: "MpHydraulics", description: "mapp Hydraulics component" },
            notes: "Complete hydraulic control solution.",
            removedIn: "AS5.5"
        }
    ],

    // ==========================================
    // DEPRECATED FUNCTIONS & FUNCTION BLOCKS
    // ==========================================
    functions: [
        {
            id: "func_brsmemcpy",
            name: "brsmemcpy",
            library: "AsBrStr",
            severity: "info",
            description: "Memory copy function",
            replacement: { name: "memcpy", library: "runtime", notes: "Use standard memcpy" },
            pattern: /brsmemcpy\s*\(/gi
        },
        {
            id: "func_brsmemset",
            name: "brsmemset",
            library: "AsBrStr",
            severity: "info",
            description: "Memory set function",
            replacement: { name: "memset", library: "runtime", notes: "Use standard memset" },
            pattern: /brsmemset\s*\(/gi
        },
        {
            id: "func_datobj",
            name: "DatObjCreate",
            library: "DataObj",
            severity: "warning",
            description: "Data object creation - interface changed",
            replacement: { name: "DatObjCreate", library: "DataObj", notes: "Parameter order changed in AS6" },
            pattern: /DatObjCreate\s*\(/gi
        },
        {
            id: "func_fub_enable",
            name: "FUB_ENABLE",
            library: "runtime",
            severity: "info",
            description: "Function block enable pattern - deprecated style",
            replacement: { name: "Enable pattern", notes: "Use Enable input with status outputs" },
            pattern: /FUB_ENABLE/gi
        }
    ],

    // ==========================================
    // DEPRECATED HARDWARE MODULES
    // ==========================================
    hardware: [
        // CPU Modules
        {
            id: "hw_x20cp0201",
            name: "X20CP0201",
            type: "cpu",
            severity: "error",
            description: "Compact CPU module - discontinued",
            replacement: { name: "X20CP1381", description: "Modern compact CPU with more memory" },
            notes: "Hardware replacement required. Check I/O compatibility.",
            eol: "2020-06-30"
        },
        {
            id: "hw_x20cp0291",
            name: "X20CP0291",
            type: "cpu",
            severity: "error",
            description: "Compact CPU module - discontinued",
            replacement: { name: "X20CP1382", description: "Enhanced compact CPU" },
            notes: "Direct replacement available.",
            eol: "2020-06-30"
        },
        {
            id: "hw_x20cp1381_old",
            name: "X20CP1381",
            type: "cpu",
            severity: "info",
            description: "Standard CPU module - supported but aging",
            replacement: { name: "X20CP1586", description: "Latest generation CPU" },
            notes: "Still supported. Consider upgrade for new projects.",
            eol: null
        },
        {
            id: "hw_x20cp1382_old",
            name: "X20CP1382",
            type: "cpu",
            severity: "info",
            description: "Enhanced CPU module - supported but aging",
            replacement: { name: "X20CP1586", description: "Latest generation CPU" },
            notes: "Still supported. Consider upgrade for new projects.",
            eol: null
        },
        {
            id: "hw_x20cp1483",
            name: "X20CP1483",
            type: "cpu",
            severity: "warning",
            description: "Performance CPU - limited support",
            replacement: { name: "X20CP1586", description: "Latest performance CPU" },
            notes: "Support ends 2026. Plan migration.",
            eol: "2026-12-31"
        },
        {
            id: "hw_x20cp1584",
            name: "X20CP1584",
            type: "cpu",
            severity: "warning",
            description: "High-performance CPU - limited support",
            replacement: { name: "X20CP3586", description: "Next-gen high-performance CPU" },
            notes: "Support ends 2026. Plan migration.",
            eol: "2026-12-31"
        },

        // I/O Modules
        {
            id: "hw_x20ai2632_1",
            name: "X20AI2632-1",
            type: "analog_input",
            severity: "error",
            description: "Analog input module - discontinued",
            replacement: { name: "X20AI2636", description: "6-channel analog input" },
            notes: "Check channel count and resolution compatibility.",
            eol: "2021-12-31"
        },
        {
            id: "hw_x20ao2632_1",
            name: "X20AO2632-1",
            type: "analog_output",
            severity: "error",
            description: "Analog output module - discontinued",
            replacement: { name: "X20AO2636", description: "6-channel analog output" },
            notes: "Check channel count and resolution compatibility.",
            eol: "2021-12-31"
        },
        {
            id: "hw_x20do2623",
            name: "X20DO2623",
            type: "digital_output",
            severity: "error",
            description: "Digital output module - discontinued",
            replacement: { name: "X20DO2649", description: "Modern digital output" },
            notes: "Direct replacement with improved specs.",
            eol: "2020-12-31"
        },
        {
            id: "hw_x20dm9371",
            name: "X20DM9371",
            type: "digital_mixed",
            severity: "warning",
            description: "Digital mixed module - limited support",
            replacement: { name: "X20DM9324", description: "Updated mixed I/O module" },
            notes: "Support continues. Plan future migration.",
            eol: "2027-12-31"
        },
        {
            id: "hw_x20dm9391",
            name: "X20DM9391",
            type: "digital_mixed",
            severity: "warning",
            description: "Digital mixed module - limited support",
            replacement: { name: "X20DM9324", description: "Updated mixed I/O module" },
            notes: "Support continues. Plan future migration.",
            eol: "2027-12-31"
        },

        // Interface Modules
        {
            id: "hw_x20if0022",
            name: "X20IF0022",
            type: "interface",
            severity: "error",
            description: "Interface module - discontinued",
            replacement: null,
            notes: "No direct replacement. Evaluate architecture.",
            eol: "2019-12-31"
        },
        {
            id: "hw_x20if0023",
            name: "X20IF0023",
            type: "interface",
            severity: "error",
            description: "Interface module - discontinued",
            replacement: null,
            notes: "No direct replacement. Evaluate architecture.",
            eol: "2019-12-31"
        },
        {
            id: "hw_x20if0024",
            name: "X20IF0024",
            type: "interface",
            severity: "error",
            description: "Interface module - discontinued",
            replacement: { name: "X20IF10D1-1", description: "Modern interface module" },
            notes: "Interface type may differ. Check compatibility.",
            eol: "2020-12-31"
        },

        // Power Supplies
        {
            id: "hw_x20ps2100",
            name: "X20PS2100",
            type: "power_supply",
            severity: "warning",
            description: "Power supply - aging model",
            replacement: { name: "X20PS3300", description: "Modern power supply" },
            notes: "Still supported. Upgrade recommended for new installations.",
            eol: null
        },

        // Bus Modules
        {
            id: "hw_x20bc0083",
            name: "X20BC0083",
            type: "bus_controller",
            severity: "warning",
            description: "Bus controller - limited support",
            replacement: { name: "X20BC0087", description: "Modern bus controller" },
            notes: "Support continues with limited updates.",
            eol: "2027-12-31"
        }
    ],

    // ==========================================
    // CODE PATTERNS TO DETECT
    // ==========================================
    patterns: [
        {
            id: "pattern_library_decl",
            name: "Library Declaration",
            regex: /\{LIBRARY\s+(\w+)\}/gi,
            type: "library",
            description: "Detects library import declarations"
        },
        {
            id: "pattern_var_external",
            name: "External Variable",
            regex: /VAR_EXTERNAL\s*\n([\s\S]*?)END_VAR/gi,
            type: "variable",
            description: "Detects external variable declarations"
        },
        {
            id: "pattern_function_call",
            name: "Function Call",
            regex: /(\w+)\s*\(/g,
            type: "function",
            description: "Detects function and function block calls"
        },
        {
            id: "pattern_hardware_ref",
            name: "Hardware Reference",
            regex: /<Module\s+Name="([^"]+)"/gi,
            type: "hardware",
            description: "Detects hardware module references in XML"
        },
        {
            id: "pattern_hw_type",
            name: "Hardware Type",
            regex: /Type="([^"]+)"/gi,
            type: "hardware",
            description: "Detects hardware type declarations"
        }
    ],

    // ==========================================
    // HELPER METHODS
    // ==========================================
    
    /**
     * Find deprecated library by name
     */
    findLibrary(name) {
        return this.libraries.find(lib => 
            lib.name.toLowerCase() === name.toLowerCase()
        );
    },

    /**
     * Find deprecated function by name
     */
    findFunction(name) {
        return this.functions.find(func => 
            func.name.toLowerCase() === name.toLowerCase()
        );
    },

    /**
     * Find deprecated hardware by name
     */
    findHardware(name) {
        return this.hardware.find(hw => 
            hw.name.toLowerCase() === name.toLowerCase()
        );
    },

    /**
     * Get all items by severity
     */
    getBySeverity(severity) {
        return {
            libraries: this.libraries.filter(lib => lib.severity === severity),
            functions: this.functions.filter(func => func.severity === severity),
            hardware: this.hardware.filter(hw => hw.severity === severity)
        };
    },

    /**
     * Get all deprecated library names for quick lookup
     */
    getDeprecatedLibraryNames() {
        return this.libraries.map(lib => lib.name.toLowerCase());
    },

    /**
     * Get replacement suggestion for a library
     */
    getLibraryReplacement(name) {
        const lib = this.findLibrary(name);
        if (lib && lib.replacement) {
            return lib.replacement;
        }
        return null;
    },

    /**
     * Check if a module name matches deprecated hardware
     */
    isDeprecatedHardware(moduleName) {
        return this.hardware.some(hw => 
            moduleName.toLowerCase().includes(hw.name.toLowerCase())
        );
    },

    // ==========================================
    // AS6 CONVERSION HELPERS
    // ==========================================

    /**
     * Generate AS6 project file (.apj) from AS4 format
     * @param {string} as4Content - Original AS4 .apj content
     * @param {object} options - Conversion options
     * @returns {string} - AS6 format .apj content
     */
    convertProjectFileToAS6(as4Content, options = {}) {
        const as6 = this.as6Format;
        
        // Extract existing values from AS4
        const editionMatch = as4Content.match(/Edition="([^"]+)"/);
        const edition = editionMatch ? editionMatch[1] : 'Standard';
        
        // Extract existing IEC settings (AS4 uses nested format)
        const pointersMatch = as4Content.match(/<Pointers>([^<]+)<\/Pointers>/i);
        const namingMatch = as4Content.match(/<NamingConventions>([^<]+)<\/NamingConventions>/i);
        const pointers = pointersMatch ? pointersMatch[1] === 'true' : true;
        const namingConventions = namingMatch ? namingMatch[1] === 'true' : true;
        
        // Extract technology packages from AS4
        const techPackages = this.extractTechnologyPackages(as4Content);
        
        // Build AS6 format
        let as6Content = `<?xml version="1.0" encoding="utf-8"?>
<?AutomationStudio Version="6.5.0.305" WorkingVersion="6.1"?>
<Project Version="1.0.0" Edition="${edition}" EditionComment="${edition}" xmlns="${as6.projectNamespace}">
  <Communication />
  <ANSIC DefaultIncludes="true" />
  <IEC ExtendedConstants="true" IecExtendedComments="true" KeywordsAsStructureMembers="false" NamingConventions="${namingConventions}" Pointers="${pointers}" Preprocessor="false" />
  <Motion RestartAcoposParameter="true" RestartInitParameter="true" />
  <Project StoreRuntimeInProject="true" />
  <Variables DefaultInitValue="0" DefaultRetain="false" DefaultVolatile="true" />
  <TechnologyPackages>
`;
        
        // Add converted technology packages
        const convertedPackages = this.convertTechnologyPackages(techPackages);
        convertedPackages.forEach(pkg => {
            if (pkg.subVersions) {
                let attrs = Object.entries(pkg.subVersions).map(([k, v]) => `${k}="${v}"`).join(' ');
                as6Content += `    <${pkg.name} ${attrs} Version="${pkg.version}" />\n`;
            } else {
                as6Content += `    <${pkg.name} Version="${pkg.version}" />\n`;
            }
        });
        
        as6Content += `  </TechnologyPackages>
</Project>`;
        
        return as6Content;
    },

    /**
     * Extract technology packages from AS4 project file
     */
    extractTechnologyPackages(as4Content) {
        const packages = [];
        const pkgPattern = /<(\w+)\s+Version="([^"]+)"\s*\/>/g;
        let match;
        
        // Find TechnologyPackages section
        const techSection = as4Content.match(/<TechnologyPackages>([\s\S]*?)<\/TechnologyPackages>/);
        if (techSection) {
            while ((match = pkgPattern.exec(techSection[1])) !== null) {
                packages.push({
                    name: match[1],
                    version: match[2]
                });
            }
        }
        
        return packages;
    },

    /**
     * Convert AS4 technology packages to AS6 versions
     */
    convertTechnologyPackages(as4Packages) {
        const as6Packages = [];
        const tpRef = this.as6Format.technologyPackages;
        
        as4Packages.forEach(pkg => {
            const ref = tpRef[pkg.name];
            
            if (ref) {
                if (ref.replacedBy) {
                    // Package was renamed/replaced
                    const replacement = tpRef[ref.replacedBy];
                    as6Packages.push({
                        name: ref.replacedBy,
                        version: replacement.as6Version,
                        subVersions: replacement.subVersions || null,
                        note: `Replaced ${pkg.name} with ${ref.replacedBy}`
                    });
                } else if (ref.as6Version) {
                    // Direct version upgrade
                    as6Packages.push({
                        name: pkg.name,
                        version: ref.as6Version,
                        subVersions: ref.subVersions || null,
                        note: `Upgraded from ${pkg.version} to ${ref.as6Version}`
                    });
                }
            } else {
                // Unknown package - keep with warning
                as6Packages.push({
                    name: pkg.name,
                    version: pkg.version,
                    note: 'Unknown package - manual review required'
                });
            }
        });
        
        // Add new AS6-required packages if not present
        Object.entries(tpRef).forEach(([name, ref]) => {
            if (ref.newInAS6 && ref.required !== false) {
                const exists = as6Packages.some(p => p.name === name);
                if (!exists) {
                    as6Packages.push({
                        name: name,
                        version: ref.as6Version,
                        subVersions: ref.subVersions || null,
                        note: 'New AS6 package added'
                    });
                }
            }
        });
        
        return as6Packages;
    },

    /**
     * Parse AR version string to extract numeric version
     * Supports formats: B4.83, C4.93, D4.73, E4.xx, F4.xx, 4.83, etc.
     * @param {string} versionStr - AR version string (e.g., "B4.83", "C4.93")
     * @returns {object} - { prefix: 'B', major: 4, minor: 83, numeric: 4.83, full: 'B4.83' }
     */
    parseARVersion(versionStr) {
        if (!versionStr) return null;
        
        // Match patterns like B4.83, C4.93, D4.73, or just 4.83
        const match = versionStr.match(/^([A-Z])?(\d+)\.(\d+)(?:\.(\d+))?$/);
        if (!match) return null;
        
        const prefix = match[1] || '';
        const major = parseInt(match[2], 10);
        const minor = parseInt(match[3], 10);
        const patch = match[4] ? parseInt(match[4], 10) : 0;
        
        // Calculate numeric version for comparison (e.g., B4.83 -> 4.83)
        const numeric = major + (minor / 100);
        
        return {
            prefix: prefix,
            major: major,
            minor: minor,
            patch: patch,
            numeric: numeric,
            full: versionStr
        };
    },

    /**
     * Validate if AR version meets minimum requirements for AS6 migration
     * @param {string} versionStr - AR version string (e.g., "B4.83")
     * @returns {object} - { valid: true/false, version: parsed, minimum: 4.25, message: string }
     */
    validateARVersionForAS6(versionStr) {
        const parsed = this.parseARVersion(versionStr);
        const minVersion = this.as6Format.arVersionRequirements.minimumVersion;
        const minDisplay = this.as6Format.arVersionRequirements.minimumVersionDisplay;
        
        if (!parsed) {
            return {
                valid: false,
                version: null,
                minimum: minVersion,
                message: `Unable to parse AR version: ${versionStr}`
            };
        }
        
        const isValid = parsed.numeric >= minVersion;
        
        return {
            valid: isValid,
            version: parsed,
            minimum: minVersion,
            minimumDisplay: minDisplay,
            message: isValid 
                ? `AR version ${parsed.full} meets minimum requirement (${minDisplay})`
                : `AR version ${parsed.full} is below minimum ${minDisplay} required for AS6 migration. ${this.as6Format.arVersionRequirements.upgradeNote}`
        };
    },

    /**
     * Check content for VC3/VC4 usage
     * @param {string} content - File content to analyze
     * @returns {object} - { hasVC3: bool, hasVC4: bool, markers: [], severity: string }
     */
    detectVisualComponents(content) {
        const result = {
            hasVC3: false,
            hasVC4: false,
            vc3Markers: [],
            vc4Markers: [],
            blocking: false,
            severity: null
        };
        
        const vcConfig = this.as6Format.visualComponents;
        
        // Check for VC3 markers
        vcConfig.vc3.markers.forEach(marker => {
            if (content.includes(marker)) {
                result.hasVC3 = true;
                result.vc3Markers.push(marker);
            }
        });
        
        // Check for VC4 markers
        vcConfig.vc4.markers.forEach(marker => {
            if (content.includes(marker)) {
                result.hasVC4 = true;
                result.vc4Markers.push(marker);
            }
        });
        
        // Determine severity
        if (result.hasVC3) {
            result.blocking = true;
            result.severity = 'error';
        } else if (result.hasVC4) {
            result.severity = 'warning';
        }
        
        return result;
    },

    /**
     * Find obsolete function blocks in content
     * @param {string} content - ST code content
     * @returns {Array} - Array of { name, match, index, line, replacement, autoReplace }
     */
    findObsoleteFunctionBlocks(content) {
        const results = [];
        
        this.obsoleteFunctionBlocks.forEach(fb => {
            if (!fb.pattern) return;
            
            // Reset regex lastIndex
            fb.pattern.lastIndex = 0;
            let match;
            
            while ((match = fb.pattern.exec(content)) !== null) {
                // Calculate line number
                const beforeMatch = content.substring(0, match.index);
                const lineNumber = (beforeMatch.match(/\n/g) || []).length + 1;
                
                results.push({
                    name: fb.name,
                    match: match[0],
                    index: match.index,
                    line: lineNumber,
                    replacement: fb.replacement,
                    severity: fb.severity,
                    category: fb.category,
                    description: fb.description,
                    notes: fb.notes,
                    autoReplace: fb.autoReplace
                });
            }
        });
        
        return results;
    },

    /**
     * Detect AS version from project file content
     */
    detectASVersion(content) {
        const versionMatch = content.match(/Version="([^"]+)"/);
        if (!versionMatch) return null;
        
        const version = versionMatch[1];
        if (version.startsWith('4.')) return { major: 4, full: version, format: 'AS4' };
        if (version.startsWith('5.')) return { major: 5, full: version, format: 'AS5' };
        if (version.startsWith('6.')) return { major: 6, full: version, format: 'AS6' };
        
        return { major: parseInt(version), full: version, format: 'unknown' };
    },

    /**
     * Get list of structural changes needed for AS6
     */
    getAS6StructuralChanges() {
        return [
            {
                type: 'project_file',
                description: 'Project file (.apj) format restructured',
                changes: [
                    'XML declaration required',
                    'XML namespace added to Project element',
                    'Project Version attribute added',
                    'IEC settings moved from nested elements to attributes',
                    'New required elements: Communication, ANSIC, Variables',
                    'Optional new elements: Motion, Project (StoreRuntimeInProject)'
                ]
            },
            {
                type: 'technology_packages',
                description: 'Technology package versions updated',
                changes: [
                    'Acp10Arnc0: 5.24.x → 6.2.0',
                    'mapp: Replaced by mappServices 6.2.0',
                    'New packages: OpcUaCs 6.0.0, OpcUaFx 6.1.0'
                ]
            },
            {
                type: 'physical_config',
                description: 'New Physical configuration directories',
                changes: [
                    'AccessAndSecurity/CertificateStore - SSL certificates',
                    'AccessAndSecurity/UserRoleSystem - User roles and permissions',
                    'Connectivity/OpcUaCs - OPC UA Client/Server config',
                    'Connectivity/OpcUaFx - OPC UA FX config',
                    'mappServices/ - mapp Services configuration'
                ]
            }
        ];
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DeprecationDatabase;
}
