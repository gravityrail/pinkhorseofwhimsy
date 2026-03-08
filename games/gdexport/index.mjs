/**
 * GDevelop HTML5 exporter using the latest GDCore (libGD.js) and GDJS Runtime.
 *
 * Usage:
 *   import { exportProject } from './gdexport/index.mjs';
 *   await exportProject('path/to/game.json', 'path/to/output/');
 */

import { createRequire } from 'module';
import { join, dirname, resolve, relative, basename, normalize, extname } from 'path';
import { fileURLToPath } from 'url';
import {
  existsSync, readFileSync, writeFileSync, mkdirSync,
  readdirSync, statSync, copyFileSync, unlinkSync, lstatSync,
} from 'fs';
import os from 'os';
import { ensureSetup } from './setup.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

let gd = null;
let setupPaths = null;

/**
 * Initialize libGD.js (the GDevelop core).
 */
async function initGD() {
  if (gd) return gd;

  setupPaths = await ensureSetup();
  const libGDDir = setupPaths.libgdDir;

  console.log('  Loading libGD.js...');
  // Use a require anchored in the libgd directory so the CJS package.json is found
  const libGDRequire = createRequire(join(libGDDir, 'index.js'));
  const initializeGDevelopJs = libGDRequire('./libGD.js');
  gd = await initializeGDevelopJs();
  console.log('  libGD.js initialized.');
  return gd;
}

/**
 * Load JS extensions from Runtime/Extensions/
 */
function loadExtensions() {
  const extensionsRoot = join(setupPaths.runtimeDir, 'Extensions');
  if (!existsSync(extensionsRoot)) {
    console.log('  Warning: No Extensions directory found.');
    return;
  }

  // Use a require anchored in the Runtime dir for proper CJS loading
  const runtimeRequire = createRequire(join(setupPaths.runtimeDir, 'index.js'));

  const folders = readdirSync(extensionsRoot).filter(f => {
    if (f.includes('Example')) return false;
    const p = join(extensionsRoot, f);
    return statSync(p).isDirectory();
  });

  let loaded = 0;
  let failed = 0;

  for (const folder of folders) {
    const jsExtPath = join(extensionsRoot, folder, 'JsExtension.js');
    if (!existsSync(jsExtPath)) continue;

    try {
      const extensionModule = runtimeRequire(`./Extensions/${folder}/JsExtension.js`);
      if (!extensionModule.createExtension) continue;

      const extension = extensionModule.createExtension((x) => x, gd);
      if (extension) {
        // Run sanity tests if available
        if (extensionModule.runExtensionSanityTests) {
          try {
            extensionModule.runExtensionSanityTests(gd, extension);
          } catch {
            // Ignore test failures
          }
        }
        gd.JsPlatform.get().addNewExtension(extension);
        extension.delete();
        loaded++;
      }
    } catch (err) {
      failed++;
      // Silently skip extensions that fail to load
    }
  }

  console.log(`  Loaded ${loaded} extensions${failed ? ` (${failed} skipped)` : ''}.`);
}

/**
 * Create a local file system object for the exporter.
 */
