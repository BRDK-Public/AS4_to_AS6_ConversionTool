# Copilot Instructions - AS4 to AS6 Conversion Tool

## Project Overview

A browser-based tool for migrating B&R Automation Studio 4 (AS4) projects to Automation Studio 6 (AS6). It runs as a static web app served via Python's HTTP server—no build step required.

## Architecture

### Core Files
| File | Purpose |
|------|---------|
| `as4-to-as6-converter.html` | Main entry point (NOT `as4-converter.html` or `converter-fresh.html`) |
| `as4-converter.js` | `AS4Converter` class - UI, file processing, analysis orchestration (~7000 lines) |
| `deprecation-database.js` | `DeprecationDatabase` object - library mappings, conversion rules, AS6 format specs |

### Data Flow
1. User uploads AS4 project folder → `processFiles()` loads files into `this.projectFiles` Map
2. `.apj` file triggers `detectASVersion()` → sets `this.projectASVersion` and `this.isAS6Project`
3. `runAnalysis()` scans for deprecations → populates `this.analysisResults`
4. Auto-conversions apply immediately: `autoApplyProjectFileConversion()`, `autoApplyDeprecatedLibraryReplacements()`
5. User reviews in Preview tab → downloads converted project as ZIP

## Key Conventions

### Deprecation Entry Structure
```javascript
// In deprecation-database.js
{
  name: 'AsString',
  replacement: 'AsBrStr',      // null if library should be removed entirely
  autoReplace: true,
  libraryPath: 'LibrariesForAS6/Library_2/AsBrStr',
  functionMappings: { strlen: 'brsstrlen', ... },
  constantMappings: { oldConst: 'newConst', ... }
}
```

### Conversion Types
- `library` (📚) - Library reference in Package.pkg or .sw files
- `deprecated_function_call` (⚠️) - Function renames in .st code
- `deprecated_constant` (🔢) - Constant renames
- `project` (📁) - .apj file conversion to AS6 XML format
- `technology_package` (📦) - mapp/Acp10Arnc0 version updates

### Duplicate Library Handling
When replacing libraries, ALWAYS check if the replacement already exists:
```javascript
// WRONG: Just add replacement
// RIGHT: If replacement exists, remove old. If not, rename old to new.
```

### Technology Package SubVersions
SubVersions are built DYNAMICALLY from `collectUsedLibraries()`. Only include subVersions for libraries actually present in the user's project—never use static lists.

### Technology Packages & Versions
| Package | AS6 Version | Libraries |
|---------|-------------|-----------|
| `mappServices` | 6.2.0 | MpAlarmX, MpAudit, MpBackup, MpCom, MpData, MpFile, MpRecipe, MpServer, MpUserX |
| `mappMotion` | 6.0.0 | MpAxis, MpCnc, MpRobotics, McAcpAx, McAxis, McBase |
| `mappControl` | 6.1.0 | MpTemp, MpHydAxis, MpPump, MTBasics, MTFilter, MTProfile |
| `mappView` | 6.0.0 | (visualization components) |
| `mappVision` | 6.0.0 | ViAccess, ViBase |
| `mappCockpit` | 6.2.1 | CoTrace |
| `mappSafety` | 6.2.0 | SfDomain (SafeLOGIC, MpSafety not bundled—require AS6 install) |
| `Acp10Arnc0` | 6.2.0 | Acp10_MC, Acp10man, Acp10par, NcGlobal |

**Important**: The `mapp` package from AS4 is replaced by `mappServices` in AS6. Library versions must match their technology package version.

### Libraries Without Replacement
Some AS4 libraries have no AS6 equivalent (e.g., `AsSafety`):
- Set `replacement: null` and `autoReplace: false`
- The tool removes these entries entirely from Package.pkg

## File Formats

### Package.pkg (XML)
```xml
<Library Name="AsString" />
<!-- or -->
<Object Type="Library" Description="AsString"/>
```

### cpu.sw / *.sw (Software config)
```xml
<LibraryObject Name="AsString" Source="Libraries.AsString" Memory="UserROM"/>
```

### .apj Project File Changes (AS4 → AS6)
- Add XML declaration and namespace
- Update `Version` attribute
- Convert nested IEC settings to attributes
- Add required elements: `Communication`, `ANSIC`, `Variables`

## Development Workflow

### Running the Tool
```bash
# Option 1: VS Code - Press F5 (uses .vscode/launch.json)
# Option 2: Terminal
python -m http.server 8000
# Then open http://localhost:8000/as4-to-as6-converter.html
```

### Debugging
- Open browser DevTools (F12) for console logs
- Key debug points in `processFiles()` and `updateProjectInfo()`5
- Look for: `console.log('Detected version info:', versionInfo)`

### Adding New Library Mappings
1. Add entry to `deprecatedLibraries` array in `deprecation-database.js`
2. Include `functionMappings` if functions were renamed
3. Place replacement library files in `LibrariesForAS6/Library_2/[LibraryName]/`

### Additional knwowleddge for development and understanding
 - Further information can be found and updated as knowledge increases in the files
  - AI_CONTEXT.md
  - AI_PROJECT_CONTEXT.md
  - AS4_vs_AS6_Structure_Anlysis.md

## Common Pitfalls

- **AS Version shows "-"**: Detection must run in BOTH `processFiles()` AND `processFilesInBatches()`
- **Version attribute errors**: Use version `6.2.0` for most packages, check `as6-libraries-index.json`
- **Binary files**: `.lby` files are binary—never try to parse as text
- **Edge browser**: Has issues with large folder uploads—Chrome recommended

## File Filtering (IMPORTANT)

The tool uses **path-based filtering** via `shouldIncludeFile(filePath)`:

**Included:**
- All files in `Logical/` folder
- All files in `Physical/` folder  
- `.apj` files (project files)

**Excluded:**
- `Temp/` folder (build artifacts)
- `Binaries/` folder (compiled binaries)
- `Diagnosis/` folder (diagnostic files)

**DO NOT** use extension whitelists—they miss files with unusual extensions or no extension at all.
