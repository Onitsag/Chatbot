import React, { useEffect, useState, useRef } from 'react';
import { X, Check } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import html2canvas from 'html2canvas';
import L from 'leaflet';

// Correction des icônes par défaut de Leaflet
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
});

interface MapCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

const DEFAULT_POSITION: LatLngExpression = [46.603354, 1.888333]; // Centre de la France

// Composant pour mettre à jour la vue de la carte
function SetMapView({ position, zoom }: { position: LatLngExpression; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(position, zoom);
  }, [position, zoom, map]);
  return null;
}

export function MapCapture({ onCapture, onClose }: MapCaptureProps) {
  const [position, setPosition] = useState<LatLngExpression>(DEFAULT_POSITION);
  const [zoom, setZoom] = useState(13);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition([pos.coords.latitude, pos.coords.longitude]);
          setZoom(16); // Zoom plus important pour se rapprocher
          setLoading(false);
        },
        (err) => {
          console.error("Erreur de géolocalisation :", err);
          setError("Impossible de récupérer votre position, utilisation du centre de la France.");
          setLoading(false);
        }
      );
    } else {
      setError("La géolocalisation n'est pas supportée par votre navigateur.");
      setLoading(false);
    }
  }, []);

  // Capture de la carte via html2canvas avec options CORS
  const handleCapture = async () => {
    if (mapRef.current) {
      try {
        const canvas = await html2canvas(mapRef.current, { useCORS: true, allowTaint: false });
        canvas.toBlob(blob => {
          if (blob) {
            const file = new File([blob], 'map.png', { type: 'image/png' });
            onCapture(file);
            onClose();
          }
        }, 'image/png');
      } catch (err) {
        console.error("Erreur lors de la capture de la carte :", err);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 p-4 rounded-lg relative w-full max-w-2xl">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-white">
          <X size={20} />
        </button>
        <h2 className="text-xl text-white mb-4">Sélectionnez une zone sur la carte</h2>
        {loading ? (
          <div className="text-white">Chargement de la carte...</div>
        ) : (
          <div ref={mapRef} className="h-96 w-full">
            <MapContainer center={position} zoom={zoom} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution="&copy; <a href='http://osm.org/copyright'>OpenStreetMap</a> contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <SetMapView position={position} zoom={zoom} />
              <Marker position={position} />
            </MapContainer>
          </div>
        )}
        {error && <div className="text-red-500 mt-2">{error}</div>}
        <div className="mt-4 flex justify-end gap-4">
          <button
            onClick={handleCapture}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 transition-colors"
          >
            <Check size={20} />
            Valider la zone
          </button>
        </div>
      </div>
    </div>
  );
}
