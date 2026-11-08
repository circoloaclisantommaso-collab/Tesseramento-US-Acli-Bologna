import React, { useState, useRef, useEffect, useMemo } from 'react';

interface SearchableSelectOption {
    value: string;
    label: string;
}

interface SearchableSelectProps {
    label: string;
    options: SearchableSelectOption[];
    selectedValue: string;
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    className?: string;
    error?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
    label,
    options,
    selectedValue,
    onChange,
    placeholder,
    required,
    disabled,
    className,
    error
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = useMemo(() => 
        options.find(option => option.value === selectedValue), 
        [options, selectedValue]
    );

    useEffect(() => {
        // Update the input field text when the dropdown is closed or the value changes externally
        if (!isOpen) {
            setSearchTerm(selectedOption ? selectedOption.label : '');
        }
    }, [isOpen, selectedOption]);

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
        onChange(value);
        setIsOpen(false);
        const newSelectedOption = options.find(o => o.value === value);
        setSearchTerm(newSelectedOption ? newSelectedOption.label : '');
    };
    
    const filteredOptions = useMemo(() => {
        // If the search term exactly matches the selected option's label, don't filter.
        // This prevents the list from becoming empty when the user has just selected an item.
        if (searchTerm === selectedOption?.label) {
            return options;
        }
        return options.filter(option =>
            option.label.toLowerCase().includes(searchTerm.toLowerCase())
        )
    }, [options, searchTerm, selectedOption]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        if (!isOpen) {
            setIsOpen(true);
        }
    };

    const handleInputClick = () => {
        if (disabled) return;
        if (!isOpen) {
             setSearchTerm(''); // Clear search on open for better UX
        }
        setIsOpen(!isOpen);
    };

    const errorClasses = error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-green-500 focus:border-green-500';

    return (
        <div className={`relative ${className || ''}`} ref={containerRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={handleInputChange}
                    onClick={handleInputClick}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed ${errorClasses}`}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 3a.75.75 0 01.53.22l3.5 3.5a.75.75 0 01-1.06 1.06L10 4.81 6.53 8.28a.75.75 0 01-1.06-1.06l3.5-3.5A.75.75 0 0110 3zm-3.72 9.28a.75.75 0 011.06 0L10 15.19l3.47-3.47a.75.75 0 111.06 1.06l-4 4a.75.75 0 01-1.06 0l-4-4a.75.75 0 010-1.06z" clipRule="evenodd" />
                    </svg>
                </div>

                {isOpen && !disabled && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        <ul>
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((option, idx) => (
                                    <li
                                        key={`${option.value}-${idx}`}
                                        onClick={() => handleSelect(option.value)}
                                        className={`p-2 cursor-pointer hover:bg-green-50 ${selectedValue === option.value ? 'bg-green-100' : ''}`}
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