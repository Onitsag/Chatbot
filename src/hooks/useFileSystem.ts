import { useState, useEffect, useCallback } from 'react';

// Types pour l'API File System Access
interface FileSystemDirectoryHandle {
  kind: 'directory';
  name: string;
  values: () => AsyncIterableIterator<FileSystemHandle>;
  getDirectoryHandle: (name: string, options?: { create?: boolean }) => Promise<FileSystemDirectoryHandle>;
  getFileHandle: (name: string, options?: { create?: boolean }) => Promise<FileSystemFileHandle>;
  removeEntry: (name: string, options?: { recursive?: boolean }) => Promise<void>;
}

interface FileSystemFileHandle {
  kind: 'file';
  name: string;
  getFile: () => Promise<File>;
  createWritable: () => Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream extends WritableStream {
  write: (content: string) => Promise<void>;
  close: () => Promise<void>;
}

type FileSystemHandle = FileSystemDirectoryHandle | FileSystemFileHandle;

// Déclaration des APIs manquantes
declare global {
  interface Window {
    showDirectoryPicker: (options?: {
      mode?: 'read' | 'readwrite'
    }) => Promise<FileSystemDirectoryHandle>;
  }
  interface Navigator {
    standalone?: boolean;
  }
}

interface FileSystemState {
  isPWA: boolean;
  hasFileSystemAccess: boolean;
  fileTree: any;
  isLoading: boolean;
  rootDirectory: string;
  fileStats: Record<string, { size: number; lastModified: number; type: string }>;
  searchResults: string[];
  requestFileSystemAccess: () => Promise<void>;
  readFileContent: (path: string) => Promise<string>;
  writeFileContent: (path: string, content: string) => Promise<void>;
  createFile: (path: string, content?: string) => Promise<void>;
  createDirectory: (path: string) => Promise<void>;
  deleteEntry: (path: string) => Promise<void>;
  renameEntry: (oldPath: string, newPath: string) => Promise<void>;
  refreshFileTree: () => Promise<void>;
  watchFileChanges: (callback: (path: string) => void) => () => void;
  searchFiles: (query: string) => Promise<void>;
  getFileStats: (path: string) => Promise<{ size: number; lastModified: number; type: string }>;
  moveEntry: (oldPath: string, newPath: string) => Promise<void>;
  copyEntry: (sourcePath: string, destPath: string) => Promise<void>;
  getGitIgnoredFiles: () => Promise<Set<string>>;
}

const REFRESH_INTERVAL = 1000; // 1 seconde
const LOCAL_STORAGE_KEY = 'projectDirectoryHandles';

export function useFileSystem(): FileSystemState {
  const [isPWA, setIsPWA] = useState(false);
  const [hasFileSystemAccess, setHasFileSystemAccess] = useState(false);
  const [fileTree, setFileTree] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [rootDirectory, setRootDirectory] = useState<string>('');
  const [fileWatcher, setFileWatcher] = useState<number | null>(null);
  const [fileStats, setFileStats] = useState<Record<string, { size: number; lastModified: number; type: string }>>({});
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [gitIgnoredFiles, setGitIgnoredFiles] = useState<Set<string>>(new Set());

  // Vérifier si l'application est en mode PWA
  useEffect(() => {
    const isPWACheck = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator).standalone ||
      document.referrer.includes('android-app://');
    setIsPWA(isPWACheck);
  }, []);

  // Restaurer le handle du dossier au démarrage
  useEffect(() => {
    const restoreDirectoryHandle = async () => {
      try {
        const savedHandles = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
        if (savedHandles[window.location.pathname]) {
          const handle = savedHandles[window.location.pathname];
          const permissionState = await handle.queryPermission({ mode: 'readwrite' });
          if (permissionState === 'granted') {
            setDirectoryHandle(handle);
            setHasFileSystemAccess(true);
            setRootDirectory(handle.name);
            const tree = await buildFileTree(handle);
            setFileTree(tree);
            await loadGitIgnore(handle);
            await updateAllFileStats(handle);
          }
        }
      } catch (error) {
        console.error('Erreur lors de la restauration du handle:', error);
      }
    };

    restoreDirectoryHandle();
  }, []);

  // Construire l'arborescence des fichiers
  const buildFileTree = async (handle: FileSystemDirectoryHandle, path: string = ''): Promise<any> => {
    const tree: any = {};
    
    for await (const entry of handle.values()) {
      const entryPath = path ? `${path}/${entry.name}` : entry.name;
      
      // Ignorer les fichiers/dossiers dans .gitignore
      if (gitIgnoredFiles.has(entryPath)) continue;
      
      if (entry.kind === 'directory') {
        const dirHandle = await handle.getDirectoryHandle(entry.name);
        tree[entry.name] = await buildFileTree(dirHandle, entryPath);
      } else {
        tree[entry.name] = entryPath;
      }
    }
    
    return tree;
  };

