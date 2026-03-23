import React, { useState, useRef, useEffect, useMemo } from 'react';

interface MultiSelectOption {
    value: string;
    label: string;
}

interface MultiSelectProps {
    label: string;
    options: MultiSelectOption[];
    selectedValues: string[];
    onChange: (values: string[]) => void;
    placeholder?: string;
    required?: boolean;
    error?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
    label,
    options,
    selectedValues,
    onChange,
    placeholder,
    required,
    error
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    const handleSelect = (value: string) => {
        const newSelectedValues = selectedValues.includes(value)
            ? selectedValues.filter(v => v !== value)
            : [...selectedValues, value];
        onChange(newSelectedValues);
    };

    const handleRemove = (value: string) => {
        onChange(selectedValues.filter(v => v !== value));
    };

    const filteredOptions = useMemo(() => 
        options.filter(option =>
            option.label.toLowerCase().includes(searchTerm.toLowerCase())
        ), [options, searchTerm]
    );
    
    const selectedOptions = useMemo(() =>
        options.filter(option => selectedValues.includes(option.value)),
        [options, selectedValues]
    );
    
    const errorClasses = error ? 'border-red-500' : 'border-gray-300';

    return (
        <div className="relative" ref={containerRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    className={`flex flex-wrap gap-2 p-2 min-h-[42px] border rounded-md shadow-sm bg-white cursor-text ${errorClasses}`}
                >
                    {selectedOptions.map(option => (
                        <span key={option.value} className="flex items-center gap-1 bg-green-100 text-green-800 text-sm font-medium px-2 py-1 rounded-full">
                            {option.label}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemove(option.value);
                                }}
                                className="text-green-600 hover:text-green-800"
                            >
                                &#x2715;
                            </button>
                        </span>
                    ))}
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setIsOpen(true);
                        }}
                        placeholder={selectedValues.length === 0 ? placeholder : ''}
                        className="flex-grow bg-transparent outline-none border-none p-0 text-sm"
                    />
                </div>

                {isOpen && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        <ul>
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map(option => (
                                    <li
                                        key={option.value}
                                        onClick={() => handleSelect(option.value)}
                                        className={`p-2 cursor-pointer hover:bg-green-50 ${selectedValues.includes(option.value) ? 'bg-green-100' : ''}`}
                                    >
                                        {option.label}
                                    </li>
                                ))
                            ) : (
                                <li className="p-2 text-gray-500">Nessun risultato</li>
                            )}
                        </ul>
                    </div>
                )}
            </div>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
};