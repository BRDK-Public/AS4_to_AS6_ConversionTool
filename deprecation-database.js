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
        // Note: subVersions are only used for packages that actually require them (like OpcUaFx)
        // Acp10man, NcGlobal, etc. are LIBRARIES within the tech package, not subVersions
        technologyPackages: {
            'Acp10Arnc0': { 
                as4Version: '5.24.1', 
                as6Version: '6.2.0', 
                required: true
                // Note: Acp10man, NcGlobal, etc. are libraries, not subVersions
            },
            'mapp': { as4Version: '5.24.2', as6Version: null, replacedBy: 'mappServices' },
            'mappServices': { 
                as4Version: null, 
                as6Version: '6.2.0', 
                newInAS6: true
                // Note: MpAlarmX, MpBase, etc. are libraries, not subVersions
            },
            'mappMotion': { 
                as4Version: '5.24.1', 
                as6Version: '6.0.0', 
                required: false
                // Note: MpAxis, MpCnc, MpRobotics, McAcpAx, McAxis, McBase are libraries, not subVersions
            },
            'mappControl': { 
                as4Version: '5.24.1', 
                as6Version: '6.1.0', 
                required: false
                // Note: MpTemp, MpHydAxis, MpPump, MTBasics, MTFilter, etc. are libraries, not subVersions
            },
            'mappSafety': { 
                as4Version: '5.24.1', 
                as6Version: '6.2.0', 
                required: false
                // Note: SfDomain is a library, not a subVersion
            },
            'mappView': { as4Version: '5.24.1', as6Version: '6.2.0', required: false },
            'mappVision': { as4Version: '5.30.3307', as6Version: '6.0.0', required: false },
            'mappCockpit': { as4Version: '5.24.2', as6Version: '6.2.1', required: false },
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
        
        // Obsolete target hardware (not supported in AS6)
        // These PLCs/targets are not compatible with AS6 and must be replaced in AS4 before conversion
        obsoleteTargetHardware: [
            // PPC2000 series
            '3CP260.60-1', '3CP320.60-1', '3CP340.60-1', '3CP340.60-2', '3CP360.60-1', 
            '3CP360.60-2', '3CP380.60-1', '3CP382.60-1',
            // PP series (older models)
            'P0420.00-490', '4P3040.00-490',
            '4PP015.0420-01', '4PP015.0420-36', '4PP015.C420-01', '4PP015.C420-36',
            '4PP015.E420-01', '4PP015.E420-101', '4PP015.E420-36',
            '4PP035.0300-01', '4PP035.0300-36', '4PP035.E300-01', '4PP035.E300-136', '4PP035.E300-36',
            '4PP045.0571-042', '4PP045.0571-062', '4PP045.0571-L42',
            '4PP045.IF10-1', '4PP045.IF23-1', '4PP045.IF24-1', '4PP045.IF33-1',
            '4PP065.0351-P74', '4PP065.0351-X74', '4PP065.0571-P74', '4PP065.0571-P74F',
            '4PP065.0571-X74', '4PP065.0571-X74F', '4PP065.1043-K01',
            '4PP065.IF10-1', '4PP065.IF23-1', '4PP065.IF24-1', '4PP065.IF33-1',
            '4PP320.0571-01', '4PP320.0571-35', '4PP320.1043-31', '4PP320.1505-31',
            '4PP351.0571-01', '4PP351.0571-35', '4PP352.0571-35', '4PP381.1043-31',
            '4PP420.0571-45', '4PP420.0571-65', '4PP420.0571-75', '4PP420.0571-85',
            '4PP420.0571-A5', '4PP420.0571-B5', '4PP420.0573-75', '4PP420.1043-75',
            '4PP420.1043-B5', '4PP420.1505-75', '4PP420.1505-B5',
            '4PP451.0571-45', '4PP451.0571-65', '4PP451.0571-75', '4PP451.0571-85',
            '4PP451.0571-B5', '4PP451.1043-75', '4PP451.1043-B5',
            '4PP452.0571-45', '4PP452.0571-65', '4PP452.0571-75', '4PP452.0571-B5', '4PP452.1043-75',
            '4PP480.1043-75', '4PP480.1505-75', '4PP480.1505-B5',
            '4PP481.1043-75', '4PP481.1043-B5', '4PP481.1505-75', '4PP482.1043-75',
            // 5PP series (older models)
            '5PP320.0573-39', '5PP320.0573-3B', '5PP320.1043-39', '5PP320.1214-39',
            '5PP320.1505-39', '5PP320.1505-3B',
            '5PP520.0573-00', '5PP520.0573-01', '5PP520.0573-B00', '5PP520.0573-B01',
            '5PP520.0573-B10', '5PP520.0573-B11', '5PP520.0702-00', '5PP520.0702-B00',
            '5PP520.0702-B10', '5PP520.1043-00', '5PP520.1043-B00', '5PP520.1043-B10',
            '5PP520.1043-B50', '5PP520.1214-00', '5PP520.1505-00', '5PP520.1505-B00',
            '5PP520.1505-B10', '5PP520.1505-B50', '5PP520.1505-B55', '5PP520.1505-B60', '5PP520.1505-B65',
            '5PP551.0573-00', '5PP552.0573-00',
            '5PP580.1043-00', '5PP580.1505-00', '5PP581.1043-00', '5PP581.1505-00', '5PP582.1043-00',
            // 5PP5CP series
            '5PP5CP.US15-00', '5PP5CP.US15-01', '5PP5CP.US15-02',
            // 5PP5IF/IO series
            '5PP5IF.CETH-00', '5PP5IF.CHDA-00', '5PP5IF.FCAN-00', '5PP5IF.FETH-00',
            '5PP5IF.FPLM-00', '5PP5IF.FX2X-00', '5PP5IF.FXCM-00',
            '5PP5IO.GMAC-00', '5PP5IO.GNAC-00',
            // 4PPC70 series
            '4PPC70.0573-20B', '4PPC70.0573-20W', '4PPC70.0573-21B', '4PPC70.0573-21W',
            '4PPC70.0573-22B', '4PPC70.0573-22W', '4PPC70.0573-23B', '4PPC70.0573-23W',
            '4PPC70.057L-20B', '4PPC70.057L-20W', '4PPC70.057L-21B', '4PPC70.057L-21W',
            '4PPC70.057L-22B', '4PPC70.057L-22W', '4PPC70.057L-23B', '4PPC70.057L-23W',
            '4PPC70.0702-20B', '4PPC70.0702-20W', '4PPC70.0702-21B', '4PPC70.0702-21W',
            '4PPC70.0702-22B', '4PPC70.0702-22W', '4PPC70.0702-23B', '4PPC70.0702-23W',
            '4PPC70.070M-20B', '4PPC70.070M-20W', '4PPC70.070M-21B', '4PPC70.070M-21W',
            '4PPC70.070M-22B', '4PPC70.070M-22W', '4PPC70.070M-23B', '4PPC70.070M-23W',
            '4PPC70.101G-20B', '4PPC70.101G-20W', '4PPC70.101G-21B', '4PPC70.101G-21W',
            '4PPC70.101G-22B', '4PPC70.101G-22W', '4PPC70.101G-23B', '4PPC70.101G-23W',
            '4PPC70.101N-20B', '4PPC70.101N-20W', '4PPC70.101N-21B', '4PPC70.101N-21W',
            '4PPC70.101N-22B', '4PPC70.101N-22W', '4PPC70.101N-23B', '4PPC70.101N-23W',
            // 4PW series
            '4PW035.E300-01', '4PW035.E300-02',
            // Keypad modules
            '4XP0000.00-K38',
            // APC510/620/810/820 modules
            '5AC600.485I-00', '5AC600.CANI-00', '5AC600.HCFS-00', '5AC600.SDL0-00',
            '5AC600.SRAM-00', '5AC600.UPSI-00',
            '5AC800.CON1-00', '5AC800.CON2-00', '5AC800.EXT1-00', '5AC800.EXT2-00',
            '5AC800.EXT2-01', '5AC800.EXT3-00', '5AC800.EXT3-01', '5AC800.EXT3-02',
            '5AC800.EXT3-03', '5AC800.EXT3-04', '5AC800.EXT3-05',
            '5AC801.SDL0-00', '5AC803.BC01-00', '5AC803.BX01-00', '5AC803.BX01-01', '5AC803.BX02-00',
            '5PC800.B945-00', '5PC800.B945-01', '5PC800.B945-02', '5PC800.B945-03',
            '5PC800.B945-04', '5PC800.B945-05', '5PC800.B945-10', '5PC800.B945-11',
            '5PC800.B945-12', '5PC800.B945-13', '5PC800.B945-14',
            '5PC800.BM45-00', '5PC800.BM45-01', '5PC800.CCAX-00',
            '5PC810.BX01-00', '5PC810.BX01-01', '5PC810.BX02-00', '5PC810.BX02-01',
            '5PC810.BX03-00', '5PC810.BX05-00', '5PC810.BX05-01', '5PC810.BX05-02',
            '5PC810.SX01-00', '5PC810.SX02-00', '5PC810.SX03-00', '5PC810.SX05-00',
            '5PC820.1505-00', '5PC820.1906-00', '5PC820.SX01-00', '5PC820.SX01-01',
            // APC/PPC910 TS77
            '5PC900.TS77-00', '5PC900.TS77-01', '5PC900.TS77-02', '5PC900.TS77-03',
            '5PC900.TS77-04', '5PC900.TS77-05', '5PC900.TS77-06', '5PC900.TS77-07',
            '5PC900.TS77-08', '5PC900.TS77-09', '5PC900.TS77-10',
            '5PC901.TS77-00', '5PC901.TS77-01', '5PC901.TS77-02', '5PC901.TS77-03',
            '5PC901.TS77-04', '5PC901.TS77-05', '5PC901.TS77-06', '5PC901.TS77-07',
            '5PC901.TS77-08', '5PC901.TS77-09', '5PC901.TS77-10',
            '5ACPCC.MPL0-00',
            // AP800/920/950/980
            '5AP820.1505-00', '5AP880.1505-00',
            '5AP920.1043-01', '5AP920.1214-01', '5AP920.1505-01', '5AP920.1706-01',
            '5AP920.1906-01', '5AP920.2138-01',
            '5AP951.1043-01', '5AP951.1505-01', '5AP952.1043-01',
            '5AP980.1043-01', '5AP980.1505-01', '5AP981.1043-01', '5AP981.1505-01', '5AP982.1043-01',
            '5AP923.1215-I00', '5AP923.1505-I00',
            // APC/PPC2100
            '5APC2100.BY01-000', '5APC2100.BY11-000', '5APC2100.BY22-000', '5APC2100.BY34-000',
            '5APC2100.BY44-000', '5APC2100.BY48-000',
            '5PPC2100.BY01-000', '5PPC2100.BY01-001', '5PPC2100.BY01-002',
            '5PPC2100.BY11-000', '5PPC2100.BY11-001', '5PPC2100.BY11-002',
            '5PPC2100.BY22-000', '5PPC2100.BY22-001', '5PPC2100.BY22-002',
            '5PPC2100.BY34-000', '5PPC2100.BY34-001', '5PPC2100.BY34-002',
            '5PPC2100.BY44-000', '5PPC2100.BY44-001', '5PPC2100.BY44-002',
            '5PPC2100.BY48-000', '5PPC2100.BY48-002',
            // PPC300/700/800
            '5PC310.L800-00', '5PC310.L800-01',
            '5PC720.1043-00', '5PC720.1043-01', '5PC720.1214-00', '5PC720.1214-01',
            '5PC720.1505-00', '5PC720.1505-01', '5PC720.1505-02', '5PC720.1706-00', '5PC720.1906-00',
            '5PC781.1043-00', '5PC781.1505-00', '5PC782.1043-00',
            // APC510/620/810/820
            '5PC510.SX01-00', '5PC511.SX01-00',
            '5PC600.E855-00', '5PC600.E855-01', '5PC600.E855-02', '5PC600.E855-03',
            '5PC600.E855-04', '5PC600.E855-05',
            '5PC600.E8xx-00.1', '5PC600.E8xx-00.2', '5PC600.E8xx-00.3', '5PC600.E8xx-00.4',
            '5PC600.SE00-00', '5PC600.SE00-01', '5PC600.SE00-02',
            '5PC600.SF03-00', '5PC600.SX01-00', '5PC600.SX02-00', '5PC600.SX02-01',
            '5PC600.SX05-00', '5PC600.SX05-01',
            '5PC600.X855-00', '5PC600.X855-01', '5PC600.X855-02', '5PC600.X855-03',
            '5PC600.X855-04', '5PC600.X855-05', '5PC600.X8xx-xx', '5PC600.X945-00',
            // X20 CPUs (older models)
            'X20CP0201', 'X20CP0291', 'X20CP0292',
            'X20CP1301', 'X20CP1381', 'X20CP1381-RT', 'X20CP1382', 'X20CP1382-RT',
            'X20CP1483', 'X20CP1483-1', 'X20CP1484', 'X20CP1484-1', 'X20CP1485',
            'X20CP1485-1', 'X20CP1486',
            'X20CP1583', 'X20CP1584', 'X20CP1585', 'X20CP1586',
            'X20CP3484', 'X20CP3484-1', 'X20CP3485', 'X20CP3485-1', 'X20CP3486',
            'X20CP3583', 'X20CP3584', 'X20CP3585', 'X20CP3586'
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
        
        // Motion type mappings for AS4 McAcpAx → AS6 McAxis migration
        // In AS6, ACOPOS-specific types (McAcpAx*) are replaced with generic McAxis types (Mc*)
        // Reference: AS6 Help - "Migrating from ACP10_MC to mapp Axis"
        motionTypeMappings: [
            // Main cam automat parameter types
            { old: 'McAcpAxCamAutParType', new: 'McCamAutParType', notes: 'Main cam automat parameter structure' },
            { old: 'McAcpAxCamAutCommonParType', new: 'McCamAutCommonParType', notes: 'Common parameters for all states' },
            { old: 'McAcpAxCamAutStateParType', new: 'McCamAutStateParType', notes: 'State-specific parameters' },
            { old: 'McAcpAxCamAutMasterParType', new: 'McCamAutMasterParType', notes: 'Master axis parameters' },
            { old: 'McAcpAxCamAutAdvParType', new: 'McCamAutAdvParType', notes: 'Advanced parameters' },
            { old: 'McAcpAxCamAutDefineType', new: 'McCamAutDefineType', notes: 'Cam automat definition' },
            
            // Cam automat state sub-types
            { old: 'McAcpAxCamAutEventParType', new: 'McCamAutEventParType', notes: 'Event parameters' },
            { old: 'McAcpAxCamAutCompParType', new: 'McCamAutCompParType', notes: 'Compensation parameters' },
            { old: 'McAcpAxCamAutAdvStateParType', new: 'McCamAutAdvStateParType', notes: 'Advanced state parameters' },
            
            // Common parameters sub-types
            { old: 'McAcpAxCamAutCtrlSettingsType', new: 'McCamAutCtrlSettingsType', notes: 'Control settings' },
            { old: 'McAcpAxCamAutMsgSettingsType', new: 'McCamAutMsgSettingsType', notes: 'Message settings' },
            { old: 'McAcpAxCamAutTriggerAndLatchType', new: 'McCamAutTriggerAndLatchType', notes: 'Trigger and latch settings' },
            { old: 'McAcpAxCamAutStartStateParType', new: 'McCamAutStartStateParType', notes: 'Start state parameters' },
            { old: 'McAcpAxCamAutAddAxesType', new: 'McCamAutAddAxesType', notes: 'Additional axes configuration' },
            { old: 'McAcpAxCamAutCommonFactorsType', new: 'McCamAutCommonFactorsType', notes: 'Common factors' },
            
            // Additional ACOPOS-specific types that may need mapping
            { old: 'McAcpAxAdvCamAutSetParType', new: 'McAdvCamAutSetParType', notes: 'Advanced cam automat set parameters' }
        ],
        
        // Enum value mappings for AS4 → AS6 migration
        // Some enum values were renamed in AS6 libraries
        enumMappings: [
            // MpFileManagerUISortOrderEnum changes in MpFile library
            // AS4: mpFILE_SORT_BY_* → AS6: mpFILE_UI_SORT_BY_*
            { old: 'mpFILE_SORT_BY_NAME_ASC', new: 'mpFILE_UI_SORT_BY_NAME_ASC', library: 'MpFile', notes: 'Sort by name ascending' },
            { old: 'mpFILE_SORT_BY_NAME_DESC', new: 'mpFILE_UI_SORT_BY_NAME_DESC', library: 'MpFile', notes: 'Sort by name descending' },
            { old: 'mpFILE_SORT_BY_SIZE_ASC', new: 'mpFILE_UI_SORT_BY_SIZE_ASC', library: 'MpFile', notes: 'Sort by size ascending' },
            { old: 'mpFILE_SORT_BY_SIZE_DES', new: 'mpFILE_UI_SORT_BY_SIZE_DES', library: 'MpFile', notes: 'Sort by size descending' },
            { old: 'mpFILE_SORT_BY_MOD_TIME_ASC', new: 'mpFILE_UI_SORT_BY_MOD_TIME_ASC', library: 'MpFile', notes: 'Sort by modified time ascending' },
            { old: 'mpFILE_SORT_BY_MOD_TIME_DESC', new: 'mpFILE_UI_SORT_BY_MOD_TIME_DESC', library: 'MpFile', notes: 'Sort by modified time descending' }
        ],
        
        // Struct/FB member mappings for AS4 → AS6 migration
        // Some struct/function block members were renamed in AS6 libraries
        // Pattern-based: matches variableName.OldMember where variableName contains the FB type name
        memberMappings: [
            // MpReportCore - .Name was renamed to .FileName in AS6
            // Pattern matches: MpReportCore*.Name (e.g., MpReportCore_0.Name, MpReportCore_Main.Name)
            { 
                structType: 'MpReportCore', 
                old: 'Name', 
                new: 'FileName', 
                library: 'MpReport', 
                // Pattern: MpReportCore followed by any word chars, then .Name
                pattern: '(MpReportCore\\w*)\\.Name\\b',
                replacement: '$1.FileName',
                notes: 'Member renamed from Name to FileName' 
            },
            // MpAxisBasic - .Info.DigitalInputsStatus moved to .Info.AxisAdditionalInfo.DigitalInputStatus
            // Pattern matches any variable ending with .Info.DigitalInputsStatus
            { 
                structType: 'MpAxisBasic', 
                old: '.Info.DigitalInputsStatus', 
                new: '.Info.AxisAdditionalInfo.DigitalInputStatus', 
                library: 'MpAxis', 
                // Pattern: match .Info.DigitalInputsStatus regardless of variable name
                pattern: '\\.Info\\.DigitalInputsStatus\\b',
                replacement: '.Info.AxisAdditionalInfo.DigitalInputStatus',
                notes: 'Member path changed: .Info.DigitalInputsStatus → .Info.AxisAdditionalInfo.DigitalInputStatus' 
            }
        ],
        
        // Library to Technology Package mapping for AS6 upgrades
        // Maps AS4 5.x libraries to their AS6 6.x equivalents
        libraryMapping: {
            // mappServices (6.2.0) - Data management and services
            // All libraries must use the same version as the technology package
            'MpAlarmX': { techPackage: 'mappServices', as6Version: '6.2.0', as6LibVersion: '6.2.0' },
            'MpAudit': { techPackage: 'mappServices', as6Version: '6.2.0', as6LibVersion: '6.2.0' },
            'MpBackup': { techPackage: 'mappServices', as6Version: '6.2.0', as6LibVersion: '6.2.0' },
            'MpCodeBox': { techPackage: 'mappServices', as6Version: '6.2.0', as6LibVersion: '6.2.0' },
            'MpCom': { techPackage: 'mappServices', as6Version: '6.2.0', as6LibVersion: '6.2.0' },
            'MpData': { techPackage: 'mappServices', as6Version: '6.2.0', as6LibVersion: '6.2.0' },
            'MpDatabase': { techPackage: 'mappServices', as6Version: '6.2.0', as6LibVersion: '6.2.0' },
            'MpFile': { techPackage: 'mappServices', as6Version: '6.2.0', as6LibVersion: '6.2.0' },
            'MpIO': { techPackage: 'mappServices', as6Version: '6.2.0', as6LibVersion: '6.2.0' },
            'MpRecipe': { techPackage: 'mappServices', as6Version: '6.2.0', as6LibVersion: '6.2.0' },
            'MpReport': { techPackage: 'mappServices', as6Version: '6.2.0', as6LibVersion: '6.2.0' },
            'MpSequence': { techPackage: 'mappServices', as6Version: '6.2.0', as6LibVersion: '6.2.0' },
            'MpUserX': { techPackage: 'mappServices', as6Version: '6.2.0', as6LibVersion: '6.2.0' },
            'MpServer': { techPackage: 'mappServices', as6Version: '6.2.0', as6LibVersion: '6.2.0' },
            
            // mappView (6.0.0) - Visualization
            
            // mappVision (6.0.0) - Vision system
            'ViAccess': { techPackage: 'mappVision', as6Version: '6.0.0', as6LibVersion: '6.0.0' },
            'ViBase': { techPackage: 'mappVision', as6Version: '6.0.0', as6LibVersion: '6.0.0' },
            
            // mappMotion (6.0.0) - Motion control
            'MpAxis': { techPackage: 'mappMotion', as6Version: '6.0.0', as6LibVersion: '6.0.0' },
            'MpCnc': { techPackage: 'mappMotion', as6Version: '6.0.0', as6LibVersion: '6.0.0' },
            'MpRobotics': { techPackage: 'mappMotion', as6Version: '6.0.0', as6LibVersion: '6.0.0' },
            'McAcpAx': { techPackage: 'mappMotion', as6Version: '6.0.0', as6LibVersion: '6.0.0' },
            'McAxis': { techPackage: 'mappMotion', as6Version: '6.0.0', as6LibVersion: '6.0.0' },
            'McBase': { techPackage: 'mappMotion', as6Version: '6.0.0', as6LibVersion: '6.0.0' },
            
            // mappControl (6.1.0) - Advanced control / Temperature / Hydraulics
            // Mp* libraries (mapp control components)
            'MpClamp': { techPackage: 'mappControl', as6Version: '6.1.0', as6LibVersion: '6.1.0' },
            'MpCorePull': { techPackage: 'mappControl', as6Version: '6.1.0', as6LibVersion: '6.1.0' },
            'MpEjector': { techPackage: 'mappControl', as6Version: '6.1.0', as6LibVersion: '6.1.0' },
            'MpHalfNut': { techPackage: 'mappControl', as6Version: '6.1.0', as6LibVersion: '6.1.0' },
            'MpHydAxis': { techPackage: 'mappControl', as6Version: '6.1.0', as6LibVersion: '6.1.0' },
            'MpHydPump': { techPackage: 'mappControl', as6Version: '6.1.0', as6LibVersion: '6.1.0' },
            'MpInject': { techPackage: 'mappControl', as6Version: '6.1.0', as6LibVersion: '6.1.0' },
            'MpInjUnit': { techPackage: 'mappControl', as6Version: '6.1.0', as6LibVersion: '6.1.0' },
            'MpMHeight': { techPackage: 'mappControl', as6Version: '6.1.0', as6LibVersion: '6.1.0' },
            'MpPump': { techPackage: 'mappControl', as6Version: '6.1.0', as6LibVersion: '6.1.0' },
            'MpRegMark': { techPackage: 'mappControl', as6Version: '6.1.0', as6LibVersion: '6.1.0' },
            'MpSafeGate': { techPackage: 'mappControl', as6Version: '6.1.0', as6LibVersion: '6.1.0' },
            'MpScale': { techPackage: 'mappControl', as6Version: '6.1.0', as6LibVersion: '6.1.0' },
            'MpTemp': { techPackage: 'mappControl', as6Version: '6.1.0', as6LibVersion: '6.1.0' },
            'MpTension': { techPackage: 'mappControl', as6Version: '6.1.0', as6LibVersion: '6.1.0' },
            'MpTieBar': { techPackage: 'mappControl', as6Version: '6.1.0', as6LibVersion: '6.1.0' },
            // MT* libraries (motion toolbox in mappControl)
            'MTBasics': { techPackage: 'mappControl', as6Version: '6.1.0', as6LibVersion: '6.1.0' },
            'MTData': { techPackage: 'mappControl', as6Version: '6.1.0', as6LibVersion: '6.1.0' },
            'MTFilter': { techPackage: 'mappControl', as6Version: '6.1.0', as6LibVersion: '6.1.0' },
            'MTGntCrane': { techPackage: 'mappControl', as6Version: '6.1.0', as6LibVersion: '6.1.0' },
            'MTIdentify': { techPackage: 'mappControl', as6Version: '6.1.0', as6LibVersion: '6.1.0' },
            'MTLinAlg': { techPackage: 'mappControl', as6Version: '6.1.0', as6LibVersion: '6.1.0' },
            'MTLookUp': { techPackage: 'mappControl', as6Version: '6.1.0', as6LibVersion: '6.1.0' },
            'MTProfile': { techPackage: 'mappControl', as6Version: '6.1.0', as6LibVersion: '6.1.0' },
            'MTSkew': { techPackage: 'mappControl', as6Version: '6.1.0', as6LibVersion: '6.1.0' },
            
            // mappCockpit (6.2.1) - Diagnostics
            'CoTrace': { techPackage: 'mappCockpit', as6Version: '6.2.1', as6LibVersion: '6.2.1' },
            
            // Acp10Arnc0 (6.2.0) - ACOPOS motion
            'Acp10_MC': { techPackage: 'Acp10Arnc0', as6Version: '6.2.0', as6LibVersion: '6.2.0' },
            'Acp10man': { techPackage: 'Acp10Arnc0', as6Version: '6.2.0', as6LibVersion: '6.2.0' },
            'Acp10par': { techPackage: 'Acp10Arnc0', as6Version: '6.2.0', as6LibVersion: '6.2.0' },
            'Acp10sim': { techPackage: 'Acp10Arnc0', as6Version: '6.2.0', as6LibVersion: '6.2.0' },
            'Acp10sdc': { techPackage: 'Acp10Arnc0', as6Version: '6.2.0', as6LibVersion: '6.2.0' },
            'NcGlobal': { techPackage: 'Acp10Arnc0', as6Version: '6.2.0', as6LibVersion: '6.2.0' },
            
            // MpBase - Core mapp component (in Library_2 with version subfolder)
            'MpBase': { source: 'Library_2', as6LibVersion: 'V6.5.0' },
            
            // mappSafety (6.2.0) - Safety libraries
            // NOTE: Only SfDomain is included in the bundled libraries.
            // SafeLOGIC, SafeMOTION, and MpSafety require installation from AS6 or B&R downloads
            'SfDomain': { techPackage: 'mappSafety', as6Version: '6.2.0', as6LibVersion: '6.2.0' },
            // 'SafeLOGIC': { techPackage: 'mappSafety', as6Version: '6.2.0', as6LibVersion: '6.2.0' }, // Not bundled
            // 'SafeMOTION': { techPackage: 'mappSafety', as6Version: '6.2.0', as6LibVersion: '6.2.0' }, // Not bundled
            // 'MpSafety': { techPackage: 'mappSafety', as6Version: '6.2.0', as6LibVersion: '6.2.0' }, // Not bundled
            
            // MTTypes - Motion toolbox types (specific version in AS6)
            'MTTypes': { source: 'Library_2', as6LibVersion: '6.0.0' },
            // MTPrintHW - Printing hardware library (specific version in AS6)
            'MTPrintHW': { source: 'Library_2', as6LibVersion: 'V6.0.0' },
            // Note: MTAdvanced, MTSystem, MTTemp are in Library_2, not mappControl tech package
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
            'powerlnk': { source: 'Library_2', as6LibVersion: null },
            
            // Additional common libraries
            'AsIOAcc': { source: 'Library_2', as6LibVersion: null },
            'AsEPL': { source: 'Library_2', as6LibVersion: null },
            'AsARCfg': { source: 'Library_2', as6LibVersion: null },
            'ArTextSys': { source: 'Library_2', as6LibVersion: null },
            'dvframe': { source: 'Library_2', as6LibVersion: null },
            'AsString': { source: 'Library_2', as6LibVersion: null }  // Note: AsString is deprecated, use AsBrStr
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
        // Legacy string functions - AS6 renamed these to add extra 's'
        {
            name: 'brstrcat',
            pattern: /\bbrstrcat\b/g,
            replacement: 'brsstrcat',
            severity: 'info',
            category: 'string',
            description: 'String concatenation function renamed in AS6',
            notes: 'AsBrStr library renamed brstrcat to brsstrcat in AS6.',
            autoReplace: true
        },
        {
            name: 'brstrcpy',
            pattern: /\bbrstrcpy\b/g,
            replacement: 'brsstrcpy',
            severity: 'info',
            category: 'string',
            description: 'String copy function renamed in AS6',
            notes: 'AsBrStr library renamed brstrcpy to brsstrcpy in AS6.',
            autoReplace: true
        },
        {
            name: 'brsprintf',
            pattern: /\bbrsprintf\b/g,
            replacement: 'brssprintf',
            severity: 'info',
            category: 'string',
            description: 'String format function renamed in AS6',
            notes: 'AsBrStr library renamed brsprintf to brssprintf in AS6.',
            autoReplace: true
        },
        {
            name: 'brstrlen',
            pattern: /\bbrstrlen\b/g,
            replacement: 'brsstrlen',
            severity: 'info',
            category: 'string',
            description: 'String length function renamed in AS6',
            notes: 'AsBrStr library renamed brstrlen to brsstrlen in AS6.',
            autoReplace: true
        },
        {
            name: 'brstrcmp',
            pattern: /\bbrstrcmp\b/g,
            replacement: 'brsstrcmp',
            severity: 'info',
            category: 'string',
            description: 'String compare function renamed in AS6',
            notes: 'AsBrStr library renamed brstrcmp to brsstrcmp in AS6.',
            autoReplace: true
        },
        {
            name: 'brstrncpy',
            pattern: /\bbrstrncpy\b/g,
            replacement: 'brssstrncpy',
            severity: 'info',
            category: 'string',
            description: 'String n-copy function renamed in AS6',
            notes: 'AsBrStr library renamed brstrncpy to brssstrncpy in AS6.',
            autoReplace: true
        }
    ],

    // ==========================================
    // DEPRECATED FUNCTION BLOCKS (AS6 unsupported)
    // ==========================================
    deprecatedFunctionBlocks: [
        {
            id: "fb_mpalarmxacknowledgeall",
            name: "MpAlarmXAcknowledgeAll",
            library: "MpAlarmX",
            severity: "error",
            description: "MpAlarmXAcknowledgeAll function block is not supported in AS6",
            replacement: null,
            notes: "This function block must be manually reimplemented. Instances will be removed from .var/.typ files and usages will be commented out in source files for manual review.",
            removedIn: "AS6.0",
            autoRemove: true
        }
    ],

    // ==========================================
    // DEPRECATED STRUCT MEMBERS (removed in AS6)
    // ==========================================
    // These are struct members that existed in AS4 but were removed in AS6.
    // Code accessing these members will cause compile errors and must be commented out.
    deprecatedStructMembers: [
        {
            id: "member_mccamautdefinetype_datasize",
            structType: "McCamAutDefineType",
            memberName: "DataSize",
            // Pattern matches: variable.Data.DataSize or variable.DataSize (for direct struct access)
            // Also matches assignment patterns
            pattern: "\\.Data\\.DataSize\\b|\\.DataSize\\b",
            severity: "warning",
            description: "McCamAutDefineType.DataSize member removed in AS6",
            notes: "The DataSize member was removed from McCamAutDefineType in AS6. Lines using this member must be commented out or removed.",
            removedIn: "AS6.0",
            autoComment: true,
            todoMessage: "McCamAutDefineType.DataSize removed in AS6 - remove or rework this line"
        }
    ],

    // ==========================================
    // DEPRECATED LIBRARIES
    // ==========================================
    libraries: [
        // Completely discontinued libraries (no replacement)
        {
            id: "lib_mpwebxs",
            name: "MpWebXs",
            severity: "warning",
            category: "mapp",
            description: "MpWebXs technology package - not supported in AS6",
            replacement: null,
            notes: "MpWebXs (Web Extensions) technology package is discontinued in AS6. Remove the library and all .mpwebxs configuration files from the project.",
            removedIn: "AS6.0",
            configExtension: ".mpwebxs",
            autoRemove: true
        },
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
            severity: "warning",
            category: "utilities",
            description: "ANSI C string library - deprecated in AS6, replaced by AsBrStr",
            replacement: { name: "AsBrStr", description: "B&R string library with full Unicode support" },
            notes: "AsString library must be replaced with AsBrStr. All AsString functions have direct AsBrStr equivalents with 'brs' prefix (e.g., strlen → brsstrlen). The library replacement and function renaming will be handled automatically.",
            removedIn: "AS6.0",
            autoReplace: true,
            libraryPath: "LibrariesForAS6/Library_2/AsBrStr",
            functionMappings: [
                { old: "ftoa", new: "brsftoa", notes: "Same interface - converts REAL to string" },
                { old: "atof", new: "brsatof", notes: "Same interface - converts string to REAL" },
                { old: "atod", new: "brsatod", notes: "Same interface - converts string to LREAL" },
                { old: "itoa", new: "brsitoa", notes: "Same interface - converts DINT to string" },
                { old: "atoi", new: "brsatoi", notes: "Same interface - converts string to DINT" },
                { old: "memset", new: "brsmemset", notes: "Same interface - fills memory with value" },
                { old: "memcpy", new: "brsmemcpy", notes: "Same interface - copies memory area" },
                { old: "memmove", new: "brsmemmove", notes: "Same interface - copies overlapping memory" },
                { old: "memcmp", new: "brsmemcmp", notes: "Same interface - compares memory areas" },
                { old: "strcat", new: "brsstrcat", notes: "Same interface - concatenates strings" },
                { old: "strlen", new: "brsstrlen", notes: "Return type changed from UINT to UDINT - wrapped with UDINT_TO_UINT for compatibility", wrapWith: "UDINT_TO_UINT" },
                { old: "strcpy", new: "brsstrcpy", notes: "Same interface - copies string" },
                { old: "strcmp", new: "brsstrcmp", notes: "Same interface - compares strings" }
            ]
        },
        {
            id: "lib_aswstr",
            name: "AsWStr",
            severity: "warning",
            category: "utilities",
            description: "Wide string library - deprecated in AS6, replaced by AsBrWStr",
            replacement: { name: "AsBrWStr", description: "B&R wide string library" },
            notes: "AsWStr library must be replaced with AsBrWStr. Wide string functions have 'brw' prefix.",
            removedIn: "AS6.0",
            autoReplace: true,
            libraryPath: "LibrariesForAS6/Library_2/AsBrWStr",
            functionMappings: [
                { old: "wcscat", new: "brwcscat", notes: "Same interface - concatenates wide strings" },
                { old: "wcschr", new: "brwcschr", notes: "Same interface - finds character in wide string" },
                { old: "wcscmp", new: "brwcscmp", notes: "Same interface - compares wide strings" },
                { old: "wcsconv", new: "brwcsconv", notes: "Same interface - converts wide string" },
                { old: "wcscpy", new: "brwcscpy", notes: "Same interface - copies wide string" },
                { old: "wcslen", new: "brwcslen", notes: "Same interface - returns wide string length" },
                { old: "wcsncat", new: "brwcsncat", notes: "Same interface - concatenates n wide chars" },
                { old: "wcsncmp", new: "brwcsncmp", notes: "Same interface - compares n wide chars" },
                { old: "wcsncpy", new: "brwcsncpy", notes: "Same interface - copies n wide chars" },
                { old: "wcsrchr", new: "brwcsrchr", notes: "Same interface - finds last char in wide string" },
                { old: "wcsset", new: "brwcsset", notes: "Same interface - sets wide string chars" },
                { old: "U8toUC", new: "brwU8toUC", notes: "UTF-8 to Unicode conversion" },
                { old: "UCtoU8", new: "brwUCtoU8", notes: "Unicode to UTF-8 conversion" }
            ]
        },
        {
            id: "lib_asstr",
            name: "AsStr",
            severity: "error",
            category: "utilities",
            description: "Legacy string library - replaced by AsBrStr in AS6",
            replacement: { name: "AsBrStr", description: "B&R string library with memory functions" },
            notes: "AsStr functions replaced: memset→brsmemset, memcpy→brsmemcpy, memcmp→brsmemcmp",
            removedIn: "AS6.0",
            functionMappings: [
                { old: "memset", new: "brsmemset", notes: "Same interface - use AsBrStr library" },
                { old: "memcpy", new: "brsmemcpy", notes: "Same interface - use AsBrStr library" },
                { old: "memcmp", new: "brsmemcmp", notes: "Same interface - use AsBrStr library" },
                { old: "memmove", new: "brsmemmove", notes: "Same interface - use AsBrStr library" }
            ]
        },
        {
            id: "lib_asmath",
            name: "AsMath",
            severity: "warning",
            category: "utilities",
            description: "Math library - deprecated in AS6, replaced by AsBrMath",
            replacement: { name: "AsBrMath", description: "B&R math library with 'brm' prefix functions" },
            notes: "AsMath library must be replaced with AsBrMath. All AsMath functions have direct AsBrMath equivalents with 'brm' prefix (e.g., pow → brmpow, ceil → brmceil). Constants also have 'brm' prefix (e.g., amPI → brmPI). The library replacement and function/constant renaming will be handled automatically.",
            removedIn: "AS6.0",
            autoReplace: true,
            libraryPath: "LibrariesForAS6/Library_2/AsBrMath",
            functionMappings: [
                // Math functions
                { old: "atan2", new: "brmatan2", notes: "Same interface - arctangent of y/x" },
                { old: "ceil", new: "brmceil", notes: "Same interface - ceiling function" },
                { old: "cosh", new: "brmcosh", notes: "Same interface - hyperbolic cosine" },
                { old: "floor", new: "brmfloor", notes: "Same interface - floor function" },
                { old: "fmod", new: "brmfmod", notes: "Same interface - floating-point modulo" },
                { old: "frexp", new: "brmfrexp", notes: "Same interface - extract mantissa and exponent" },
                { old: "ldexp", new: "brmldexp", notes: "Same interface - load exponent" },
                { old: "modf", new: "brmmodf", notes: "Same interface - extract integer and fraction" },
                { old: "pow", new: "brmpow", notes: "Same interface - power function" },
                { old: "sinh", new: "brmsinh", notes: "Same interface - hyperbolic sine" },
                { old: "tanh", new: "brmtanh", notes: "Same interface - hyperbolic tangent" }
            ],
            constantMappings: [
                // Math constants - full list from AsMath
                { old: "am2_SQRTPI", new: "brm2_SQRTPI", notes: "2/sqrt(pi)" },
                { old: "amSQRT1_2", new: "brmSQRT1_2", notes: "sqrt(1/2)" },
                { old: "amSQRTPI", new: "brmSQRTPI", notes: "sqrt(pi)" },
                { old: "amLOG2_E", new: "brmLOG2_E", notes: "log2(e)" },
                { old: "amLOG10E", new: "brmLOG10E", notes: "log10(e)" },
                { old: "amIVLN10", new: "brmINVLN10", notes: "1/ln(10)" },
                { old: "amINVLN2", new: "brmINVLN2", notes: "1/ln(2)" },
                { old: "amTWOPI", new: "brmTWOPI", notes: "2*pi" },
                { old: "amSQRT3", new: "brmSQRT3", notes: "sqrt(3)" },
                { old: "amSQRT2", new: "brmSQRT2", notes: "sqrt(2)" },
                { old: "amLOG2E", new: "brmLOG2E", notes: "log2(e)" },
                { old: "amLN2LO", new: "brmLN2LO", notes: "ln(2) low part" },
                { old: "amLN2HI", new: "brmLN2HI", notes: "ln(2) high part" },
                { old: "am3PI_4", new: "brm3PI_4", notes: "3*pi/4" },
                { old: "amPI_4", new: "brmPI_4", notes: "pi/4" },
                { old: "amPI_2", new: "brmPI_2", notes: "pi/2" },
                { old: "amLN10", new: "brmLN10", notes: "ln(10)" },
                { old: "am2_PI", new: "brm2_PI", notes: "2/pi" },
                { old: "am1_PI", new: "brm1_PI", notes: "1/pi" },
                { old: "amLN2", new: "brmLN2", notes: "ln(2)" },
                { old: "amPI", new: "brmPI", notes: "pi" },
                { old: "amE", new: "brmE", notes: "e (Euler's number)" }
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
            description: "Safety library - deprecated, requires manual migration",
            replacement: null,
            autoReplace: false,
            notes: "AsSafety is deprecated and has no direct replacement. Safety conversion must be handled manually using SafeLOGIC, SafeMOTION, or other certified safety solutions.",
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
            id: "func_memcpy",
            name: "memcpy",
            library: "runtime",
            severity: "warning",
            description: "Standard C memcpy - use brsmemcpy in AS6 Structured Text",
            replacement: { name: "brsmemcpy", library: "AsBrStr", notes: "Use brsmemcpy from AsBrStr library" },
            pattern: /\bmemcpy\s*\(/gi,
            autoReplace: true
        },
        {
            id: "func_memset",
            name: "memset",
            library: "runtime",
            severity: "warning",
            description: "Standard C memset - use brsmemset in AS6 Structured Text",
            replacement: { name: "brsmemset", library: "AsBrStr", notes: "Use brsmemset from AsBrStr library" },
            pattern: /\bmemset\s*\(/gi,
            autoReplace: true
        },
        {
            id: "func_memcmp",
            name: "memcmp",
            library: "runtime",
            severity: "warning",
            description: "Standard C memcmp - use brsmemcmp in AS6 Structured Text",
            replacement: { name: "brsmemcmp", library: "AsBrStr", notes: "Use brsmemcmp from AsBrStr library" },
            pattern: /\bmemcmp\s*\(/gi
        },
        {
            id: "func_datobj",
            name: "DatObjCreate",
            library: "DataObj",
            severity: "warning",
            description: "Data object creation - interface changed",
            replacement: { name: "DatObjCreate", library: "DataObj", notes: "Parameter order changed in AS6" },
            pattern: /DatObjCreate\s*\(/gi
        }
        // NOTE: FUB_ENABLE pattern removed - it was causing false positive replacements
        // in constant names like ERR_FUB_ENABLE_FALSE, corrupting valid code.
        // FUB_ENABLE is a valid constant in runtime library, not a deprecated function.
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
        const convertedPackages = this.convertTechnologyPackages(techPackages, options.usedLibraries, options.usedTechPackages);
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
     * @param {Array} as4Packages - Technology packages from AS4 project
     * @param {Array} usedLibraries - List of libraries actually used in the project
     * @param {Array} usedTechPackages - List of tech packages detected from file types (e.g., mappView from .binding files)
     */
    convertTechnologyPackages(as4Packages, usedLibraries = [], usedTechPackages = []) {
        const as6Packages = [];
        const tpRef = this.as6Format.technologyPackages;
        
        as4Packages.forEach(pkg => {
            const ref = tpRef[pkg.name];
            
            if (ref) {
                let subVersions = ref.subVersions || null;
                let version = ref.as6Version;
                let name = pkg.name;
                
                if (ref.replacedBy) {
                    // Package was renamed/replaced
                    const replacement = tpRef[ref.replacedBy];
                    name = ref.replacedBy;
                    version = replacement.as6Version;
                    subVersions = replacement.subVersions || null;
                }
                
                // Build subVersions dynamically for packages with libraries
                if (usedLibraries && usedLibraries.length > 0) {
                    const libMapping = this.as6Format.libraryMapping;
                    const packageLibs = {};
                    
                    usedLibraries.forEach(libName => {
                        const mapping = libMapping[libName];
                        if (mapping && mapping.techPackage === name) {
                            // This library belongs to this tech package and should be a subVersion
                            packageLibs[libName] = mapping.as6LibVersion || version;
                        }
                    });
                    
                    // Only set subVersions if we found any libraries for this package
                    if (Object.keys(packageLibs).length > 0) {
                        subVersions = packageLibs;
                    }
                }
                
                as6Packages.push({
                    name: name,
                    version: version,
                    subVersions: subVersions,
                    note: ref.replacedBy ? `Replaced ${pkg.name} with ${name}` : `Upgraded from ${pkg.version} to ${version}`
                });
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
                    let subVersions = ref.subVersions || null;
                    
                    // Build subVersions dynamically if we have library information
                    if (usedLibraries && usedLibraries.length > 0) {
                        const libMapping = this.as6Format.libraryMapping;
                        const packageLibs = {};
                        
                        usedLibraries.forEach(libName => {
                            const mapping = libMapping[libName];
                            if (mapping && mapping.techPackage === name) {
                                // This library belongs to this tech package and should be a subVersion
                                packageLibs[libName] = mapping.as6LibVersion || ref.as6Version;
                            }
                        });
                        
                        // Only set subVersions if we found any libraries for this package
                        if (Object.keys(packageLibs).length > 0) {
                            subVersions = packageLibs;
                        }
                    }
                    
                    as6Packages.push({
                        name: name,
                        version: ref.as6Version,
                        subVersions: subVersions,
                        note: 'New AS6 package added'
                    });
                }
            }
        });
        
        // Add technology packages if any of their libraries are used (even if not in AS4)
        if (usedLibraries && usedLibraries.length > 0) {
            const libMapping = this.as6Format.libraryMapping;
            
            usedLibraries.forEach(libName => {
                const mapping = libMapping[libName];
                if (mapping && mapping.techPackage) {
                    const techPkgName = mapping.techPackage;
                    const exists = as6Packages.some(p => p.name === techPkgName);
                    
                    if (!exists) {
                        const ref = tpRef[techPkgName];
                        if (ref) {
                            // Collect all libraries from this tech package that are used
                            const packageLibs = {};
                            usedLibraries.forEach(ln => {
                                const lm = libMapping[ln];
                                if (lm && lm.techPackage === techPkgName) {
                                    packageLibs[ln] = lm.as6LibVersion || ref.as6Version;
                                }
                            });
                            
                            as6Packages.push({
                                name: techPkgName,
                                version: ref.as6Version,
                                subVersions: Object.keys(packageLibs).length > 0 ? packageLibs : null,
                                note: `Added for library: ${libName}`
                            });
                        }
                    }
                }
            });
        }
        
        // Add technology packages detected from file types (e.g., mappView from .binding files)
        if (usedTechPackages && usedTechPackages.length > 0) {
            usedTechPackages.forEach(techPkgName => {
                const exists = as6Packages.some(p => p.name === techPkgName);
                if (!exists) {
                    const ref = tpRef[techPkgName];
                    if (ref) {
                        console.log(`Adding ${techPkgName} technology package (detected from file types)`);
                        as6Packages.push({
                            name: techPkgName,
                            version: ref.as6Version,
                            subVersions: null,
                            note: `Added based on file type detection`
                        });
                    }
                }
            });
        }
        
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