  // Charger et parser le .gitignore
  const loadGitIgnore = async (handle: FileSystemDirectoryHandle) => {
    try {
      const gitignoreHandle = await handle.getFileHandle('.gitignore');
      const file = await gitignoreHandle.getFile();
      const content = await file.text();
      
      const patterns = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
      
      const ignored = new Set<string>();
      // TODO: Implémenter la logique de matching des patterns gitignore
      setGitIgnoredFiles(ignored);
    } catch {
      // Pas de .gitignore, c'est ok
      setGitIgnoredFiles(new Set());
    }
  };

  // Mettre à jour les stats de tous les fichiers
  const updateAllFileStats = async (handle: FileSystemDirectoryHandle, path: string = '') => {
    const stats: Record<string, { size: number; lastModified: number; type: string }> = {};
    
    const processEntry = async (entry: FileSystemHandle, entryPath: string) => {
      if (entry.kind === 'file') {
        const file = await (entry as FileSystemFileHandle).getFile();
        stats[entryPath] = {
          size: file.size,
          lastModified: file.lastModified,
          type: file.type || 'text/plain'
        };
      } else {
        const dirHandle = entry as FileSystemDirectoryHandle;
        for await (const childEntry of dirHandle.values()) {
          const childPath = entryPath ? `${entryPath}/${childEntry.name}` : childEntry.name;
          await processEntry(childEntry, childPath);
        }
      }
    };
    
    await processEntry(handle, path);
    setFileStats(stats);
  };

  // Obtenir les stats d'un fichier
  const getFileStats = async (path: string) => {
    const handle = await getHandleFromPath(path);
    if (handle.kind !== 'file') {
      throw new Error('Ce n\'est pas un fichier');
    }
    const file = await handle.getFile();
    return {
      size: file.size,
      lastModified: file.lastModified,
      type: file.type || 'text/plain'
    };
  };

  // Rechercher des fichiers
  const searchFiles = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const results: string[] = [];
    const searchTerm = query.toLowerCase();
    
    const searchInDirectory = async (handle: FileSystemDirectoryHandle, path: string = '') => {
      for await (const entry of handle.values()) {
        const entryPath = path ? `${path}/${entry.name}` : entry.name;
        
        if (gitIgnoredFiles.has(entryPath)) continue;
        
        if (entry.name.toLowerCase().includes(searchTerm)) {
          results.push(entryPath);
        }
        
        if (entry.kind === 'directory') {
          const dirHandle = await handle.getDirectoryHandle(entry.name);
          await searchInDirectory(dirHandle, entryPath);
        }
      }
    };
    
    if (directoryHandle) {
      await searchInDirectory(directoryHandle);
    }
    
