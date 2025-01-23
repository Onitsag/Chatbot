import { useState, useEffect, useRef } from 'react';
import { File, FolderOpen, ChevronRight, Plus, Search, FileText, Clock, HardDrive, Filter } from 'lucide-react';
import { FileContextMenu } from './FileContextMenu';
import { formatFileSize, formatDate } from '../utils/format';

interface FileTreeProps {
  tree: any;
  basePath?: string;
  onFileSelect: (path: string) => void;
  onCreateFile: (path: string) => void;
  onCreateDirectory: (path: string) => void;
  onRename: (path: string) => void;
  onDelete: (path: string) => void;
  onMove: (oldPath: string, newPath: string) => void;
  onCopy: (sourcePath: string, destPath: string) => void;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  rootDirectory?: string;
  fileStats?: Record<string, { size: number; lastModified: number; type: string }>;
  onSearch?: (query: string) => void;
  searchResults?: string[];
}

interface FileFilter {
  extension?: string;
  minSize?: number;
  maxSize?: number;
  modifiedAfter?: Date;
  modifiedBefore?: Date;
}

export function FileTree({
  tree,
  basePath = '',
  onFileSelect,
  onCreateFile,
  onCreateDirectory,
  onRename,
  onDelete,
  onMove,
  onCopy,
  expandedFolders,
  onToggleFolder,
  rootDirectory,
  fileStats,
  onSearch,
  searchResults
}: FileTreeProps) {
  const [contextMenu, setContextMenu] = useState<{
    path: string;
    isDirectory: boolean;
    position: { x: number; y: number };
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'tree' | 'recent' | 'size'>('tree');
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FileFilter>({});
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const treeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + F pour focus sur la recherche
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleContextMenu = (
    e: React.MouseEvent,
    path: string,
    isDirectory: boolean
  ) => {
    e.preventDefault();
    setContextMenu({
      path,
      isDirectory,
      position: { x: e.clientX, y: e.clientY }
    });
  };

  const handleDragStart = (e: React.DragEvent, path: string) => {
    setDraggedItem(path);
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', path);
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleDragOver = (e: React.DragEvent, path: string) => {
    e.preventDefault();
    setDropTarget(path);
    e.dataTransfer.dropEffect = e.ctrlKey || e.metaKey ? 'copy' : 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetPath: string) => {
    e.preventDefault();
    setIsDragging(false);
    setDropTarget(null);

    if (!draggedItem) return;

    const sourcePath = draggedItem;
    if (sourcePath === targetPath) return;

    if (e.ctrlKey || e.metaKey) {
      // Copier
      await onCopy(sourcePath, `${targetPath}/${sourcePath.split('/').pop()}`);
    } else {
      // Déplacer
      await onMove(sourcePath, `${targetPath}/${sourcePath.split('/').pop()}`);
    }

    setDraggedItem(null);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  };

  const handleSort = (key: 'name' | 'date' | 'size') => {
    if (sortBy === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDirection('asc');
    }
  };

  const applyFilters = (entries: [string, any][]) => {
    return entries.filter(([path]) => {
      const stats = fileStats?.[path];
      if (!stats) return true;

      if (activeFilters.extension) {
        const ext = path.split('.').pop()?.toLowerCase();
        if (ext !== activeFilters.extension.toLowerCase()) return false;
      }

      if (activeFilters.minSize && stats.size < activeFilters.minSize) return false;
      if (activeFilters.maxSize && stats.size > activeFilters.maxSize) return false;
      if (activeFilters.modifiedAfter && stats.lastModified < activeFilters.modifiedAfter.getTime()) return false;
      if (activeFilters.modifiedBefore && stats.lastModified > activeFilters.modifiedBefore.getTime()) return false;

      return true;
    });
  };

  const sortEntries = (entries: [string, any][]) => {
    return entries.sort(([pathA, valueA], [pathB, valueB]) => {
      const statsA = fileStats?.[pathA];
      const statsB = fileStats?.[pathB];
      const multiplier = sortDirection === 'asc' ? 1 : -1;

      switch (sortBy) {
        case 'date':
          return multiplier * ((statsA?.lastModified || 0) - (statsB?.lastModified || 0));
        case 'size':
          return multiplier * ((statsA?.size || 0) - (statsB?.size || 0));
        default:
          return multiplier * pathA.localeCompare(pathB);
      }
    });
  };

  const renderFilterPanel = () => (
    <div className="p-4 bg-gray-800 rounded-lg mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-300">Filtres</h3>
        <button
          onClick={() => setActiveFilters({})}
          className="text-xs text-gray-400 hover:text-white"
        >
          Réinitialiser
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Extension</label>
          <input
            type="text"
            value={activeFilters.extension || ''}
            onChange={e => setActiveFilters(prev => ({ ...prev, extension: e.target.value }))}
            placeholder="ex: js, tsx, md"
            className="w-full bg-gray-700 text-white rounded px-3 py-1 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Taille</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={activeFilters.minSize || ''}
              onChange={e => setActiveFilters(prev => ({ ...prev, minSize: Number(e.target.value) }))}
              placeholder="Min (bytes)"
              className="flex-1 bg-gray-700 text-white rounded px-3 py-1 text-sm"
            />
            <input
              type="number"
              value={activeFilters.maxSize || ''}
              onChange={e => setActiveFilters(prev => ({ ...prev, maxSize: Number(e.target.value) }))}
              placeholder="Max (bytes)"
              className="flex-1 bg-gray-700 text-white rounded px-3 py-1 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Date de modification</label>
          <div className="flex gap-2">
            <input
              type="date"
              value={activeFilters.modifiedAfter?.toISOString().split('T')[0] || ''}
              onChange={e => setActiveFilters(prev => ({ ...prev, modifiedAfter: e.target.value ? new Date(e.target.value) : undefined }))}
              className="flex-1 bg-gray-700 text-white rounded px-3 py-1 text-sm"
            />
            <input
              type="date"
              value={activeFilters.modifiedBefore?.toISOString().split('T')[0] || ''}
              onChange={e => setActiveFilters(prev => ({ ...prev, modifiedBefore: e.target.value ? new Date(e.target.value) : undefined }))}
              className="flex-1 bg-gray-700 text-white rounded px-3 py-1 text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderRecentFiles = () => {
    if (!fileStats) return null;

    const files = Object.entries(fileStats)
      .filter(([path]) => !path.split('/').pop()?.startsWith('.'))
      .sort(([, a], [, b]) => b.lastModified - a.lastModified)
      .slice(0, 20);

    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-400 mb-4">Fichiers récents</h3>
        {files.map(([path, stats]) => (
          <div
            key={path}
            className="flex items-center gap-2 p-2 hover:bg-gray-800/50 rounded-lg cursor-pointer"
            onClick={() => onFileSelect(path)}
          >
            <FileText size={16} />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-300 truncate">{path.split('/').pop()}</div>
              <div className="text-xs text-gray-500">
                {formatDate(stats.lastModified)}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderFilesBySize = () => {
    if (!fileStats) return null;

    const files = Object.entries(fileStats)
      .filter(([path]) => !path.split('/').pop()?.startsWith('.'))
      .sort(([, a], [, b]) => b.size - a.size)
      .slice(0, 20);

    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-400 mb-4">Plus gros fichiers</h3>
        {files.map(([path, stats]) => (
          <div
            key={path}
            className="flex items-center gap-2 p-2 hover:bg-gray-800/50 rounded-lg cursor-pointer"
            onClick={() => onFileSelect(path)}
          >
            <HardDrive size={16} />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-300 truncate">{path.split('/').pop()}</div>
              <div className="text-xs text-gray-500">
                {formatFileSize(stats.size)}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Afficher le dossier racine
  if (rootDirectory && !basePath) {
    return (
      <div className="select-none" ref={treeRef}>
        {/* Barre d'outils */}
        <div className="flex items-center gap-4 p-4 bg-gray-800/30 rounded-lg mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Rechercher..."
                className="w-full bg-gray-700 text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`p-2 rounded-lg ${
                Object.keys(activeFilters).length > 0 ? 'text-blue-500' : 'text-gray-400'
              } hover:bg-gray-700`}
              title="Filtres"
            >
              <Filter size={16} />
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={`p-2 rounded-lg ${
                viewMode === 'tree' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'
              }`}
              title="Vue arborescente"
            >
              <FolderOpen size={16} />
            </button>
            <button
              onClick={() => setViewMode('recent')}
              className={`p-2 rounded-lg ${
                viewMode === 'recent' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'
              }`}
              title="Fichiers récents"
            >
              <Clock size={16} />
            </button>
            <button
              onClick={() => setViewMode('size')}
              className={`p-2 rounded-lg ${
                viewMode === 'size' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'
              }`}
              title="Taille des fichiers"
            >
              <HardDrive size={16} />
            </button>
          </div>
        </div>

        {/* Panneau de filtres */}
        {showFilterPanel && renderFilterPanel()}

        {/* Contenu selon le mode de vue */}
        {viewMode === 'tree' ? (
          <>
            {/* En-tête du dossier racine */}
            <div className="flex items-center gap-2 p-2 bg-gray-800/30 rounded-lg mb-2">
              <FolderOpen size={16} className="text-blue-500" />
              <span className="text-gray-300 font-medium">{rootDirectory}</span>
              <div className="flex-1" />
              <button
                className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
                onClick={() => onCreateFile('nouveau-fichier.txt')}
                title="Nouveau fichier"
              >
                <Plus size={14} />
              </button>
            </div>

            {/* En-tête de tri */}
            <div className="flex items-center gap-4 p-2 text-xs text-gray-400">
              <button
                onClick={() => handleSort('name')}
                className={`flex items-center gap-1 ${sortBy === 'name' ? 'text-white' : ''}`}
              >
                Nom {sortBy === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </button>
              <button
                onClick={() => handleSort('date')}
                className={`flex items-center gap-1 ${sortBy === 'date' ? 'text-white' : ''}`}
              >
                Date {sortBy === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
              </button>
              <button
                onClick={() => handleSort('size')}
                className={`flex items-center gap-1 ${sortBy === 'size' ? 'text-white' : ''}`}
              >
                Taille {sortBy === 'size' && (sortDirection === 'asc' ? '↑' : '↓')}
              </button>
            </div>

            {/* Arborescence */}
            <div className="space-y-1">
              {sortEntries(applyFilters(Object.entries(tree))).map(([name, value]) => {
                const path = name;
                const isDirectory = typeof value === 'object';
                const isExpanded = expandedFolders.has(path);
                const stats = fileStats?.[path];

                return (
                  <div key={path}>
                    <div
                      className={`flex items-center gap-2 p-2 hover:bg-gray-800/50 rounded-lg cursor-pointer ${
                        dropTarget === path ? 'bg-blue-500/10 border border-blue-500/50' : ''
                      }`}
                      onClick={() => isDirectory ? onToggleFolder(path) : onFileSelect(path)}
                      onContextMenu={(e) => handleContextMenu(e, path, isDirectory)}
                      draggable
                      onDragStart={(e) => handleDragStart(e, path)}
                      onDragOver={(e) => handleDragOver(e, path)}
                      onDrop={(e) => handleDrop(e, path)}
                    >
                      {isDirectory && (
                        <ChevronRight
                          size={16}
                          className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        />
                      )}
                      {isDirectory ? (
                        <FolderOpen size={16} className="text-yellow-500" />
                      ) : (
                        <File size={16} />
                      )}
                      <span className="text-gray-300 flex-1">{name}</span>
                      {stats && !isDirectory && (
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{formatDate(stats.lastModified)}</span>
                          <span className="w-20 text-right">{formatFileSize(stats.size)}</span>
                        </div>
                      )}
                    </div>
                    {isDirectory && isExpanded && (
                      <div className="ml-4">
                        <FileTree
                          tree={value}
                          basePath={path}
                          onFileSelect={onFileSelect}
                          onCreateFile={onCreateFile}
                          onCreateDirectory={onCreateDirectory}
                          onRename={onRename}
                          onDelete={onDelete}
                          onMove={onMove}
                          onCopy={onCopy}
                          expandedFolders={expandedFolders}
                          onToggleFolder={onToggleFolder}
                          fileStats={fileStats}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : viewMode === 'recent' ? (
          renderRecentFiles()
        ) : (
          renderFilesBySize()
        )}

        {/* Menu contextuel */}
        {contextMenu && (
          <FileContextMenu
            path={contextMenu.path}
            isDirectory={contextMenu.isDirectory}
            onCreateFile={onCreateFile}
            onCreateDirectory={onCreateDirectory}
            onRename={onRename}
            onDelete={onDelete}
            onMove={onMove}
            onCopy={onCopy}
            position={contextMenu.position}
          />
        )}

        {/* Résultats de recherche */}
        {searchQuery && searchResults && (
          <div className="mt-4 p-4 bg-gray-800/30 rounded-lg">
            <h3 className="text-sm font-medium text-gray-400 mb-2">
              Résultats ({searchResults.length})
            </h3>
            <div className="space-y-2">
              {searchResults.map((path) => {
                const stats = fileStats?.[path];
                return (
                  <div
                    key={path}
                    className="flex items-center gap-2 p-2 hover:bg-gray-800/50 rounded-lg cursor-pointer"
                    onClick={() => onFileSelect(path)}
                  >
                    <File size={16} />
                    <span className="text-gray-300 flex-1">{path}</span>
                    {stats && (
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{formatDate(stats.lastModified)}</span>
                        <span>{formatFileSize(stats.size)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Afficher le reste de l'arborescence
  return (
    <div className="space-y-1">
      {sortEntries(applyFilters(Object.entries(tree))).map(([name, value]) => {
        const path = basePath ? `${basePath}/${name}` : name;
        const isDirectory = typeof value === 'object';
        const isExpanded = expandedFolders.has(path);
        const stats = fileStats?.[path];

        return (
          <div key={path}>
            <div
              className={`flex items-center gap-2 p-2 hover:bg-gray-800/50 rounded-lg cursor-pointer ${
                dropTarget === path ? 'bg-blue-500/10 border border-blue-500/50' : ''
              }`}
              onClick={() => isDirectory ? onToggleFolder(path) : onFileSelect(path)}
              onContextMenu={(e) => handleContextMenu(e, path, isDirectory)}
              draggable
              onDragStart={(e) => handleDragStart(e, path)}
              onDragOver={(e) => handleDragOver(e, path)}
              onDrop={(e) => handleDrop(e, path)}
            >
              {isDirectory && (
                <ChevronRight
                  size={16}
                  className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                />
              )}
              {isDirectory ? (
                <FolderOpen size={16} className="text-yellow-500" />
              ) : (
                <File size={16} />
              )}
              <span className="text-gray-300 flex-1">{name}</span>
              {stats && !isDirectory && (
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{formatDate(stats.lastModified)}</span>
                  <span className="w-20 text-right">{formatFileSize(stats.size)}</span>
                </div>
              )}
            </div>
            {isDirectory && isExpanded && (
              <div className="ml-4">
                <FileTree
                  tree={value}
                  basePath={path}
                  onFileSelect={onFileSelect}
                  onCreateFile={onCreateFile}
                  onCreateDirectory={onCreateDirectory}
                  onRename={onRename}
                  onDelete={onDelete}
                  onMove={onMove}
                  onCopy={onCopy}
                  expandedFolders={expandedFolders}
                  onToggleFolder={onToggleFolder}
                  fileStats={fileStats}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}