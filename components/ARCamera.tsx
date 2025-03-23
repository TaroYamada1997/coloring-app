import Image from 'next/image';
import React, { useEffect, useRef, useState } from 'react';

interface ARCameraProps {
  canvasImage: string;
}

export default function ARCamera({ canvasImage }: ARCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>('');
  const [imagePosition, setImagePosition] = useState({
    x: 50,
    y: 50,
    scale: 1,
  });

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError(
        'カメラの起動に失敗しました。カメラへのアクセスを許可してください。',
      );
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const moveImage = (direction: 'up' | 'down' | 'left' | 'right') => {
    const MOVE_STEP = 10;
    setImagePosition((prev) => {
      const updates = {
        up: { y: prev.y - MOVE_STEP },
        down: { y: prev.y + MOVE_STEP },
        left: { x: prev.x - MOVE_STEP },
        right: { x: prev.x + MOVE_STEP },
      };
      return {
        ...prev,
        ...updates[direction],
      };
    });
  };

  return (
    <div className="fixed inset-0 bg-black">
      <div className="relative w-full h-full">
        {error && (
          <div className="absolute top-4 left-4 right-4 z-50 bg-red-500 text-white p-4 rounded">
            {error}
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        <Image
          src={canvasImage}
          alt="Colored Image"
          style={{
            position: 'absolute',
            left: `${imagePosition.x}px`,
            top: `${imagePosition.y}px`,
            transform: `scale(${imagePosition.scale})`,
            width: '200px',
            height: 'auto',
          }}
        />

        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2">
          <button
            onClick={() => moveImage('up')}
            className="bg-white p-2 rounded-full shadow-lg"
          >
            ↑
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => moveImage('left')}
              className="bg-white p-2 rounded-full shadow-lg"
            >
              ←
            </button>
            <button
              onClick={() => moveImage('right')}
              className="bg-white p-2 rounded-full shadow-lg"
            >
              →
            </button>
          </div>
          <button
            onClick={() => moveImage('down')}
            className="bg-white p-2 rounded-full shadow-lg"
          >
            ↓
          </button>
        </div>

        <button
          onClick={() =>
            setImagePosition((prev) => ({
              ...prev,
              scale: prev.scale + 0.1,
            }))
          }
          className="absolute top-4 right-16 bg-white p-2 rounded-full shadow-lg"
        >
          +
        </button>
        <button
          onClick={() =>
            setImagePosition((prev) => ({
              ...prev,
              scale: Math.max(0.1, prev.scale - 0.1),
            }))
          }
          className="absolute top-4 right-4 bg-white p-2 rounded-full shadow-lg"
        >
          -
        </button>
      </div>
    </div>
  );
}
