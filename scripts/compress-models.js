const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const PUBLIC_DIR = path.join(__dirname, "../public");
const MODELS_DIR = path.join(PUBLIC_DIR, "models");
const BACKUP_DIR = path.join(PUBLIC_DIR, "models_backup");
const DRACO_TARGET_DIR = path.join(PUBLIC_DIR, "draco");
const DRACO_SOURCE_DIR = path.join(__dirname, "../node_modules/three/examples/jsm/libs/draco/gltf");

// 1. Copy Draco decoders from node_modules to public
console.log("📦 Copying Draco decoder binaries to public/draco...");
if (!fs.existsSync(DRACO_TARGET_DIR)) {
  fs.mkdirSync(DRACO_TARGET_DIR, { recursive: true });
}
if (fs.existsSync(DRACO_SOURCE_DIR)) {
  const files = fs.readdirSync(DRACO_SOURCE_DIR);
  files.forEach((file) => {
    fs.copyFileSync(path.join(DRACO_SOURCE_DIR, file), path.join(DRACO_TARGET_DIR, file));
  });
  console.log("✔️ Draco decoder binaries copied successfully!");
} else {
  console.error("❌ Could not find Draco folder in node_modules/three. Please run npm install.");
  process.exit(1);
}

// 2. Backup and compress GLB files
console.log("⚙️ Starting Draco compression on models...");
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const files = fs.readdirSync(MODELS_DIR);
const glbFiles = files.filter((f) => f.endsWith(".glb"));

let totalOriginalSize = 0;
let totalCompressedSize = 0;

glbFiles.forEach((file) => {
  const filePath = path.join(MODELS_DIR, file);
  const backupPath = path.join(BACKUP_DIR, file);

  const origStats = fs.statSync(filePath);
  totalOriginalSize += origStats.size;

  // Make backup of original file if not exists
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(filePath, backupPath);
  }

  console.log(`Compiling & compressing: ${file} (${(origStats.size / 1024 / 1024).toFixed(2)} MB)...`);
  
  // Execute gltf-pipeline to compress
  const tempOutPath = path.join(MODELS_DIR, `compressed_${file}`);
  try {
    execSync(`npx -y gltf-pipeline -i "${backupPath}" -o "${tempOutPath}" -d --draco.compressionLevel 7`, {
      stdio: "ignore",
    });
    
    // Replace original GLB with compressed one
    fs.renameSync(tempOutPath, filePath);
    const compStats = fs.statSync(filePath);
    totalCompressedSize += compStats.size;
    
    const ratio = ((1 - compStats.size / origStats.size) * 100).toFixed(1);
    console.log(`✔️  Compressed: ${file} -> ${(compStats.size / 1024).toFixed(1)} KB (Saved ${ratio}%)`);
  } catch (err) {
    console.error(`❌ Failed to compress ${file}:`, err.message);
  }
});

console.log("\n==============================================");
console.log(`🎉 Draco compression completed successfully!`);
console.log(`Original size: ${(totalOriginalSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`Compressed size: ${(totalCompressedSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`Total savings: ${((1 - totalCompressedSize / totalOriginalSize) * 100).toFixed(1)}%`);
console.log(`Backup is available in: public/models_backup/`);
console.log("==============================================");
