#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ANSI Colors for clean terminal UI
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
};

const PKG_DIR = path.resolve(__dirname, "..");
const REGISTRY_DIR = path.join(PKG_DIR, "registry");
const COMPONENTS_FILE = path.join(REGISTRY_DIR, "components.json");

function loadRegistry() {
  if (!fs.existsSync(COMPONENTS_FILE)) {
    console.error(`${c.red}Error:${c.reset} components.json not found.`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(COMPONENTS_FILE, "utf-8")).components;
}

function detectPackageManager(cwd = process.cwd()) {
  if (fs.existsSync(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(cwd, "bun.lockb")) || fs.existsSync(path.join(cwd, "bun.lock"))) return "bun";
  if (fs.existsSync(path.join(cwd, "yarn.lock"))) return "yarn";
  if (fs.existsSync(path.join(cwd, "package-lock.json"))) return "npm";
  return "npm";
}

function showBanner() {
  console.log(`
${c.cyan}${c.bold}  _  __ _  ____  __     _   _ ___ 
 | |/ /| |/ /  \\/  |   | | | |_ _|
 | ' / | ' /| |\\/| |___| | | || | 
 | . \\ | . \\| |  | |___| |_| || | 
 |_|\\_\\|_|\\_\\_|  |_|    \\___/|___|${c.reset}
  ${c.dim}Interactive 3D & Physics UI Components CLI${c.reset}
`);
}

function showHelp() {
  showBanner();
  console.log(`${c.bold}USAGE:${c.reset}
  ${c.cyan}npx kkm-ui${c.reset} <command> [options]

${c.bold}COMMANDS:${c.reset}
  ${c.green}list${c.reset}                List all available components in the registry
  ${c.green}add <component>${c.reset}     Add a component to your project & install dependencies
  ${c.green}init${c.reset}                Setup lib/utils.ts with the cn helper if not present
  ${c.green}help${c.reset}                Show this help message

${c.bold}EXAMPLES:${c.reset}
  $ ${c.cyan}npx kkm-ui list${c.reset}
  $ ${c.cyan}npx kkm-ui add skills-physics${c.reset}
  $ ${c.cyan}npx kkm-ui add website-carousel${c.reset}
`);
}

function cmdList() {
  showBanner();
  const components = loadRegistry();
  console.log(`${c.bold}Available Components (${Object.keys(components).length}):${c.reset}\n`);

  for (const [key, comp] of Object.entries(components)) {
    console.log(`  ${c.cyan}${c.bold}${key.padEnd(20)}${c.reset} ${comp.title}`);
    console.log(`  ${c.dim}${comp.description}${c.reset}`);
    if (comp.dependencies.length > 0) {
      console.log(`  ${c.yellow}deps:${c.reset} ${c.dim}${comp.dependencies.join(", ")}${c.reset}`);
    }
    console.log();
  }
}

function cmdInit(cwd = process.cwd()) {
  const libDir = path.join(cwd, "lib");
  const utilsFile = path.join(libDir, "utils.ts");

  if (fs.existsSync(utilsFile)) {
    console.log(`${c.green}✓${c.reset} lib/utils.ts already exists.`);
    return;
  }

  fs.mkdirSync(libDir, { recursive: true });
  const content = `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`;
  fs.writeFileSync(utilsFile, content, "utf-8");
  console.log(`${c.green}✓${c.reset} Created ${c.cyan}lib/utils.ts${c.reset}`);

  // Install clsx and tailwind-merge if needed
  const pm = detectPackageManager(cwd);
  const addCmd = pm === "yarn" ? "yarn add" : `${pm} add`;
  try {
    console.log(`Installing ${c.cyan}clsx${c.reset} and ${c.cyan}tailwind-merge${c.reset}...`);
    execSync(`${addCmd} clsx tailwind-merge`, { stdio: "inherit", cwd });
  } catch (err) {
    console.log(`${c.yellow}!${c.reset} Please install manually: ${addCmd} clsx tailwind-merge`);
  }
}

function cmdAdd(componentName, cwd = process.cwd()) {
  if (!componentName) {
    console.error(`${c.red}Error:${c.reset} Please specify a component name.\nRun ${c.cyan}npx kkm-ui list${c.reset} to view all components.`);
    process.exit(1);
  }

  const components = loadRegistry();
  const comp = components[componentName];

  if (!comp) {
    console.error(`${c.red}Error:${c.reset} Component "${componentName}" not found.`);
    console.log(`Run ${c.cyan}npx kkm-ui list${c.reset} to see available components.`);
    process.exit(1);
  }

  showBanner();
  console.log(`${c.bold}Installing component:${c.reset} ${c.cyan}${comp.title}${c.reset}\n`);

  // 1. Determine target directory
  const targetDir = path.join(cwd, "components", "ui");
  fs.mkdirSync(targetDir, { recursive: true });

  const srcFile = path.join(REGISTRY_DIR, comp.registryFile);
  const destFile = path.join(targetDir, comp.targetFile);

  if (!fs.existsSync(srcFile)) {
    console.error(`${c.red}Error:${c.reset} Source file ${comp.registryFile} is missing in registry.`);
    process.exit(1);
  }

  // 2. Copy component file
  fs.copyFileSync(srcFile, destFile);
  console.log(`${c.green}✓${c.reset} Created ${c.cyan}components/ui/${comp.targetFile}${c.reset}`);

  // 3. Install dependencies
  const pm = detectPackageManager(cwd);
  const addCmd = pm === "yarn" ? "yarn add" : `${pm} add`;
  const addDevCmd = pm === "yarn" ? "yarn add -D" : `${pm} add -D`;

  if (comp.dependencies && comp.dependencies.length > 0) {
    const depsStr = comp.dependencies.join(" ");
    console.log(`\n${c.dim}> Installing dependencies: ${depsStr}...${c.reset}`);
    try {
      execSync(`${addCmd} ${depsStr}`, { stdio: "inherit", cwd });
      console.log(`${c.green}✓${c.reset} Installed dependencies successfully.`);
    } catch (err) {
      console.log(`${c.yellow}! Could not auto-install dependencies. Please run manually:${c.reset}`);
      console.log(`  ${addCmd} ${depsStr}`);
    }
  }

  if (comp.devDependencies && comp.devDependencies.length > 0) {
    const devDepsStr = comp.devDependencies.join(" ");
    console.log(`\n${c.dim}> Installing devDependencies: ${devDepsStr}...${c.reset}`);
    try {
      execSync(`${addDevCmd} ${devDepsStr}`, { stdio: "inherit", cwd });
      console.log(`${c.green}✓${c.reset} Installed devDependencies successfully.`);
    } catch (err) {
      console.log(`${c.yellow}! Could not auto-install devDependencies. Please run manually:${c.reset}`);
      console.log(`  ${addDevCmd} ${devDepsStr}`);
    }
  }

  // 4. Success summary and import example
  console.log(`
${c.green}${c.bold}🎉 Done!${c.reset} You can now import and use the component:

  ${c.cyan}import ${comp.targetFile.replace(/\.tsx$/, "")} from "@/components/ui/${comp.targetFile.replace(/\.tsx$/, "")}";${c.reset}
`);
}

// Main CLI router
function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "help";

  switch (command) {
    case "list":
    case "ls":
      cmdList();
      break;

    case "add":
      cmdAdd(args[1]);
      break;

    case "init":
      cmdInit();
      break;

    case "help":
    case "--help":
    case "-h":
    default:
      showHelp();
      break;
  }
}

main();
