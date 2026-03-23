import React from 'react';

interface RadioGroupProps {
    label: string;
    name: string;
    selectedValue: boolean | null;
    onChange: (value: boolean) => void;
    error?: string;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({ label, name, selectedValue, onChange, error }) => {
    return (
        <div>
            <p className="text-sm text-gray-700 mb-2">{label}</p>
            <div className="flex items-center space-x-6">
                <label className="flex items-center cursor-pointer">
                    <input
                        type="radio"
                        name={name}
                        checked={selectedValue === true}
                        onChange={() => onChange(true)}
                        className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Sì</span>
                </label>
                <label className="flex items-center cursor-pointer">
                    <input
                        type="radio"
                        name={name}
                        checked={selectedValue === false}
                        onChange={() => onChange(false)}
                        className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">No</span>
                </label>
            </div>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
};