import { useState, useEffect, useRef } from 'react';
import { File, FolderOpen, ChevronRight, Search } from 'lucide-react';
import { FileContextMenu } from './FileContextMenu';

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
  selectedFiles: Set<string>;
  onFileSelectionChange: (path: string, selected: boolean, isDirectory?: boolean) => void;
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
  onSearch,
  searchResults,
  selectedFiles,
  onFileSelectionChange
}: FileTreeProps) {
  const [contextMenu, setContextMenu] = useState<{
    path: string;
    isDirectory: boolean;
    position: { x: number; y: number };
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const treeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, path: string, isDirectory: boolean) => {
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
      await onCopy(sourcePath, `${targetPath}/${sourcePath.split('/').pop()}`);
    } else {
      await onMove(sourcePath, `${targetPath}/${sourcePath.split('/').pop()}`);
    }

    setDraggedItem(null);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  };

  const renderFileEntry = (name: string, path: string) => (
    <div
      key={path}
      className={`group flex items-center px-2 py-1.5 hover:bg-gray-800/50 rounded-md cursor-pointer transition-colors ${dropTarget === path ? 'bg-blue-500/10 border border-blue-500/50' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onFileSelect(path);
      }}
      onContextMenu={(e) => handleContextMenu(e, path, false)}
    >
      <input
        type="checkbox"
        className="pointer-events-auto mr-2 h-3 w-3 rounded border-gray-500 text-blue-500 focus:ring-blue-500/50"
        checked={selectedFiles.has(path)}
        onChange={(e) => {
          e.stopPropagation();
          console.log(`Checkbox FILE (${path}) onChange:`, e.target.checked);
          onFileSelectionChange(path, e.target.checked, false);
        }}
        onClick={(e) => {
          e.stopPropagation();
          console.log(`Checkbox FILE (${path}) onClick`);
        }}
      />


      <File size={14} className="text-gray-400 flex-shrink-0 mr-2" />
      <span className="truncate text-xs text-gray-200">{name}</span>
    </div>
  );

  const renderFolderContent = (content: any, path: string) => (
    <div className="ml-4 space-y-0.5">
      {Object.entries(content).map(([childName, childValue]) => {
        const childPath = `${path}/${childName}`;
        const isDirectory = typeof childValue === 'object';
        const isChildExpanded = expandedFolders.has(childPath);

        return isDirectory
          ? renderFolderEntry(childName, childPath, childValue, isChildExpanded)
          : renderFileEntry(childName, childPath);
      })}
    </div>
  );

  const renderFolderEntry = (name: string, path: string, content: any, isExpanded: boolean) => (
    <div key={path} className="space-y-0.5">
      <div
        className={`group flex items-center px-2 py-1.5 hover:bg-gray-800/50 rounded-md cursor-pointer transition-colors ${dropTarget === path ? 'bg-blue-500/10 border border-blue-500/50' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFolder(path);
        }}
        onContextMenu={(e) => handleContextMenu(e, path, true)}
      >
        <input
          type="checkbox"
          className="pointer-events-auto mr-2 h-3 w-3 rounded border-gray-500 text-blue-500 focus:ring-blue-500/50"
          checked={selectedFiles.has(path)}
          onChange={(e) => {
            e.stopPropagation();
            console.log(`Checkbox FOLDER (${path}) onChange:`, e.target.checked);
            onFileSelectionChange(path, e.target.checked, true);
          }}
          onClick={(e) => {
            e.stopPropagation();
            console.log(`Checkbox FOLDER (${path}) onClick`);
          }}
        />



        <ChevronRight
          size={14}
          className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''} mr-1`}
        />
        <FolderOpen size={14} className="text-yellow-500 mr-2" />
        <span className="truncate text-xs text-gray-200">{name}</span>
      </div>
      {isExpanded && renderFolderContent(content, path)}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-gray-900" ref={treeRef}>
      {/* Barre de recherche */}
      <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700/50 p-3">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Rechercher... (Ctrl+F)"
            className="w-full bg-gray-800/50 text-white rounded-md pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          />
        </div>
      </div>

      {/* Titre du dossier racine */}
      {rootDirectory && (
        <div className="px-3 pt-3">
          <h2 className="text-sm font-medium text-gray-300">{rootDirectory}</h2>
        </div>
      )}

      {/* Liste des fichiers */}
      <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {searchQuery ? (
          searchResults && searchResults.length > 0 ? (
            <div className="space-y-0.5">
              {searchResults.map((path) => {
                const name = path.split('/').pop() || '';
                return renderFileEntry(name, path);
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-xs text-gray-400">
              Aucun résultat pour "{searchQuery}"
            </div>
          )
        ) : rootDirectory ? (
          <div className="space-y-0.5">
            {renderFolderContent(tree, rootDirectory)}
          </div>
        ) : (
          Object.entries(tree).map(([name, value]) => {
            const path = name;
            const isDirectory = typeof value === 'object';
            const isExpanded = expandedFolders.has(path);

            return isDirectory
              ? renderFolderEntry(name, path, value, isExpanded)
              : renderFileEntry(name, path);
          })
        )}
      </div>

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
    </div>
  );
}