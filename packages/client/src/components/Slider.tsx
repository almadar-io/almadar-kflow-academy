import React from 'react';

interface SliderOption {
  label: string;
  value: string;
}

interface SliderProps {
  label: string;
  options: SliderOption[];
  value: string;
  onChange: (value: string) => void;
}

const Slider: React.FC<SliderProps> = ({ label, options, value, onChange }) => {
  const currentIndex = options.findIndex(option => option.value === value);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">{label}</label>
        <div className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
          {options[currentIndex]?.label ?? options[0]?.label ?? ''}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <input
          type="range"
          min={0}
          max={options.length - 1}
          step={1}
          value={currentIndex === -1 ? 0 : currentIndex}
          onChange={event => {
            const index = Number(event.target.value);
            const option = options[index];
            if (option) {
              onChange(option.value);
            }
          }}
          className="flex-1 accent-indigo-600 dark:accent-indigo-400"
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-300 mt-2">
        {options.map(option => (
          <span key={option.value}>{option.label}</span>
        ))}
      </div>
    </div>
  );
};

export default Slider;
