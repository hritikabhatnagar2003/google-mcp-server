const fs = require('fs');
const path = require('path');

console.log("==================================================");
console.log("🔍 GrowwPulse - Root Phase 1 Verification Script");
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

// 1. Root Directory Structure Validation (P1-T01)
console.log("\n📁 Checking Root Directory Structure...");
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

// 2. Phase 1 Directory Structure Validation
console.log("\n📁 Checking Phase 1 Directory Structure...");
const phase1Dir = path.join(baseDir, 'phase1');
const phase1DirsToCheck = [
  phase1Dir,
  path.join(phase1Dir, 'src'),
  path.join(phase1Dir, 'src', 'ingestion'),
  path.join(phase1Dir, 'src', 'classification'),
  path.join(phase1Dir, 'src', 'generator'),
  path.join(phase1Dir, 'src', 'delivery'),
  path.join(phase1Dir, 'data'),
  path.join(phase1Dir, 'data', 'raw'),
  path.join(phase1Dir, 'data', 'processed'),
  path.join(phase1Dir, 'data', 'outputs'),
  path.join(phase1Dir, 'config'),
  path.join(phase1Dir, 'templates'),
  path.join(phase1Dir, 'tests')
];

phase1DirsToCheck.forEach(checkDir);

// 3. Package Configuration Checks
console.log("\n📦 Checking Root Package Configuration...");
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
  } catch (err) {
    console.error(`❌ package.json is not valid JSON: ${err.message}`);
    failed = true;
  }
}

// 4. Security Audit
console.log("\n🔒 Checking Root .gitignore...");
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

// Summary
console.log("\n==================================================");
if (failed) {
  console.error("❌ Root Phase 1 Verification FAILED. Please check the logs.");
  process.exit(1);
} else {
  console.log("🎉 Root Phase 1 Verification PASSED!");
  process.exit(0);
}
