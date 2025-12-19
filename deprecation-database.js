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
        automationRuntime: {
            as4: { version: '4.93', description: 'AR 4.93 (AS4 typical)' },
            as6: { version: '6.2.1', description: 'AR 6.2.1 (AS6 default)' }
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
        }
    },

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
        },
        {
            id: "lib_acp10man",
            name: "Acp10man",
            severity: "warning",
            category: "motion",
            description: "ACOPOS manual mode library - legacy",
            replacement: { name: "McAcpAx", description: "mapp Motion ACOPOS" },
            notes: "Manual mode functions in mapp Motion.",
            removedIn: "AS5.5"
        },
        {
            id: "lib_acp10sim",
            name: "Acp10sim",
            severity: "info",
            category: "motion",
            description: "ACOPOS simulation library",
            replacement: { name: "McAcpAx", description: "Simulation integrated in mapp Motion" },
            notes: "Simulation capabilities built into mapp Motion.",
            removedIn: "AS6.0"
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
