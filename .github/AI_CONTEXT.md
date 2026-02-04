# AI Project Context - AS4 to AS6 Converter

## Project Overview

This is a web-based tool for converting B&R Automation Studio 4 (AS4) projects to Automation Studio 6 (AS6) format. The tool analyzes project files, detects deprecated libraries/functions, and applies automatic conversions.

**Location:** `c:\Projects\GithibCopilotPlayground`

## Key Files

| File | Purpose |
|------|---------|
| `as4-to-as6-converter.html` | Main UI (NOT as4-converter.html!) |
| `as4-converter.js` | Main converter class (~5700 lines) |
| `deprecation-database.js` | Library mappings, deprecation rules, conversion logic |
| `as4-converter-styles.css` | UI styling |
| `start-webserver.bat` | Starts Python HTTP server on port 8000 |

## Architecture

### AS4Converter Class (as4-converter.js)

**Key Properties:**
- `projectFiles` - Map of all loaded project files
- `analysisResults` - Array of deprecation findings
- `appliedConversions` - Set of applied conversion IDs
- `projectASVersion` - Detected AS version object `{major, full, format}`
- `isAS6Project` - Boolean flag for AS6 detection

**Key Methods:**
- `processFiles(files)` - Main file loading method (NOT processFilesInBatches!)
- `runAnalysis()` - Scans for deprecations, auto-applies conversions
- `updateProjectInfo()` - Updates UI with file stats and AS version
- `collectUsedLibraries()` - Scans Package.pkg and .sw files for library references
- `autoApplyProjectFileConversion()` - Auto-converts .apj file to AS6 format
- `autoApplyDeprecatedLibraryReplacements()` - Handles function/constant/library replacements
- `clearProject()` - Resets all state
- `shouldIncludeFile(filePath)` - Centralized file filtering logic (path-based, not extension-based)

### DeprecationDatabase (deprecation-database.js)

**Key Methods:**
- `detectASVersion(content)` - Parses .apj file for version (regex: `Version="([^"]+)"`)
- `convertProjectFileToAS6(content, options)` - Converts .apj XML structure
- `convertTechnologyPackages(content, options)` - Updates tech package versions dynamically

**Deprecation Entry Structure:**
```javascript
{
  name: 'LibraryName',
  replacement: 'NewLibraryName', // or null if no replacement
  autoReplace: true/false,
  libraryPath: 'LibrariesForAS6/...',
  functionMappings: { oldFunc: 'newFunc', ... },
  constantMappings: { oldConst: 'newConst', ... },
  description: '...',
  notes: '...'
}
```

## Conversion Types

| Type | Icon | Description |
|------|------|-------------|
| `library` | 📚 | Library reference replacements |
| `deprecated_function_call` | 🔄 | Function name replacements |
| `deprecated_constant` | 🔢 | Constant name replacements |
| `deprecated_function_block` | 🚫 | Removed function blocks (unsupported in AS6) |
| `project` | 📁 | Project file (.apj) conversion |
| `technology_package` | 📦 | Tech package version updates |

## Important Behaviors

### Deprecated Function Block Removal
For function blocks not supported in AS6 (e.g., `MpAlarmXAcknowledgeAll`):
1. **Step 1**: Find instances in `.var` and `.typ` files and replace with commented declaration
2. **Step 2**: Collect all instance names
3. **Step 3**: Comment out all usages in source files (`.st`, `.c`, etc.) with `(* AS6-REMOVED: ... *)` and `// TODO:` marker
4. Programmers can search for "AS6-REMOVED" or "TODO: MpAlarmXAcknowledgeAll" to find what needs reimplementation