    setSearchResults(results);
  };

  // Copier un fichier ou dossier
  const copyEntry = async (sourcePath: string, destPath: string) => {
    const sourceHandle = await getHandleFromPath(sourcePath);
    
    if (sourceHandle.kind === 'file') {
      const content = await readFileContent(sourcePath);
      await createFile(destPath, content);
    } else {
      // Pour un dossier, copier récursivement
      const copyDirectory = async (
        sourceHandle: FileSystemDirectoryHandle,
        targetPath: string
      ) => {
        await createDirectory(targetPath);
        
        for await (const entry of sourceHandle.values()) {
          const newPath = `${targetPath}/${entry.name}`;
          
          if (entry.kind === 'file') {
            const fileHandle = await sourceHandle.getFileHandle(entry.name);
            const content = await (await fileHandle.getFile()).text();
            await createFile(newPath, content);
          } else {
            const dirHandle = await sourceHandle.getDirectoryHandle(entry.name);
            await copyDirectory(dirHandle, newPath);
          }
        }
      };

      await copyDirectory(sourceHandle as FileSystemDirectoryHandle, destPath);
    }
  };

  // Déplacer un fichier ou dossier
  const moveEntry = async (oldPath: string, newPath: string) => {
    await copyEntry(oldPath, newPath);
    await deleteEntry(oldPath);
  };

  // Obtenir un handle à partir d'un chemin
  const getHandleFromPath = async (path: string): Promise<FileSystemHandle> => {
    if (!directoryHandle) throw new Error('Pas d\'accès au système de fichiers');

    const parts = path.split('/').filter(Boolean);
    let currentHandle: FileSystemHandle = directoryHandle;

    for (const part of parts) {
      if (currentHandle.kind !== 'directory') {
        throw new Error('Chemin invalide');
      }
      const isLastPart = part === parts[parts.length - 1];
      if (isLastPart) {
        try {
          currentHandle = await (currentHandle as FileSystemDirectoryHandle).getFileHandle(part);
        } catch {
          currentHandle = await (currentHandle as FileSystemDirectoryHandle).getDirectoryHandle(part);
        }
      } else {
        currentHandle = await (currentHandle as FileSystemDirectoryHandle).getDirectoryHandle(part);
      }
    }

    return currentHandle;
  };

  // Lire le contenu d'un fichier
  const readFileContent = async (path: string): Promise<string> => {
    const handle = await getHandleFromPath(path);
    if (handle.kind !== 'file') {
      throw new Error('Ce n\'est pas un fichier');
    }
    const file = await handle.getFile();
    return await file.text();
  };

  // Écrire dans un fichier
  const writeFileContent = async (path: string, content: string): Promise<void> => {
    const handle = await getHandleFromPath(path);
    if (handle.kind !== 'file') {
      throw new Error('Ce n\'est pas un fichier');
    }
    const writable = await (handle as FileSystemFileHandle).createWritable();
    await writable.write(content);
    await writable.close();
    await refreshFileTree();
    await updateAllFileStats(directoryHandle!);
  };

  // Créer un nouveau fichier
  const createFile = async (path: string, content: string = ''): Promise<void> => {
    if (!directoryHandle) throw new Error('Pas d\'accès au système de fichiers');

    const parts = path.split('/');
    const fileName = parts.pop()!;
    let currentHandle: FileSystemDirectoryHandle = directoryHandle;

    // Créer les dossiers parents si nécessaire
    for (const part of parts) {
      if (part) {
        currentHandle = await currentHandle.getDirectoryHandle(part, { create: true });
      }
    }

    const fileHandle = await currentHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
    await refreshFileTree();
    await updateAllFileStats(directoryHandle);
  };

  // Créer un nouveau dossier
  const createDirectory = async (path: string): Promise<void> => {
    if (!directoryHandle) throw new Error('Pas d\'accès au système de fichiers');

    const parts = path.split('/');
    let currentHandle: FileSystemDirectoryHandle = directoryHandle;

    for (const part of parts) {
      if (part) {
        currentHandle = await currentHandle.getDirectoryHandle(part, { create: true });
      }
    }

    await refreshFileTree();
    await updateAllFileStats(directoryHandle);
  };

  // Supprimer un fichier ou dossier
  const deleteEntry = async (path: string): Promise<void> => {
    if (!directoryHandle) throw new Error('Pas d\'accès au système de fichiers');

    const parts = path.split('/');
    const name = parts.pop()!;
    let currentHandle: FileSystemDirectoryHandle = directoryHandle;

    for (const part of parts) {
      if (part) {
        currentHandle = await currentHandle.getDirectoryHandle(part);
      }
    }

    await currentHandle.removeEntry(name, { recursive: true });
    await refreshFileTree();
    await updateAllFileStats(directoryHandle);
  };

  // Renommer un fichier ou dossier
  const renameEntry = async (oldPath: string, newPath: string): Promise<void> => {
    await copyEntry(oldPath, newPath);
    await deleteEntry(oldPath);
    await refreshFileTree();
    await updateAllFileStats(directoryHandle!);
  };

  // Rafraîchir l'arborescence
  const refreshFileTree = async () => {
    if (!directoryHandle) return;
    const tree = await buildFileTree(directoryHandle);
    setFileTree(tree);
  };

  // Observer les changements de fichiers
  const watchFileChanges = useCallback((callback: (path: string) => void) => {
    if (fileWatcher) {
      clearInterval(fileWatcher);
    }

    const watcherId = window.setInterval(async () => {
      if (!directoryHandle) return;
      
      try {
        const newTree = await buildFileTree(directoryHandle);
        const stringifiedOldTree = JSON.stringify(fileTree);
        const stringifiedNewTree = JSON.stringify(newTree);
        
        if (stringifiedOldTree !== stringifiedNewTree) {
          setFileTree(newTree);
          await updateAllFileStats(directoryHandle);
          callback(rootDirectory);
        }
      } catch (error) {
        console.error('Erreur lors de la surveillance des fichiers:', error);
      }
    }, REFRESH_INTERVAL);

    setFileWatcher(watcherId);

    return () => {
      if (watcherId) {
        clearInterval(watcherId);
      }
    };
  }, [directoryHandle, fileTree, rootDirectory]);

  // Demander l'accès au système de fichiers
  const requestFileSystemAccess = async () => {
    try {
      setIsLoading(true);
      
      const handle = await window.showDirectoryPicker({
        mode: 'readwrite'
      });
      
      setDirectoryHandle(handle);
      setHasFileSystemAccess(true);
      setRootDirectory(handle.name);
      
      // Sauvegarder le handle pour ce projet
      const savedHandles = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
      savedHandles[window.location.pathname] = handle;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(savedHandles));
      
      const tree = await buildFileTree(handle);
      setFileTree(tree);
      await loadGitIgnore(handle);
      await updateAllFileStats(handle);
    } catch (error) {
      console.error('Erreur lors de la demande d\'accès aux fichiers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Nettoyer le watcher quand le composant est démonté
  useEffect(() => {
    return () => {
      if (fileWatcher) {
        clearInterval(fileWatcher);
      }
    };
  }, [fileWatcher]);

  // Obtenir la liste des fichiers ignorés par git
  const getGitIgnoredFiles = async () => {
    return gitIgnoredFiles;
  };

  return {
    isPWA,
    hasFileSystemAccess,
    fileTree,
    isLoading,
    rootDirectory,
    fileStats,
    searchResults,
    requestFileSystemAccess,
    readFileContent,
    writeFileContent,
    createFile,
    createDirectory,
    deleteEntry,
    renameEntry,
    refreshFileTree,
    watchFileChanges,
    searchFiles,
    getFileStats,
    moveEntry,
    copyEntry,
    getGitIgnoredFiles
  };
}