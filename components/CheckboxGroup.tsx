
import React from 'react';

interface CheckboxGroupProps<T extends string> {
    label: string;
    options: { value: T; label: string }[];
    selectedValues: T[];
    onChange: (value: T) => void;
    inline?: boolean;
}

export function CheckboxGroup<T extends string>({ label, options, selectedValues, onChange, inline }: CheckboxGroupProps<T>) {
    const containerClasses = inline 
        ? "flex flex-wrap gap-x-6 gap-y-2" 
        : "space-y-2";

    return (
        <div>
            {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
            <div className={containerClasses}>
                {options.map(option => (
                    <label key={option.value} className="flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            value={option.value}
                            checked={selectedValues.includes(option.value)}
                            onChange={() => onChange(option.value)}
                            className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}
