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
| `deprecated_function_call` | ⚠️ | Function name replacements |
| `deprecated_constant` | 🔢 | Constant name replacements |
| `project` | 📁 | Project file (.apj) conversion |
| `technology_package` | 📦 | Tech package version updates |

## Important Behaviors

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

## Common Library Mappings

| AS4 Library | AS6 Replacement | Has Function Mappings |
|-------------|-----------------|----------------------|
| AsString | AsBrStr | Yes (11 functions) |
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

## Recent Changes (January 2026)

1. Fixed duplicate AsBrStr detection in Package.pkg and .sw files
2. Fixed technology package subVersion generation (dynamic from actual libraries)
3. Fixed AS version update in .apj file (auto-apply during analysis)
4. Changed AsSafety to removal-only (no MpSafety replacement exists)
5. Added complete AsMath → AsBrMath conversion with functions and constants
6. Added AS version display in UI with AS6 project blocking
7. Added warning banner CSS styling