### Duplicate Library Detection
When replacing libraries in Package.pkg or .sw files:
- Check if replacement library already exists
- If exists: REMOVE old entry (don't add duplicate)
- If not exists: RENAME old to new

### Technology Package SubVersions
- Built DYNAMICALLY based on actual libraries used in project
- Uses `collectUsedLibraries()` to scan project
- Only includes subVersions for libraries actually present

### Libraries Without Replacement
Some deprecated libraries have no AS6 replacement (e.g., AsSafety):
- Set `replacement: null` and `autoReplace: false`
- `autoApplyDeprecatedLibraryReplacements()` removes these entries entirely

### AS Version Detection
- Detected when loading .apj file in `processFiles()`
- Displayed in Project Summary UI
- If AS6 detected: show warning banner, disable scan button

### File Filtering Logic (shouldIncludeFile)
The `shouldIncludeFile(filePath)` method uses **path-based filtering** instead of extension whitelists:

**Included files:**
- All files in `Logical/` folder and subfolders
- All files in `Physical/` folder and subfolders
- `.apj` files anywhere (project files)

**Excluded folders:**
- `Temp/` - Build artifacts
- `Binaries/` - Compiled binaries
- `Diagnosis/` - Diagnostic files

**Why path-based?** The previous extension whitelist approach missed files with:
- Unusual extensions (`.cpp`, `.hpp`, `.sfopt`, `.axisfeature`, `.drawio`, etc.)
- Case-sensitive extensions (`.CIC`, `.DIT`, `.POU` vs `.cic`, `.dit`, `.pou`)
- No extension at all (CHANGELOG, LICENSE, SDAPP-Part*)

This approach ensures all project source files are included regardless of their extension.

### Function Return Type Changes (wrapWith)
Some AS6 functions have different return types than their AS4 equivalents:
- `strlen` (UINT) → `brsstrlen` (UDINT)
- To maintain compatibility, use `wrapWith` property in function mapping
- Example: `{ old: "strlen", new: "brsstrlen", wrapWith: "UDINT_TO_UINT" }`
- Result: `strlen(str)` → `UDINT_TO_UINT(brsstrlen(str))`

## Common Library Mappings

| AS4 Library | AS6 Replacement | Has Function Mappings |
|-------------|-----------------|----------------------|
| AsString | AsBrStr | Yes (13 functions, 1 with wrapWith) |
| AsMath | AsBrMath | Yes (11 functions, 22 constants) |
| AsMem | AsBrMem | Yes |
| AsSafety | (removed) | N/A |

### AsMath Function Mappings
`atan2→brmatan2, ceil→brmceil, cosh→brmcosh, floor→brmfloor, fmod→brmfmod, frexp→brmfrexp, ldexp→brmldexp, modf→brmmodf, pow→brmpow, sinh→brmsinh, tanh→brmtanh`

### AsMath Constant Mappings
`amPI→brmPI, amE→brmE, amPI_2→brmPI_2, amPI_4→brmPI_4, am1_PI→brm1_PI, am2_PI→brm2_PI, am2_SQRTPI→brm2_SQRTPI, amLN2→brmLN2, amLN10→brmLN10, amLOG2E→brmLOG2E, amLOG10E→brmLOG10E, amSQRT2→brmSQRT2, amSQRT1_2→brmSQRT1_2, amMaxReal→brmMaxReal, amMinReal→brmMinReal, amRealEps→brmRealEps, amMaxLReal→brmMaxLReal, amMinLReal→brmMinLReal, amLRealEps→brmLRealEps, amMaxInt→brmMaxInt, amMaxLInt→brmMaxLInt, amMaxDInt→brmMaxDInt`

## File Formats

### Package.pkg (XML)
```xml
<Library Name="AsString" />
<!-- or -->
<Object Type="Library" Description="AsString"/>
```

### cpu.sw / *.sw (Software config)
```xml
<LibraryObject Name="AsString" Source="Libraries.AsString" Memory="UserROM" .../>
```

### .apj (Project file)
Key changes AS4→AS6:
- Add XML declaration
- Add namespace to Project element
- Add Project Version attribute
- IEC settings moved to attributes
- New required elements: Communication, ANSIC, Variables

## Testing

1. Start server: `python -m http.server 8000` in project directory
2. Open: `http://localhost:8000/as4-to-as6-converter.html`
3. Upload AS4 project folder
4. Check console (F12) for debug logs
5. Verify AS version appears in Project Summary
6. Click "Scan for Deprecations"
7. Review findings and download converted project

## Known Issues & Solutions

### Issue: AS Version shows "-"
**Cause:** Detection code missing in `processFiles()` (was only in `processFilesInBatches()`)
**Solution:** Add detection code to BOTH methods

### Issue: Duplicate libraries in Package.pkg
**Cause:** Replacement added without checking if it already exists
**Solution:** Check for existing replacement before adding; if exists, just remove old

### Issue: Technology package subVersion errors
**Cause:** Static subVersions included libraries not in project
**Solution:** Build subVersions dynamically from `collectUsedLibraries()`

### Issue: .apj not converted to AS6
**Cause:** Conversion wasn't auto-applied during analysis
**Solution:** Added `autoApplyProjectFileConversion()` in `runAnalysis()`

## Debug Logging

Current debug logs in `processFiles()` and `updateProjectInfo()`:
```javascript
console.log(`Processing .apj file: ${file.name}`);
console.log('Detected version info:', versionInfo);
console.log(`AS Version set to: ${versionInfo.full}, isAS6: ${this.isAS6Project}`);
console.log('updateProjectInfo - projectASVersion:', this.projectASVersion);
console.log('updateProjectInfo - isAS6Project:', this.isAS6Project);
```

## File Locations for AS6 Libraries

Library replacement files are stored in:
`LibrariesForAS6/Library_2/[LibraryName]/`

Technology packages are in:
`LibrariesForAS6/TechnologyPackages/[PackageName]/[Version]/`

## Recent Changes (February 2026)

19. **Fixed function/constant replacements to only apply to Structured Text files** (v1.1.1)
    - Function mappings (e.g., `strlen→brsstrlen`) are for IEC 61131-3 ST only
    - Removed `.c`, `.cpp`, `.h` from processed file extensions
    - Now only processes: `.st`, `.var`, `.typ`, `.fun`, `.prg`
    - C/C++ files in libraries are no longer incorrectly modified

18. **Major refactor: File filtering now path-based instead of extension whitelist** (v1.1.0)
    - Created centralized `shouldIncludeFile(filePath)` method
    - Includes all files from `Logical/` and `Physical/` folders
    - Includes `.apj` files regardless of location
    - Excludes `Temp/`, `Binaries/`, `Diagnosis/` folders
    - Fixes missing files with unusual extensions (`.cpp`, `.hpp`, `.sfopt`, `.axisfeature`, etc.)
    - Fixes case sensitivity issues (`.CIC` vs `.cic`)
    - Fixes files without extensions (CHANGELOG, LICENSE, etc.)
    - Reduced code duplication - removed 3 separate `relevantExtensions` lists

## Recent Changes (January 2026)

1. Fixed duplicate AsBrStr detection in Package.pkg and .sw files
2. Fixed technology package subVersion generation (dynamic from actual libraries)
3. Fixed AS version update in .apj file (auto-apply during analysis)
4. Changed AsSafety to removal-only (no MpSafety replacement exists)
5. Added complete AsMath → AsBrMath conversion with functions and constants
6. Added AS version display in UI with AS6 project blocking
7. Added warning banner CSS styling
8. Added `wrapWith` support for function mappings (e.g., strlen → UDINT_TO_UINT(brsstrlen(...)))
9. Added deprecated function block removal (MpAlarmXAcknowledgeAll - removes from .var/.typ, comments out usages)
10. Added OPC UA role configuration - extracts roles from Role.role files and adds them to UaDvConfig.uadcfg with all permissions enabled
11. Added mappCockpit technology package support (version 5.24.2 → 6.2.1) with CoTrace library
12. Fixed document file handling - added ~30 binary extensions (.pdf, .chm, .stl, .exe, .dll, .scn, .xdd, .xlsm, etc.) to both processFiles and processExtractedFiles for proper ZIP upload support
13. Added mappView technology package detection from file types (.binding, .eventbinding, .mappviewcfg files) instead of library scanning
14. Fixed memset→brsmemset conversion preview to properly display deprecated_function_call type
15. Redesigned Report tab UI - moved download button to top, grouped findings in collapsible sections by type
16. Added MpWebXs (Web Extensions) library removal - auto-removes discontinued package, .mpwebxs config files, and all references in Package.pkg and .sw files
17. Updated MpWebXs severity from 'error' to 'warning' for non-blocking deprecation

## Technology Packages Supported

| AS4 Package | AS6 Version | Libraries |
|-------------|-------------|-----------|
| Acp10Arnc0 | 6.2.0 | Acp10_MC, Acp10man, Acp10par, Acp10sim, Acp10sdc, NcGlobal |
| mapp → mappServices | 6.2.0 | MpAlarmX, MpAudit, MpBackup, MpCom, MpData, MpFile, MpRecipe, MpServer, etc. |
| mappSafety | 6.2.0 | SfDomain |
| mappView | 6.2.0 | (visualization) |
| mappCockpit | 6.2.1 | CoTrace |
| mappMotion | 6.0.0 | MpAxis, MpCnc, MpRobotics, McAcpAx, McAxis, McBase |
| mappControl | 6.0.0 | MpTemp, MTData, MTBasics, MTFilter |

## OPC UA Role Configuration

When converting OPC UA (OpcUA → OpcUaCs):
- Roles are extracted from `Role.role` files in the project
- Each role is added to `UaDvConfig.uadcfg` in the `DefaultRolePermissions` group
- All 8 permissions are enabled for each role:
  - PermissionBrowse, PermissionRead, PermissionWrite, PermissionCall
  - PermissionReadRolePermissions, PermissionWriteRolePermissions
  - PermissionWriteAttribute, PermissionReadHistory
- If no Role.role file exists, only the default "Everyone" role is created

## File Type Support - Extensions

### Binary Extensions (Read as base64)
```javascript
const BINARY_EXTENSIONS = [
  // Images
  '.bmp', '.jpg', '.jpeg', '.png', '.gif', '.tiff', '.ico', '.svg',
  // Documents
  '.pdf', '.chm', '.xlsx', '.xlsm', '.docx', '.pptx', '.zip', '.rar',
  // CAD/3D
  '.stl', '.step', '.iges', '.dwg', '.dxf',
  // Executables & Libraries
  '.exe', '.dll', '.lib', '.obj', '.o',
  // Firmware & Binary
  '.bin', '.hex', '.scn', '.xdd',
  // mapp-specific binary
  '.mpwebxs', '.mpreportcore', '.mpaudittrail'
]
```

### File Types Supported in ZIP/Folder Uploads
Both processFiles() and processExtractedFiles() include these extensions in `relevantExtensions`:
- Source files: `.st`, `.c`, `.h`, `.cpp`, `.hpp`, `.asm`
- Configuration: `.pkg`, `.sw`, `.apj`, `.typ`, `.var`, `.con`, `.acr`, `.hws`, `.pnl`
- mapp components: `.binding`, `.eventbinding`, `.mappviewcfg`, `.visionapplication`, `.visioncomponent`
- OPC UA: `.uacfg`, `.uadcfg`, `.role`
- Hardware: `.vicfg`, `.dis`
- Other: `.mpwebxs`, `.mpreportcore`, `.mpaudittrail`

## Report Tab Features

### Download Section (Top)
- Download converted project as ZIP
- Only enabled after successful conversion
- Position: Above all findings

### Findings Organization
- Grouped by type (library, deprecated_function_call, etc.)
- Each group is collapsible/expandable
- Groups show count of findings (e.g., "Libraries (3)")
- Color-coded by severity: red (error), orange (warning), blue (info)

### Finding Details
- Each finding shows:
  - Name and description
  - File path (shortened with shortenPath() helper)
  - Severity indicator
  - Auto-fix status
  - Details section (if applicable)

## Helper Functions Added

- `getTypeName(type)` - Convert finding type to display name
- `shortenPath(filePath)` - Truncate long paths for display (e.g., `...Folder/subfolder/file.txt`)
- `detectUsedTechPackages()` - Scans project files for technology package markers (file types) to detect usage
- `autoRemoveMpWebXs()` - Removes MpWebXs library and .mpwebxs config files from project
- All 8 permissions are enabled for each role:
  - PermissionBrowse, PermissionRead, PermissionWrite, PermissionCall
  - PermissionReadRolePermissions, PermissionWriteRolePermissions
  - PermissionWriteAttribute, PermissionReadHistory
- If no Role.role file exists, only the default "Everyone" role is created
