import React, { useRef, useEffect, useState } from 'react';
import { X, Camera } from 'lucide-react';

interface WebcamCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export function WebcamCapture({ onCapture, onClose }: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function startVideo() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (err: any) {
        setError('Impossible d\'accéder à la webcam');
        console.error(err);
      }
    }
    startVideo();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        if (blob) {
          const file = new File([blob], 'webcam.png', { type: 'image/png' });
          onCapture(file);
          onClose();
        }
      }, 'image/png');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 p-4 rounded-lg relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-white">
          <X size={20} />
        </button>
        {error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          <>
            <video ref={videoRef} className="w-full max-w-md rounded" autoPlay muted />
            <canvas ref={canvasRef} className="hidden" />
            <div className="mt-4 flex justify-center">
              <button
                onClick={handleCapture}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 transition-colors"
              >
                <Camera size={20} />
                Prendre la photo
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
