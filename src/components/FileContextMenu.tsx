import { File, FolderOpen, Edit2, Trash2 } from 'lucide-react';

interface FileContextMenuProps {
  path: string;
  isDirectory: boolean;
  onCreateFile: (path: string) => void;
  onCreateDirectory: (path: string) => void;
  onRename: (path: string) => void;
  onDelete: (path: string) => void;
  onMove: (oldPath: string, newPath: string) => void;  // Ajout de cette ligne
  onCopy: (sourcePath: string, destPath: string) => void;  // Ajout de cette ligne
  position: { x: number; y: number };
}


export function FileContextMenu({
  path,
  isDirectory,
  onCreateFile,
  onCreateDirectory,
  onRename,
  onDelete,
  position
}: FileContextMenuProps) {
  return (
    <div
      className="fixed z-50 w-56 bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-1"
      style={{ top: position.y, left: position.x }}
    >
      {isDirectory && (
        <>
          <button
            className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
            onClick={() => onCreateFile(`${path}/nouveau-fichier.txt`)}
          >
            <File size={16} className="mr-2" />
            Nouveau fichier
          </button>
          <button
            className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
            onClick={() => onCreateDirectory(`${path}/nouveau-dossier`)}
          >
            <FolderOpen size={16} className="mr-2" />
            Nouveau dossier
          </button>
          <div className="border-t border-gray-700 my-1" />
        </>
      )}
      <button
        className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
        onClick={() => onRename(path)}
      >
        <Edit2 size={16} className="mr-2" />
        Renommer
      </button>
      <button
        className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
        onClick={() => onDelete(path)}
      >
        <Trash2 size={16} className="mr-2" />
        Supprimer
      </button>
    </div>
  );
}