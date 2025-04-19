import React, { useState } from 'react';
import {
  X,
  ChevronLeft,
  Palette,
  Download,
  RotateCcw,
  ZoomIn,
  Move,
  Hand,
} from 'lucide-react';

interface NavigationGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const NavigationGuide: React.FC<NavigationGuideProps> = ({
  isOpen,
  onClose,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const guideSteps = [
    {
      title: '基本操作',
      content: '基本的な操作方法を説明します。\n\n推奨環境: iOS 18以上',
      icon: <Hand className="w-12 h-12 text-blue-500 mx-auto mb-4" />,
    },
    {
      title: '色の選択',
      content:
        'パレットアイコンをタップすると、\nカラーパレットが表示されます。\n季節ごとのカラーやオリジナルカラーを\n選択できます。',
      icon: <Palette className="w-12 h-12 text-blue-500 mx-auto mb-4" />,
    },
    {
      title: '拡大・縮小',
      content:
        '画面上で2本の指を広げると拡大、\n縮めると縮小できます。\n細かい部分も塗りやすくなります。',
      icon: <ZoomIn className="w-12 h-12 text-blue-500 mx-auto mb-4" />,
    },
    {
      title: '移動',
      content:
        '拡大した状態で1本の指でドラッグすると、\nキャンバスを移動できます。\n画面の端まで見ることができます。',
      icon: <Move className="w-12 h-12 text-blue-500 mx-auto mb-4" />,
    },
    {
      title: '元に戻す・やり直し',
      content:
        '左上の矢印ボタンで操作を元に戻したり、\nやり直したりできます。\n間違えても安心です。',
      icon: <ChevronLeft className="w-12 h-12 text-blue-500 mx-auto mb-4" />,
    },
    {
      title: 'リセット',
      content:
        '左上の回転矢印ボタンをタップすると、\n塗り絵を最初の状態に戻すことができます。',
      icon: <RotateCcw className="w-12 h-12 text-blue-500 mx-auto mb-4" />,
    },
    {
      title: '保存',
      content:
        '右上のダウンロードボタンをタップすると、\n完成した塗り絵を保存できます。\n友達にシェアしましょう！',
      icon: <Download className="w-12 h-12 text-blue-500 mx-auto mb-4" />,
    },
  ];

  const nextStep = () => {
    if (currentStep < guideSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-lg w-full max-w-md p-6 relative"
        style={{ height: '420px' }}
      >
        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-2 rounded-full hover:bg-gray-100"
          aria-label="閉じる"
        >
          <X className="w-5 h-5" />
        </button>

        {/* プログレスバー */}
        <div className="w-full h-1 bg-gray-200 rounded-full mb-6 mt-6">
          <div
            className="h-1 bg-blue-500 rounded-full transition-all duration-300"
            style={{
              width: `${(currentStep / (guideSteps.length - 1)) * 100}%`,
            }}
          ></div>
        </div>

        {/* ガイド内容 - 固定高さのコンテナ */}
        <div className="text-center py-4" style={{ height: '280px' }}>
          {guideSteps[currentStep].icon}
          <h3 className="text-xl font-bold mb-4">
            {guideSteps[currentStep].title}
          </h3>
          <p
            className="text-gray-600 whitespace-pre-line leading-relaxed"
            style={{ height: '120px', overflow: 'auto' }}
          >
            {guideSteps[currentStep].content}
          </p>
        </div>

        {/* ナビゲーションボタン */}
        <div className="flex justify-between absolute bottom-6 left-6 right-6">
          <button
            onClick={prevStep}
            className={`px-4 py-2 rounded-lg ${
              currentStep === 0
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-blue-500'
            }`}
            disabled={currentStep === 0}
          >
            前へ
          </button>
          <button
            onClick={nextStep}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg"
          >
            {currentStep === guideSteps.length - 1 ? '完了' : '次へ'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NavigationGuide;
