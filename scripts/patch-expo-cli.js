const fs = require("fs");
const path = require("path");

const cliRoots = [
  path.join(__dirname, "..", "node_modules", "@expo", "cli"),
  path.join(__dirname, "..", "node_modules", "expo", "node_modules", "@expo", "cli")
];

const patchExternals = (cliRoot) => {
  const target = path.join(
    cliRoot,
    "build",
    "src",
    "start",
    "server",
    "metro",
    "externals.js"
  );

  if (!fs.existsSync(target)) {
    return false;
  }

  const source = fs.readFileSync(target, "utf8");
  if (source.includes("includes(\":\")")) {
    return false;
  }

  const updated = source.replace(
    "].sort();",
    '].filter((x)=>!x.includes(":")).sort();'
  );

  if (updated === source) {
    return false;
  }

  fs.writeFileSync(target, updated, "utf8");
  return true;
};

const patchOpenBrowser = (cliRoot) => {
  const target = path.join(cliRoot, "build", "src", "utils", "open.js");
  if (!fs.existsSync(target)) {
    return false;
  }
  const source = fs.readFileSync(target, "utf8");
  if (source.includes("EXPO_NO_BROWSER")) {
    return false;
  }
  const marker = "async function openBrowserAsync(target, options) {";
  if (!source.includes(marker)) {
    return false;
  }
  const updated = source.replace(
    marker,
    `${marker}\n    if (process.env.EXPO_NO_BROWSER) {\n        return false;\n    }`
  );
  if (updated === source) {
    return false;
  }
  fs.writeFileSync(target, updated, "utf8");
  return true;
};

const patchBundlerOpenPlatform = (cliRoot) => {
  const target = path.join(
    cliRoot,
    "build",
    "src",
    "start",
    "server",
    "BundlerDevServer.js"
  );
  if (!fs.existsSync(target)) {
    return false;
  }
  const source = fs.readFileSync(target, "utf8");
  if (source.includes("EXPO_NO_BROWSER") || source.includes("process.env.CI")) {
    return false;
  }
  const marker = "await (0, _open.openBrowserAsync)(url);";
  if (!source.includes(marker)) {
    return false;
  }
  const updated = source.replace(
    marker,
    "if (process.env.EXPO_NO_BROWSER || process.env.CI) {\n                return {\n                    url\n                };\n            }\n            " +
      marker
  );
  if (updated === source) {
    return false;
  }
  fs.writeFileSync(target, updated, "utf8");
  return true;
};

const patchDisableStandaloneDevtools = (cliRoot) => {
  const target = path.join(
    cliRoot,
    "build",
    "src",
    "start",
    "server",
    "metro",
    "debugging",
    "createDebugMiddleware.js"
  );
  if (!fs.existsSync(target)) {
    return false;
  }
  const source = fs.readFileSync(target, "utf8");
  if (source.includes("EXPO_NO_DEVTOOLS") || source.includes("process.env.CI")) {
    return false;
  }
  const marker = "enableStandaloneFuseboxShell: !(0, _env.envIsHeadless)()";
  if (!source.includes(marker)) {
    return false;
  }
  const updated = source.replace(
    marker,
    "enableStandaloneFuseboxShell: !(0, _env.envIsHeadless)() && !process.env.CI && !process.env.EXPO_NO_DEVTOOLS"
  );
  if (updated === source) {
    return false;
  }
  fs.writeFileSync(target, updated, "utf8");
  return true;
};

let patched = false;
cliRoots.forEach((cliRoot) => {
  if (patchExternals(cliRoot)) {
    patched = true;
    console.log("Patched @expo/cli externals to avoid Windows colon paths.");
  }
  if (patchOpenBrowser(cliRoot)) {
    patched = true;
    console.log("Patched @expo/cli openBrowserAsync to allow EXPO_NO_BROWSER.");
  }
  if (patchBundlerOpenPlatform(cliRoot)) {
    patched = true;
    console.log("Patched @expo/cli BundlerDevServer to skip opening a browser in CI.");
  }
  if (patchDisableStandaloneDevtools(cliRoot)) {
    patched = true;
    console.log("Patched @expo/cli debug middleware to skip standalone devtools in CI.");
  }
});

if (!patched) {
  process.exit(0);
}
