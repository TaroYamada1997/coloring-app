import React, { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import { ChevronLeft, ChevronRight, RotateCcw, Download, AlertCircle, Palette } from 'lucide-react';
import { useRouter } from 'next/router';
import { COLORINGMAP } from '@/public/constants/imagePath';
import GuideDialog from '@/components/GuideDialog';
import SplashScreen from '@/components/SplashScreen';

type Tool = 'brush' | 'eraser' | 'fill' | 'pan';

// カラーパレットのカテゴリーとカラーを定義
const COLOR_CATEGORIES = {
  spring: {
    name: 'Spring',
    colors: ['#FFB6C1', '#FFC0CB', '#FF69B4', '#FF1493', '#DB7093']
  },
  summer: {
    name: 'Summer',
    colors: ['#FF5733', '#33FFF5', '#33FF57', '#F5FF33', '#FF33F5']
  },
  autumn: {
    name: 'Autumn',
    colors: ['#8B4513', '#CD853F', '#D2691E', '#B8860B', '#DAA520']
  },
  winter: {
    name: 'Winter',
    colors: ['#1E90FF', '#4682B4', '#87CEEB', '#B0C4DE', '#708090']
  },
};

export default function ColoringPage() {
  const router = useRouter();
  const { id } = router.query;
  const [color, setColor] = useState('#FF5733');
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool] = useState<Tool>('fill');
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [scale, setScale] = useState(1.7);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const lastTouchDistanceRef = useRef(0);
  const lastTouchCenterRef = useRef({ x: 0, y: 0 });
  // const [showAR, setShowAR] = useState(false);
  // const [canvasImage, setCanvasImage] = useState<string>('');
  const [isZooming, setIsZooming] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const lastPanRef = useRef({ x: 0, y: 0 });
  const [showColorPopup, setShowColorPopup] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<keyof typeof COLOR_CATEGORIES>('spring');
  const [showGuideDialog, setShowGuideDialog] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

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

  // タッチイベント用のやり直し関数
  const handleUndoTouch = (e: React.TouchEvent) => {
    e.preventDefault(); // デフォルトのタッチイベントを防止
    undo();
  };

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
      setIsPanning(true);
      panStartRef.current = {
        x: event.touches[0].clientX - lastPanRef.current.x,
        y: event.touches[0].clientY - lastPanRef.current.y
      };
    }
  };

  const handlePanMove = (event: React.TouchEvent) => {
    // パンモードまたは描画中でない場合のみパン操作を有効にする
    if (event.touches.length === 1 && (tool === 'pan' || !isDrawing) && isPanning) {
      event.preventDefault();
      const newX = event.touches[0].clientX - panStartRef.current.x;
      const newY = event.touches[0].clientY - panStartRef.current.y;
      
      // requestAnimationFrameを使用してスムーズな更新
      requestAnimationFrame(() => {
        setPan({ x: newX, y: newY });
        lastPanRef.current = { x: newX, y: newY };
      });
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
    if (event.touches.length === 2 && isZooming) {
      event.preventDefault();

      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      const touchDistance = Math.sqrt(dx * dx + dy * dy);

      const scaleChange = touchDistance / lastTouchDistanceRef.current;
      const newScale = Math.min(Math.max(scale * scaleChange, 0.5), 3);

      // requestAnimationFrameを使用してスムーズな更新
      requestAnimationFrame(() => {
        setScale(newScale);
        lastTouchDistanceRef.current = touchDistance;
      });
    } else {
      handlePanMove(event);
    }
  };

  const handlePinchZoomEnd = () => {
    setIsZooming(false);
    setIsPanning(false);
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
    // ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      saveState();
    }
    setIsDrawing(false);
  };

  const saveImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // モバイルデバイスかどうかを判定
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS && navigator.share) {
      // iOS向けの処理（Web Share API使用）
      try {
        // キャンバスをBlobに変換
        canvas.toBlob(async (blob) => {
          if (!blob) {
            throw new Error('Blob creation failed');
          }
          
          const file = new File([blob], `colored-image-${id}.png`, { type: 'image/png' });
          
          // Web Share APIを使用して共有
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: '塗り絵の保存',
              text: '写真に保存するには「写真に追加」を選択してください'
            });
          } else {
            // ファイル共有に対応していない場合は代替方法
            const dataUrl = canvas.toDataURL('image/png');
            window.open(dataUrl, '_blank');
            setTimeout(() => {
              alert('画像を長押しして「写真に保存」を選択してください。');
            }, 500);
          }
        }, 'image/png');
      } catch (error) {
        console.error('共有に失敗しました:', error);
        
        // 失敗した場合は代替方法を提案
        const dataUrl = canvas.toDataURL('image/png');
        window.open(dataUrl, '_blank');
        setTimeout(() => {
          alert('画像を長押しして「写真に保存」を選択してください。');
        }, 500);
      }
    } else {
      // その他のデバイス向け処理
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `colored-image-${id}.png`;
      link.href = dataUrl;
      link.click();
    }
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

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>塗り絵 - {id}</title>
        <meta name="description" content="オリジナルの塗り絵を楽しもう" />
      </Head>

      {/* スプラッシュ画面 */}
      {showSplash && (
        <SplashScreen 
          logoPath="/Origina-logo_tate.png" 
          onComplete={() => setShowSplash(false)} 
        />
      )}

      <div className="max-w-md mx-auto bg-white min-h-screen relative">
        {/* ヘッダーツールバー */}
        <div className="flex justify-between items-center p-3">
          <div className="flex space-x-2">
            <button className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
              <ChevronLeft className="w-6 h-6 text-gray-600" />
            </button>
            <button className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
              <ChevronRight className="w-6 h-6 text-gray-600" />
            </button>
            <button 
              onClick={undo}
              onTouchStart={handleUndoTouch}
              disabled={historyIndex <= 0}
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                historyIndex <= 0 ? 'bg-gray-200 cursor-not-allowed' : 'bg-gray-300 active:bg-gray-400'
              }`}
            >
              <RotateCcw className={`w-6 h-6 ${historyIndex <= 0 ? 'text-gray-400' : 'text-gray-600'}`} />
            </button>
          </div>
          <div className="flex flex-col space-y-2">
            <button 
              onClick={() => setShowGuideDialog(true)}
              className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center"
            >
              <AlertCircle className="w-6 h-6 text-gray-600" />
            </button>
            <button 
              onClick={saveImage}
              className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center"
            >
              <Download className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        {/* キャンバス部分 */}
        <div
          ref={canvasWrapperRef}
          className="relative w-full overflow-hidden h-[calc(80vh-180px)]"
          onTouchStart={handlePinchZoomStart}
          onTouchMove={handlePinchZoomMove}
          onTouchEnd={handlePinchZoomEnd}
          onTouchCancel={handlePinchZoomEnd}
        >
          <div 
            className="min-w-[100%]"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px)`,
              transition: isPanning || isZooming ? 'none' : 'transform 0.1s ease-out',
              willChange: 'transform'
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
              className="w-full touch-none"
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'center center',
                transition: isZooming ? 'none' : 'transform 0.1s ease-out',
                willChange: 'transform',
                imageRendering: 'pixelated'
              }}
            />
          </div>
        </div>
        
        {/* カラーパレット */}
        <div className="flex justify-center p-3 border-t">
          <button
            onClick={() => setShowColorPopup(true)}
            className="w-10 h-10 rounded-full mx-1 flex items-center justify-center bg-gray-200"
            aria-label="カラーパレットを開く"
          >
            <Palette className="w-6 h-6" />
          </button>
          
          {COLOR_CATEGORIES[currentCategory].colors.slice(0, 5).map((colorOption) => (
            <button
              key={colorOption}
              onClick={() => setColor(colorOption)}
              className={`w-10 h-10 rounded-full mx-1 transition-transform ${
                color === colorOption ? 'scale-110 ring-2 ring-gray-400' : ''
              }`}
              style={{ 
                backgroundColor: colorOption,
                border: colorOption === '#FFFFFF' ? '1px solid #ddd' : 'none'
              }}
              aria-label={`色を${colorOption}に変更`}
            />
          ))}
        </div>
        
        {/* カラーポップアップ */}
        {showColorPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center">
            <div 
              className="bg-white w-full max-w-md rounded-t-xl p-5 transform transition-transform duration-300 ease-out animate-slide-up"
              style={{ height: '60vh' }}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">カラーパレット</h3>
                <button 
                  onClick={() => setShowColorPopup(false)}
                  className="p-2 rounded-full hover:bg-gray-100"
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              
              {/* カテゴリータブ */}
              <div className="flex overflow-x-auto mb-4 pb-1 -mx-1">
                {Object.entries(COLOR_CATEGORIES).map(([key, category]) => (
                  <button
                    key={key}
                    onClick={() => setCurrentCategory(key as keyof typeof COLOR_CATEGORIES)}
                    className={`px-4 py-2 mx-1 rounded-full text-sm whitespace-nowrap transition-colors ${
                      currentCategory === key 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
              
              <div className="grid grid-cols-5 gap-4 mt-6 overflow-y-auto" style={{ maxHeight: 'calc(60vh - 120px)' }}>
                {COLOR_CATEGORIES[currentCategory].colors.map((colorOption) => (
                  <button
                    key={colorOption}
                    onClick={() => {
                      setColor(colorOption);
                      setShowColorPopup(false);
                    }}
                    className={`w-14 h-14 rounded-full mx-auto transition-transform mt-2 ${
                      color === colorOption ? 'scale-110 ring-2 ring-gray-400' : ''
                    }`}
                    style={{ 
                      backgroundColor: colorOption,
                      border: colorOption === '#FFFFFF' ? '1px solid #ddd' : 'none'
                    }}
                    aria-label={`色を${colorOption}に変更`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* ガイドダイアログ */}
        <GuideDialog 
          isOpen={showGuideDialog} 
          onClose={() => setShowGuideDialog(false)} 
        />
      </div>
    </div>
  );
}

