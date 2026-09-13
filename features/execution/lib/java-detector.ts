export interface JavaDetectionResult {
  mainClass: string | null;
  mainFilePath: string | null;
  error?: string;
}

const MAIN_METHOD_REGEX =
  /public\s+static\s+void\s+main\s*\(\s*String\s*(?:\[\s*\]\s*\w+|\w+\s*\[\s*\])\s*\)/;

const PACKAGE_REGEX = /package\s+([a-zA-Z0-9_.]+)\s*;/;

export function detectJavaMainClass(
  files: Record<string, string>,
  activeFilePath?: string
): JavaDetectionResult {
  const javaFiles = Object.keys(files).filter((path) => path.endsWith(".java"));

  if (javaFiles.length === 0) {
    return {
      mainClass: null,
      mainFilePath: null,
      error: "No .java files found in project.",
    };
  }

  let chosenFile: string | null = null;

  // Step 1: Check active open file if it has main
  if (
    activeFilePath &&
    activeFilePath.endsWith(".java") &&
    files[activeFilePath] &&
    MAIN_METHOD_REGEX.test(files[activeFilePath])
  ) {
    chosenFile = activeFilePath;
  }

  // Step 2: Check convention names (Main.java, App.java, Application.java)
  if (!chosenFile) {
    const conventionFiles = ["Main.java", "App.java", "Application.java"];
    for (const conv of conventionFiles) {
      const match = javaFiles.find(
        (f) => f === conv || f.endsWith("/" + conv)
      );
      if (match && MAIN_METHOD_REGEX.test(files[match])) {
        chosenFile = match;
        break;
      }
    }
  }

  // Step 3: Scan all other java files for main method
  if (!chosenFile) {
    for (const f of javaFiles) {
      if (MAIN_METHOD_REGEX.test(files[f])) {
        chosenFile = f;
        break;
      }
    }
  }

  if (!chosenFile) {
    return {
      mainClass: null,
      mainFilePath: null,
      error:
        "No runnable main method found. Please define 'public static void main(String[] args)' in one of your Java files.",
    };
  }

  // Step 4: Resolve package name and class name
  const content = files[chosenFile];
  const packageMatch = content.match(PACKAGE_REGEX);
  const packageName = packageMatch ? packageMatch[1].trim() : null;

  // Extract simple class name from file name (e.g., "src/com/app/Main.java" -> "Main")
  const fileName = chosenFile.split("/").pop() || "";
  const simpleClassName = fileName.replace(/\.java$/, "");

  const fullyQualifiedClass = packageName
    ? `${packageName}.${simpleClassName}`
    : simpleClassName;

  return {
    mainClass: fullyQualifiedClass,
    mainFilePath: chosenFile,
  };
}
