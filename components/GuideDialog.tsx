import React from 'react';
import { X } from 'lucide-react';

interface GuideDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const GuideDialog: React.FC<GuideDialogProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-md p-5 transform transition-all duration-300 ease-out animate-fade-in">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">ぬりえの使い方</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-gray-700">
          <div>
            <h4 className="font-medium mb-1">塗り方</h4>
            <p>
              画面をタップして色を塗ることができます。好きな色を選択して自由に塗りましょう。
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-1">色の変更</h4>
            <p>
              下部のカラーパレットから色を選択できます。パレットボタンをタップすると、より多くの色から選べます。
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-1">画像の保存方法</h4>
            <p>
              右上のダウンロードボタンをタップすると、塗り絵を保存できます。
            </p>
            <ul className="list-disc pl-5 mt-1 text-sm">
              <li>
                iPhoneの場合：共有画面から「画像を保存」を選択。カメラロールに保存されます。
              </li>
              <li>Androidの場合：保存ボタンをタップして保存します。</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-1">操作方法</h4>
            <p>二本指で拡大縮小、一本指でスワイプして画面を移動できます。</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuideDialog;
