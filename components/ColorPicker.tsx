import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface ColorPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectColor: (color: string) => void;
  initialColor?: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({
  isOpen,
  onClose,
  onSelectColor,
  initialColor = '#FF0000',
}) => {
  const [color, setColor] = useState(initialColor);
  const [recentColors, setRecentColors] = useState<string[]>([]);

  useEffect(() => {
    // ローカルストレージから最近使用した色を取得
    const savedColors = localStorage.getItem('recentColors');
    if (savedColors) {
      setRecentColors(JSON.parse(savedColors));
    }
  }, []);

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setColor(e.target.value);
  };

  const handleSelectColor = () => {
    onSelectColor(color);

    // 最近使用した色を更新
    const updatedColors = [
      color,
      ...recentColors.filter((c) => c !== color),
    ].slice(0, 5);
    setRecentColors(updatedColors);
    localStorage.setItem('recentColors', JSON.stringify(updatedColors));

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-md p-5 transform transition-all duration-300 ease-out animate-fade-in">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">Original</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              色を選択
            </label>
            <input
              type="color"
              value={color}
              onChange={handleColorChange}
              className="w-full h-12 cursor-pointer"
            />
          </div>

          <button
            onClick={handleSelectColor}
            className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            この色を使用
          </button>
        </div>
      </div>
    </div>
  );
};

export default ColorPicker;