function createFileSystem() {
  const fs = {
    mkDir(path) {
      try { mkdirSync(path, { recursive: true }); return true; }
      catch { return false; }
    },
    dirExists(path) {
      return existsSync(path);
    },
    clearDir(dirPath) {
      try {
        if (!existsSync(dirPath)) return;
        for (const file of readdirSync(dirPath)) {
          const cur = join(dirPath, file);
          if (lstatSync(cur).isDirectory()) {
            fs.clearDir(cur);
          } else {
            try { unlinkSync(cur); } catch {}
          }
        }
      } catch {}
    },
    getTempDir() { return os.tmpdir(); },
    fileNameFrom(fullpath) {
      if (fs._isExternalURL(fullpath)) return fullpath;
      return basename(fs._translateURL(fullpath));
    },
    dirNameFrom(fullpath) {
      if (fs._isExternalURL(fullpath)) return '';
      return dirname(fs._translateURL(fullpath));
    },
    makeAbsolute(filename, baseDirectory) {
      if (fs._isExternalURL(filename)) return filename;
      filename = fs._translateURL(filename);
      if (!fs.isAbsolute(baseDirectory)) baseDirectory = resolve(baseDirectory);
      return resolve(baseDirectory, normalize(filename));
    },
    makeRelative(filename, baseDirectory) {
      if (fs._isExternalURL(filename)) return filename;
      return relative(baseDirectory, normalize(fs._translateURL(filename)));
    },
    isAbsolute(fullpath) {
      if (fs._isExternalURL(fullpath)) return true;
      if (fullpath.length === 0) return true;
      fullpath = fs._translateURL(fullpath);
      return fullpath.charAt(0) === '/' || (fullpath.length > 1 && fullpath.charAt(1) === ':');
    },
    copyFile(source, dest) {
      if (fs._isExternalURL(source)) return true;
      source = fs._translateURL(source);
      try {
        if (source !== dest) {
          mkdirSync(dirname(dest), { recursive: true });
          copyFileSync(source, dest);
        }
      } catch (e) {
        console.error(`copyFile(${source}, ${dest}) failed: ${e}`);
        return false;
      }
      return true;
    },
    writeToFile(file, contents) {
      try {
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, contents);
      } catch (e) {
        console.error(`writeToFile(${file}) failed: ${e}`);
        return false;
      }
      return true;
    },
    readFile(file) {
      try { return readFileSync(file, 'utf8'); }
      catch { return ''; }
    },
    readDir(dirPath, ext) {
      ext = ext.toUpperCase();
      const output = new gd.VectorString();
      try {
        if (existsSync(dirPath)) {
          for (const file of readdirSync(dirPath)) {
            if (ext.length === 0 || file.toUpperCase().endsWith(ext)) {
              output.push_back(dirPath + '/' + file);
            }
          }
        }
      } catch {}
      return output;
    },
    fileExists(filename) {
      filename = fs._translateURL(filename);
      try { return statSync(filename).isFile(); }
      catch { return false; }
    },
    _isExternalURL(filename) {
      return filename.startsWith('http') || filename.startsWith('ftp');
    },
    _translateURL(filename) {
      if (filename.startsWith('g/') || filename.startsWith('g\\')) return filename.slice(2);
      return filename;
    },
  };
  return fs;
}

/**
 * Load events functions extensions from the project.
 */
async function loadProjectEventsFunctions(project) {
  const count = project.getEventsFunctionsExtensionsCount();
  if (count === 0) return;

  const tmpDir = join(os.tmpdir(), 'GDGeneratedEventsFunctions');
  mkdirSync(tmpDir, { recursive: true });

  const slugify = (name) => name.replace(/[^a-zA-Z0-9]/g, '_');
  const getPath = (ns) => join(tmpDir, `${slugify(ns)}.js`);

  const codeWriter = {
    getIncludeFileFor: (ns) => getPath(ns),
    writeFunctionCode: (ns, code) => {
      writeFileSync(getPath(ns), code);
      return Promise.resolve();
    },
    writeBehaviorCode: (ns, code) => {
      writeFileSync(getPath(ns), code);
      return Promise.resolve();
    },
  };

  // Two-pass loading (first without code gen, then with)
  for (const skipCodeGen of [true, false]) {
    for (let i = 0; i < count; i++) {
      const ext = project.getEventsFunctionsExtensionAt(i);
      try {
        const extension = new gd.PlatformExtension();
        // Declare the extension
        extension.setExtensionInformation(
          ext.getName(),
          ext.getFullName(),
          ext.getDescription(),
          ext.getAuthor(),
          ''
        );

        if (!skipCodeGen) {
          // Generate code for free functions
          for (let j = 0; j < ext.getEventsFunctionsCount(); j++) {
            const func = ext.getEventsFunctionAt(j);
            const ns = `gdjs.evtsExt__${slugify(ext.getName())}__${slugify(func.getName())}`;
            const funcName = ns + '.func';

            try {
              const includeFiles = new gd.SetString();
              const codeGen = new gd.EventsFunctionsExtensionCodeGenerator(project);
              const code = codeGen.generateFreeEventsFunctionCompleteCode(
                func, ns, includeFiles, true
              );
              codeGen.delete();
              includeFiles.delete();
              writeFileSync(getPath(funcName), code);
            } catch {}
          }
        }

        gd.JsPlatform.get().addNewExtension(extension);
        extension.delete();
      } catch {}
    }
  }
}

