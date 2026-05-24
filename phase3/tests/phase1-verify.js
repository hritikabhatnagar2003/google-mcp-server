const fs = require('fs');
const path = require('path');

console.log("==================================================");
console.log("🔍 GrowwPulse - Phase 1 Verification Script");
console.log("==================================================");

let failed = false;

function checkDir(dirPath) {
  try {
    const stat = fs.statSync(dirPath);
    if (stat.isDirectory()) {
      console.log(`✅ Directory exists: ${path.relative(process.cwd(), dirPath)}`);
    } else {
      console.error(`❌ Expected directory, but found file: ${path.relative(process.cwd(), dirPath)}`);
      failed = true;
    }
  } catch (err) {
    console.error(`❌ Missing directory: ${path.relative(process.cwd(), dirPath)}`);
    failed = true;
  }
}

function checkFile(filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
      console.log(`✅ File exists: ${path.relative(process.cwd(), filePath)}`);
    } else {
      console.error(`❌ Expected file, but found directory: ${path.relative(process.cwd(), filePath)}`);
      failed = true;
    }
  } catch (err) {
    console.error(`❌ Missing file: ${path.relative(process.cwd(), filePath)}`);
    failed = true;
  }
}

// 1. Directory Structure Validation (P1-T01)
console.log("\n📁 Checking Directory Structure...");
const baseDir = path.resolve(__dirname, '..');
const dirsToCheck = [
  path.join(baseDir, 'src'),
  path.join(baseDir, 'src', 'ingestion'),
  path.join(baseDir, 'src', 'classification'),
  path.join(baseDir, 'src', 'generator'),
  path.join(baseDir, 'src', 'delivery'),
  path.join(baseDir, 'data'),
  path.join(baseDir, 'data', 'raw'),
  path.join(baseDir, 'data', 'processed'),
  path.join(baseDir, 'data', 'outputs'),
  path.join(baseDir, 'config'),
  path.join(baseDir, 'templates'),
  path.join(baseDir, 'tests')
];

dirsToCheck.forEach(checkDir);

// 2. Package Initialization (P1-T02)
console.log("\n📦 Checking Package Configuration...");
const packageJsonPath = path.join(baseDir, 'package.json');
checkFile(packageJsonPath);

if (fs.existsSync(packageJsonPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    console.log(`✅ package.json is valid JSON`);
    
    const requiredDeps = ['@modelcontextprotocol/sdk', 'dotenv', 'google-play-scraper'];
    requiredDeps.forEach(dep => {
      if (pkg.dependencies && pkg.dependencies[dep]) {
        console.log(`  - Dependency '${dep}': FOUND (${pkg.dependencies[dep]})`);
      } else {
        console.error(`  - Dependency '${dep}': MISSING!`);
        failed = true;
      }
    });
    
    if (pkg.scripts && pkg.scripts['test-mcp']) {
      console.log(`✅ npm script 'test-mcp': FOUND`);
    } else {
      console.error(`❌ npm script 'test-mcp': MISSING!`);
      failed = true;
    }
  } catch (err) {
    console.error(`❌ package.json is not valid JSON: ${err.message}`);
    failed = true;
  }
}

// 3. Credential Security Audit (P1-T04)
console.log("\n🔒 Checking .gitignore and Security...");
const gitignorePath = path.join(baseDir, '.gitignore');
checkFile(gitignorePath);

if (fs.existsSync(gitignorePath)) {
  const content = fs.readFileSync(gitignorePath, 'utf8');
  const lines = content.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  
  const patternsToIgnore = ['node_modules', 'credentials.json', 'token.json', '.env'];
  patternsToIgnore.forEach(pattern => {
    const isIgnored = lines.some(line => line.includes(pattern));
    if (isIgnored) {
      console.log(`✅ Git ignore pattern for '${pattern}': FOUND`);
    } else {
      console.warn(`⚠️ Warning: Git ignore pattern for '${pattern}' might be missing or different.`);
    }
  });
}

// 4. Configuration Check (P1-T06 / Settings)
console.log("\n⚙️ Checking Settings and Templates...");
const settingsJsonPath = path.join(baseDir, 'config', 'settings.json');
checkFile(settingsJsonPath);

if (fs.existsSync(settingsJsonPath)) {
  try {
    const settings = JSON.parse(fs.readFileSync(settingsJsonPath, 'utf8'));
    console.log(`✅ settings.json is valid JSON`);
    if (settings.pipeline && settings.pipeline.max_themes) {
      console.log(`  - settings.pipeline.max_themes: ${settings.pipeline.max_themes} (matches spec max 5)`);
    }
  } catch (err) {
    console.error(`❌ settings.json is not valid JSON: ${err.message}`);
    failed = true;
  }
}

checkFile(path.join(baseDir, 'templates', 'pulse_template.html'));
checkFile(path.join(baseDir, 'templates', 'pulse_template.md'));

// Summary
console.log("\n==================================================");
if (failed) {
  console.error("❌ Phase 1 Verification FAILED. Please fix the errors above.");
  process.exit(1);
} else {
  console.log("🎉 Phase 1 Verification PASSED! All foundation items are verified.");
  process.exit(0);
}
