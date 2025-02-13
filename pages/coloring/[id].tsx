// pages/coloring/[id].tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import { Eraser, Paintbrush, PaintBucket, Undo } from 'lucide-react';

type Tool = 'brush' | 'eraser' | 'fill';

export default function ColoringPage() {
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<Tool>('brush');
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [scale, setScale] = useState(1); // 拡大・縮小倍率
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const lastTouchDistanceRef = useRef(0); // 最後のタッチ間の距離

  // キャンバスの状態を履歴に保存
  const saveState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), imageData]);
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  // 元に戻す機能
  const undo = useCallback(() => {
    if (historyIndex <= 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const previousState = history[historyIndex - 1];
    ctx.putImageData(previousState, 0, 0);
    setHistoryIndex((prev) => prev - 1);
  }, [history, historyIndex]);

  // 塗りつぶし機能
  const floodFill = useCallback(
    (startX: number, startY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;

      // クリック位置の色を取得
      const startPos = (startY * canvas.width + startX) * 4;
      const startR = pixels[startPos];
      const startG = pixels[startPos + 1];
      const startB = pixels[startPos + 2];
      // const startA = pixels[startPos + 3];

      // 新しい色をRGBA形式に変換
      const fillColor = {
        r: parseInt(color.slice(1, 3), 16),
        g: parseInt(color.slice(3, 5), 16),
        b: parseInt(color.slice(5, 7), 16),
        a: 255,
      };

      // 塗りつぶし処理
      const stack = [[startX, startY]];
      const tolerance = 10; // 色の許容差

      while (stack.length > 0) {
        const [x, y] = stack.pop()!;
        const pos = (y * canvas.width + x) * 4;

        if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue;
        if (pixels[pos + 3] === 0) continue; // 透明部分はスキップ

        const r = pixels[pos];
        const g = pixels[pos + 1];
        const b = pixels[pos + 2];

        // 現在のピクセルが開始位置の色と近似しているかチェック
        if (
          Math.abs(r - startR) <= tolerance &&
          Math.abs(g - startG) <= tolerance &&
          Math.abs(b - startB) <= tolerance &&
          !(
            pixels[pos] === fillColor.r &&
            pixels[pos + 1] === fillColor.g &&
            pixels[pos + 2] === fillColor.b
          )
        ) {
          pixels[pos] = fillColor.r;
          pixels[pos + 1] = fillColor.g;
          pixels[pos + 2] = fillColor.b;
          pixels[pos + 3] = fillColor.a;

          stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }
      }

      ctx.putImageData(imageData, 0, 0);
      saveState();
    },
    [color, saveState],
  );

  const getCoordinates = (event: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in event) {
      x = event.touches[0].clientX - rect.left;
      y = event.touches[0].clientY - rect.top;
    } else {
      x = event.clientX - rect.left;
      y = event.clientY - rect.top;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: Math.floor(x * scaleX),
      y: Math.floor(y * scaleY),
    };
  };

  const startDrawing = (event: React.TouchEvent | React.MouseEvent) => {
    event.preventDefault();
    const coords = getCoordinates(event);
    if (!coords) return;

    if (tool === 'fill') {
      floodFill(coords.x, coords.y);
      return;
    }

    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (event: React.TouchEvent | React.MouseEvent) => {
    event.preventDefault();
    if (!isDrawing || tool === 'fill') return;

    const coords = getCoordinates(event);
    if (!coords) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      saveState();
    }
    setIsDrawing(false);
  };

  const saveImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'colored-image.png';
    link.href = dataUrl;
    link.click();
  };

  // 初期画像の読み込み時に最初の状態を保存
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = '/ten.jpg';

    img.onload = () => {
      const maxWidth = Math.min(window.innerWidth - 40, 800);
      const scale = maxWidth / img.width;

      canvas.width = maxWidth;
      canvas.height = img.height * scale;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // 初期状態を履歴に保存
      const initialState = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory([initialState]);
      setHistoryIndex(0);
    };
  }, []);

  const handlePinchZoomStart = (event: React.TouchEvent) => {
    if (event.touches.length === 2) {
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      lastTouchDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
    }
  };

  const handlePinchZoomMove = (event: React.TouchEvent) => {
    if (event.touches.length === 2) {
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      const touchDistance = Math.sqrt(dx * dx + dy * dy);

      const scaleChange = touchDistance / lastTouchDistanceRef.current;
      setScale((prevScale) => Math.min(Math.max(prevScale * scaleChange, 0.1), 2));

      lastTouchDistanceRef.current = touchDistance;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-4">
      <Head>
        <title>ぬりえアプリ</title>
        {/* <meta name="description" content={`${imageData.title}のぬりえページ`} /> */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
      </Head>

      <div className="max-w-xl mx-auto px-4">
        {/* <h1 className="text-2xl font-bold mb-4">{imageData.title}</h1> */}

        <div className="bg-white rounded-lg shadow-lg p-4">
          <div className="mb-4 flex flex-wrap gap-4 items-center">
            <div className="flex gap-2">
              <button
                onClick={() => setTool('brush')}
                className={`p-2 rounded ${tool === 'brush' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                title="ブラシ"
              >
                <Paintbrush size={24} />
              </button>
              <button
                onClick={() => setTool('eraser')}
                className={`p-2 rounded ${tool === 'eraser' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                title="消しゴム"
              >
                <Eraser size={24} />
              </button>
              <button
                onClick={() => setTool('fill')}
                className={`p-2 rounded ${tool === 'fill' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                title="塗りつぶし"
              >
                <PaintBucket size={24} />
              </button>
              <button
                onClick={undo}
                disabled={historyIndex <= 0}
                className={`p-2 rounded ${
                  historyIndex <= 0
                    ? 'bg-gray-100 text-gray-400'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
                title="元に戻す"
              >
                <Undo size={24} />
              </button>

              {/* <div className="mt-4">
              <label className="text-sm">拡大・縮小</label>
              <input
                type="range"
                min="0.1"
                max="2"
                step="0.1"
                value={scale}
                onChange={handleZoomChange}
                className="w-full"
              />
            </div> */}
            </div>

            <div className="flex items-center gap-4">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-16 h-8"
                title="色を選択"
              />
              <div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-32"
                  title="ブラシサイズ"
                />
              </div>
            </div>
          </div>


          <div
            ref={canvasWrapperRef}
            className="relative w-full overflow-hidden"
            onTouchStart={handlePinchZoomStart}
            onTouchMove={handlePinchZoomMove}
          >
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseOut={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="border border-gray-300 rounded-lg w-full touch-none"
              style={{
                transform: `scale(${scale})`, // 拡大・縮小倍率を反映
                transformOrigin: 'top left', // 拡大縮小時に左上を基準にする
              }}
            />
          </div>

          <button
            onClick={saveImage}
            className="mt-4 w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            保存する
          </button>
        </div>
      </div>
    </div>
  );
}