/**
 * Export a GDevelop project to HTML5.
 * @param {string} projectPath - Path to the game.json file
 * @param {string} outputDir - Directory to write the exported game
 */
export async function exportProject(projectPath, outputDir) {
  await initGD();
  loadExtensions();

  // Read and deserialize the project
  console.log(`  Loading project: ${projectPath}`);
  const projectData = JSON.parse(readFileSync(projectPath, 'utf8'));
  projectData.properties = projectData.properties || {};
  projectData.properties.projectFile = projectPath;

  const serialized = gd.Serializer.fromJSObject(projectData);
  const project = gd.ProjectHelper.createNewGDJSProject();
  project.unserializeFrom(serialized);
  serialized.delete();

  // Set the project file path so resources are resolved relative to the game directory
  project.setProjectFile(resolve(projectPath));

  // Load project events functions
  await loadProjectEventsFunctions(project);

  // Set up the exporter
  const localFS = createFileSystem();
  const fileSystem = Object.assign(new gd.AbstractFileSystemJS(), localFS);

  // gdjsRoot is the directory containing the Runtime/ folder
  const gdjsRoot = setupPaths.runtimeDir.replace(/\/Runtime\/?$/, '');
  const exporter = new gd.Exporter(fileSystem, gdjsRoot);

  mkdirSync(outputDir, { recursive: true });

  // Create export options
  const exportOptions = new gd.ExportOptions(project, outputDir);

  console.log(`  Exporting to: ${outputDir}`);
  exporter.exportWholePixiProject(exportOptions);

  exportOptions.delete();
  exporter.delete();
  project.delete();

  // Post-export fixups for the generated index.html
  const indexPath = join(outputDir, 'index.html');
  if (existsSync(indexPath)) {
    let html = readFileSync(indexPath, 'utf8');
    // Remove .wasm files loaded as <script> tags (causes SyntaxError)
    html = html.replace(/\s*<script\s[^>]*\.wasm"[^>]*><\/script>\s*/g, '\n');
    // Fix deprecated apple-mobile-web-app-capable meta tag
    html = html.replace(
      'name="apple-mobile-web-app-capable"',
      'name="mobile-web-app-capable"'
    );
    // Expose game instance for debugging (harmless in production)
    html = html.replace(
      'var game = new gdjs.RuntimeGame(gdjs.projectData, {});',
      'var game = new gdjs.RuntimeGame(gdjs.projectData, {}); window.__gdGame = game;'
    );
    writeFileSync(indexPath, html);
  }

  // Post-export fixup: restore layer effects that the exporter strips
  const dataJsPath = join(outputDir, 'data.js');
  if (existsSync(dataJsPath)) {
    let dataJs = readFileSync(dataJsPath, 'utf8');
    // For each layout, restore effects from the original project data
    for (const layout of projectData.layouts || []) {
      for (const layer of layout.layers || []) {
        if (layer.effects && layer.effects.length > 0) {
          // Find the layer in data.js by its name and replace its empty effects
          const layerNameEscaped = JSON.stringify(layer.name);
          // Match: "name":<layerName>,...,"effects":[]
          const pattern = new RegExp(
            `("name":${layerNameEscaped.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^}]*?"effects":)\\[\\]`,
          );
          const replacement = `$1${JSON.stringify(layer.effects)}`;
          dataJs = dataJs.replace(pattern, replacement);
        }
      }
    }
    writeFileSync(dataJsPath, dataJs);
  }

  console.log('  Export complete!');
}
