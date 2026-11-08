import React from 'react';
import { parseItalianDate } from '../utils/dateUtils';

interface BaseInputProps {
    label: string;
    required?: boolean;
    className?: string;
    error?: string;
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement>, BaseInputProps {
    info?: string;
    actionButton?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, required, className, error, info, actionButton, ...props }) => {
    const errorClasses = error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500';
    return (
        <div className={className}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="flex gap-2">
                <input
                    {...props}
                    className={`block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm ${errorClasses}`}
                />
                {actionButton}
            </div>
             {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
             {info && !error && <p className="mt-1 text-xs text-blue-600">{info}</p>}
        </div>
    );
};

export interface Option {
    value: string;
    label: string;
}

export interface OptionGroup {
    label: string;
    options: Option[];
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement>, BaseInputProps {
    options: (Option | OptionGroup)[];
}

export const Select: React.FC<SelectProps> = ({ label, required, options, className, ...props }) => {
    return (
        <div className={className}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <select
                {...props}
                className="block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
            >
                <option value="">Seleziona...</option>
                {options.map((opt, idx) => {
                    if ('options' in opt) {
                        return (
                            <optgroup key={idx} label={opt.label}>
                                {opt.options.map((o, oIdx) => (
                                    <option key={`${o.value}-${oIdx}`} value={o.value}>{o.label}</option>
                                ))}
                            </optgroup>
                        );
                    }
                    return <option key={`${opt.value}-${idx}`} value={opt.value}>{opt.label}</option>;
                })}
            </select>
        </div>
    );
};


export const DateInput: React.FC<InputProps> = (props) => {
    const normalizedValue = props.value ? parseItalianDate(props.value) : '';
    return <Input {...props} value={normalizedValue} type="date" className={props.disabled ? `${props.className} disabled:bg-gray-100` : props.className} />;
};