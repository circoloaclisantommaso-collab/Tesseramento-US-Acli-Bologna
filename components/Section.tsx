import React from 'react';

interface SectionProps {
    title: string;
    children: React.ReactNode;
}

export const Section: React.FC<SectionProps> = ({ title, children }) => {
    return (
        <div className="first:pt-0 pt-6">
            <div className="border-b border-gray-200 pb-2 mb-6">
                <h3 className="text-xl font-semibold text-gray-800 tracking-tight">
                    {title}
                </h3>
            </div>
            <div className="px-1">
                 {children}
            </div>
        </div>
    );
};