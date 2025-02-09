import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import inquirer from "inquirer";
import stripAnsi from "strip-ansi";

// 📌 Correction de `__dirname` pour ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIRECTORY_PATH = __dirname;
const OUTPUT_FILE = path.join(__dirname, "arborescence.txt");

// Dossiers et fichiers ignorés par défaut
const defaultIgnoredFolders = ["node_modules", ".git", "dist"];
const defaultIgnoredFiles = ["package-lock.json", "arborescence.js", "arborescence.txt"];

// Extensions binaires (dont le contenu ne sera pas affiché)
const binaryFileExtensions = [
    ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".svg", ".webp", ".ico",
    ".mp4", ".avi", ".mov", ".mkv", ".mp3", ".zip", ".rar", ".exe", ".dll", ".class", ".jar", ".sqlite"
];

// Vérifier si l'option "--select" est activée
const isInteractiveMode = process.argv.includes("--select");

// Récupérer les dossiers à ignorer donnés en paramètre (hors `--select`)
const args = process.argv.filter(arg => arg !== "--select");
const ignoredFolders = [...defaultIgnoredFolders, ...args.slice(2)];

// Liste des fichiers sélectionnés pour le contenu des fichiers
let selectedFiles = [];

/**
 * 📌 Fonction récursive pour obtenir l'arborescence complète d'un dossier
 */
function listFilesRecursive(dirPath, basePath = DIRECTORY_PATH) {
    let items = [];
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    entries.forEach(entry => {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(basePath, fullPath);

        if (!ignoredFolders.includes(entry.name) && !defaultIgnoredFiles.includes(entry.name)) {
            items.push({ name: relativePath, fullPath, isDirectory: entry.isDirectory() });

            if (entry.isDirectory()) {
                items = items.concat(listFilesRecursive(fullPath, basePath));
            }
        }
    });

    return items;
}

/**
 * 📌 Fonction interactive pour sélectionner les fichiers/dossiers
 */
async function selectFilesInteractive() {
    console.log(chalk.blue("\n📌 Sélectionnez les fichiers/dossiers à inclure dans l'arborescence :\n"));

    const allItems = listFilesRecursive(DIRECTORY_PATH);
    const choices = allItems.map(item => ({
        name: item.name,
        value: item.fullPath,
        checked: true
    }));

    const { selected } = await inquirer.prompt([
        {
            type: "checkbox",
            name: "selected",
            message: "Sélectionnez les fichiers/dossiers à inclure :",
            choices: choices,
            pageSize: 20,
            validate: function(answer) {
                if (answer.length < 1) {
                    return "Vous devez sélectionner au moins un fichier ou dossier.";
                }
                return true;
            }
        }
    ]);

    // Utiliser un Set pour éviter les duplications
    const selectedSet = new Set();

    // Ajouter les répertoires parents de chaque élément sélectionné
    selected.forEach(itemPath => {
        const stats = fs.statSync(itemPath);
        if (stats.isDirectory()) {
            // Inclure tous les fichiers dans le répertoire sélectionné
            const filesInDir = listFilesRecursive(itemPath, DIRECTORY_PATH)
                .filter(item => !item.isDirectory)
                .map(item => item.fullPath);
            filesInDir.forEach(file => selectedSet.add(file));
        } else if (stats.isFile()) {
            selectedSet.add(itemPath);
        }
    });

    // Convertir le Set en tableau
    selectedFiles = Array.from(selectedSet);
}

/**
 * 📌 Fonction principale
 */
async function start() {
    // Générer la liste complète des éléments pour l'arborescence
    const allItems = listFilesRecursive(DIRECTORY_PATH);

    if (isInteractiveMode) {
        await selectFilesInteractive();
    } else {
        // Mode automatique : inclure tous les fichiers non ignorés
        selectedFiles = allItems
            .filter(item => !item.isDirectory)
            .map(item => item.fullPath);
    }

    // Générer l'arborescence complète
    let output = `${chalk.green.bold("📁 Arborescence du projet")}\n\n`;
    output += getDirectoryTree(DIRECTORY_PATH, allItems);
    output += `\n${chalk.green.bold("📄 Contenu des fichiers")}\n\n`;
    output += getFileContents();

    // Supprimer les couleurs avant d'écrire dans le fichier
    output = stripAnsi(output);

    fs.writeFileSync(OUTPUT_FILE, output, "utf8");
    console.log(chalk.green(`✅ Fichier "${OUTPUT_FILE}" généré avec succès !`));
}

/**
 * 📌 Fonction récursive pour générer l'arborescence
 */
function getDirectoryTree(dirPath, allItems, prefix = "") {
    let result = "";
    const items = fs.readdirSync(dirPath, { withFileTypes: true }).sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
    });

    items.forEach((item, index) => {
        const itemPath = path.join(dirPath, item.name);
        const relativePath = path.relative(DIRECTORY_PATH, itemPath);

        if (defaultIgnoredFolders.includes(item.name) || defaultIgnoredFiles.includes(item.name)) return;

        const isLast = index === items.length - 1;
        const connector = isLast ? chalk.yellow("└── ") : chalk.yellow("├── ");
        const branch = isLast ? "    " : "│   ";

        if (item.isDirectory()) {
            result += `${prefix}${connector}${chalk.blue.bold(item.name)}\n`;
            result += getDirectoryTree(itemPath, allItems, prefix + branch);
        } else {
            const isBinary = isBinaryFile(item.name);
            result += `${prefix}${connector}${isBinary ? chalk.red(item.name) : chalk.white(item.name)}\n`;
        }
    });

    return result;
}

/**
 * 📌 Vérifie si un fichier est binaire en fonction de son extension
 */
function isBinaryFile(filename) {
    return binaryFileExtensions.includes(path.extname(filename).toLowerCase());
}

/**
 * 📌 Fonction pour lire le contenu des fichiers sélectionnés
 */
function getFileContents() {
    let result = "";

    selectedFiles.forEach(filePath => {
        const relativePath = path.relative(DIRECTORY_PATH, filePath);

        if (isBinaryFile(filePath)) {
            result += `${chalk.red(relativePath)}:\n\`\`\`\n${chalk.gray("[CONTENU NON AFFICHÉ - FICHIER BINAIRE]")}\n\`\`\`\n\n`;
        } else {
            try {
                const content = fs.readFileSync(filePath, "utf8");
                result += `${chalk.cyan(relativePath)}:\n\`\`\`\n${content}\n\`\`\`\n\n`;
            } catch (error) {
                result += `${chalk.red(relativePath)}:\n\`\`\`\n${chalk.red("Erreur de lecture")}\n\`\`\`\n\n`;
            }
        }
    });

    return result;
}

// 📌 Lancer le script
start();

/**
 * 📌 Exemples d'utilisation de la commande :
 *
 * 1️⃣ Mode automatique (avec exclusions par défaut) :
 *    ➤ node index.js
 *
 * 2️⃣ Mode interactif (choisir les fichiers manuellement) :
 *    ➤ node index.js --select
 *
 * 3️⃣ Ignorer des dossiers spécifiques :
 *    ➤ node index.js cache logs
 *
 * 4️⃣ Mode interactif + ignorer des dossiers :
 *    ➤ node index.js --select cache logs
 *
 */
