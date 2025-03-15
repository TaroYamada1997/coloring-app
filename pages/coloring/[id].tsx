import React, { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import { PaintBucket, Undo, Move } from 'lucide-react';
import { useRouter } from 'next/router';
import { COLORINGMAP } from '@/public/constants/imagePath';
import ARCamera from '../components/ARCamera';
import { DEFAULT_COLORS } from '@/public/constants/colors';

type Tool = 'brush' | 'eraser' | 'fill' | 'pan';

export default function ColoringPage() {
  const router = useRouter();
  const { id } = router.query;
  const [color, setColor] = useState('#000000');
  // const [brushSize, setBrushSize] = useState(5);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<Tool>('fill');
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [scale, setScale] = useState(1.7);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const lastTouchDistanceRef = useRef(0);
  const lastTouchCenterRef = useRef({ x: 0, y: 0 });

  const [showAR, setShowAR] = useState(false);
  const [canvasImage, setCanvasImage] = useState<string>('');
  const [colorMode, setColorMode] = useState<'default' | 'palette'>('default');
  const [isZooming, setIsZooming] = useState(false);

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const lastPanRef = useRef({ x: 0, y: 0 });

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
      const startA = pixels[startPos + 3];

      // 黒い枠線の判定（RGBがすべて30未満で、アルファ値が0でない場合を枠線とみなす）
      const isOutline = (r: number, g: number, b: number, a: number) =>
        r < 30 && g < 30 && b < 30 && a > 0;

      // クリック位置が枠線の場合は処理を中止
      if (isOutline(startR, startG, startB, startA)) return;

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
        const a = pixels[pos + 3];

        // 枠線の場合はスキップ
        if (isOutline(r, g, b, a)) continue;

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

  const handlePanStart = (event: React.TouchEvent) => {
    // パンモードまたは描画中でない場合のみパン操作を有効にする
    if (event.touches.length === 1 && (tool === 'pan' || !isDrawing)) {
      event.preventDefault();
      panStartRef.current = {
        x: event.touches[0].clientX - lastPanRef.current.x,
        y: event.touches[0].clientY - lastPanRef.current.y
      };
    }
  };

  const handlePanMove = (event: React.TouchEvent) => {
    // パンモードまたは描画中でない場合のみパン操作を有効にする
    if (event.touches.length === 1 && (tool === 'pan' || !isDrawing)) {
      event.preventDefault();
      const newX = event.touches[0].clientX - panStartRef.current.x;
      const newY = event.touches[0].clientY - panStartRef.current.y;
      setPan({ x: newX, y: newY });
      lastPanRef.current = { x: newX, y: newY };
    }
  };

  // 既存のhandlePinchZoomStartを修正
  const handlePinchZoomStart = (event: React.TouchEvent) => {
    if (event.touches.length === 2) {
      event.preventDefault();
      setIsZooming(true);

      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      lastTouchDistanceRef.current = Math.sqrt(dx * dx + dy * dy);

      lastTouchCenterRef.current = {
        x: (event.touches[0].clientX + event.touches[1].clientX) / 2,
        y: (event.touches[0].clientY + event.touches[1].clientY) / 2,
      };
    } else {
      handlePanStart(event);
    }
  };

  // 既存のhandlePinchZoomMoveを修正
  const handlePinchZoomMove = (event: React.TouchEvent) => {
    if (event.touches.length === 2) {
      event.preventDefault();
      setIsZooming(true);

      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      const touchDistance = Math.sqrt(dx * dx + dy * dy);

      const scaleChange = touchDistance / lastTouchDistanceRef.current;
      const newScale = Math.min(Math.max(scale * scaleChange, 0.5), 3);

      setScale(newScale);
      lastTouchDistanceRef.current = touchDistance;
    } else {
      handlePanMove(event);
    }
  };

  const handlePinchZoomEnd = () => {
    setIsZooming(false);  // ズーム中フラグを解除
  };

  const startDrawing = (event: React.TouchEvent | React.MouseEvent) => {
    // ズーム中は描画を開始しない
    if (isZooming) return;
    
    // パンモードの場合は描画しない
    if (tool === 'pan') return;

    event.preventDefault();
    const coords = getCoordinates(event);
    if (!coords) return;

    if (tool === 'fill') {
      floodFill(coords.x, coords.y);
      return;
    }

    // ブラシまたは消しゴムモードの場合のみ描画を開始
    if (tool === 'brush' || tool === 'eraser') {
      setIsDrawing(true);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    }
  };

  const draw = (event: React.TouchEvent | React.MouseEvent) => {
    // ズーム中は描画しない
    if (isZooming) return;

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
    if (!id || typeof id !== 'string') return;

    const coloringInfo = COLORINGMAP[id as keyof typeof COLORINGMAP];
    if (!coloringInfo) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = coloringInfo.path;

    img.onload = () => {
      // 元の画像サイズを維持したまま描画
      canvas.width = img.width;
      canvas.height = img.height;

      // アンチエイリアスを無効化
      ctx.imageSmoothingEnabled = false;

      // 画像を描画
      ctx.drawImage(img, 0, 0);

      // スタイルでサイズを調整（実際のピクセルはそのまま）
      canvas.style.width = '100%';
      canvas.style.height = 'auto';

      const initialState = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory([initialState]);
      setHistoryIndex(0);
    };
  }, [id]);

  // const handleARClick = () => {
  //   const canvas = canvasRef.current;
  //   if (!canvas) return;

  //   // キャンバスの現在の状態を画像として取得
  //   const image = canvas.toDataURL('image/png');
  //   setCanvasImage(image);
  //   setShowAR(true);
  // };

  return (
    <div className="min-h-screen bg-gray-100 py-4">
      <Head>
        {id && (
          <div>
            <title>{COLORINGMAP[id as keyof typeof COLORINGMAP].title}</title>
            <meta
              name="description"
              content={`${COLORINGMAP[id as keyof typeof COLORINGMAP].title}のぬりえページ`}
            />
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
            />
          </div>
        )}
      </Head>

      <div className="max-w-xl mx-auto px-4">
        {/* <h1 className="text-2xl font-bold mb-4">{imageData.title}</h1> */}

        <div className="bg-white rounded-lg shadow-lg p-4">
          {/* カラーモード切り替えボタン */}
          <div className="flex justify-center gap-4 mb-4">
            <button
              onClick={() => setColorMode('default')}
              className={`px-4 py-2 rounded-lg ${
                colorMode === 'default'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              春色パレット
            </button>
            <button
              onClick={() => setColorMode('palette')}
              className={`px-4 py-2 rounded-lg ${
                colorMode === 'palette'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              カラーパレット
            </button>
          </div>

          {/* カラー選択部分 */}
          <div className="mb-4">
            {colorMode === 'default' ? (
              // デフォルトカラー
              <div className="flex justify-center gap-2">
                {DEFAULT_COLORS.map((colorOption) => (
                  <button
                    key={colorOption}
                    onClick={() => setColor(colorOption)}
                    className={`w-10 h-10 rounded-full border-2 transition-transform ${
                      color === colorOption
                        ? 'border-gray-600 scale-110'
                        : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: colorOption }}
                    aria-label={`色を${colorOption}に変更`}
                  />
                ))}
              </div>
            ) : (
              // カラーパレット
              <div className="flex justify-center">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-20 h-20"
                  title="カラーパレット"
                />
              </div>
            )}
          </div>

          {/* <div className="flex items-center gap-4">
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
          </div> */}

          <div className="flex justify-center gap-4 mt-4 mb-4">
            {/* <button
              onClick={() => setTool('brush')}
              className={`p-2 rounded ${
                tool === 'brush' ? 'bg-blue-100' : 'hover:bg-gray-100'
              }`}
              aria-label="ブラシツール"
            >
              <Paintbrush className="w-6 h-6" />
            </button> */}
            <button
              onClick={() => setTool('fill')}
              className={`p-2 rounded ${
                tool === 'fill' ? 'bg-blue-100' : 'hover:bg-gray-100'
              }`}
              aria-label="塗りつぶしツール"
            >
              <PaintBucket className="w-6 h-6" />
            </button>
            {/* <button
              onClick={() => setTool('eraser')}
              className={`p-2 rounded ${
                tool === 'eraser' ? 'bg-blue-100' : 'hover:bg-gray-100'
              }`}
              aria-label="消しゴムツール"
            >
              <Eraser className="w-6 h-6" />
            </button> */}
            <button
              onClick={() => setTool('pan')}
              className={`p-2 rounded ${
                tool === 'pan' ? 'bg-blue-100' : 'hover:bg-gray-100'
              }`}
              aria-label="移動ツール"
            >
              <Move className="w-6 h-6" />
            </button>
            <button
              onClick={undo}
              className="p-2 rounded hover:bg-gray-100"
              disabled={historyIndex <= 0}
              aria-label="元に戻す"
            >
              <Undo className="w-6 h-6" />
            </button>
          </div>

          <div
            ref={canvasWrapperRef}
            className="relative w-full overflow-hidden max-h-[70vh]"
            onTouchStart={handlePinchZoomStart}
            onTouchMove={handlePinchZoomMove}
            onTouchEnd={handlePinchZoomEnd}
          >
            <div 
              className="min-h-[100%] min-w-[100%]"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px)`,
                transition: isZooming ? 'none' : 'transform 0.1s ease-out',
              }}
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
                  transform: `scale(${scale})`,
                  transformOrigin: 'center center',
                  transition: isZooming ? 'none' : 'transform 0.1s ease-out',
                }}
              />
            </div>
          </div>

          <button
            onClick={saveImage}
            className="mt-4 w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            保存する
          </button>
          {/* <button
            onClick={handleARClick}
            className="mt-4 w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            カメラを起動してARで遊ぶ
          </button> */}

          {showAR && (
            <div className="fixed inset-0 z-50">
              <button
                onClick={() => setShowAR(false)}
                className="absolute top-4 right-4 z-[1001] bg-white p-2 rounded-full shadow-lg"
              >
                閉じる
              </button>
              <ARCamera canvasImage={canvasImage} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
