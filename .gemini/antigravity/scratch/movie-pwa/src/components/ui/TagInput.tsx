import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

interface TagInputProps {
    tags: string[];
    onChange: (tags: string[]) => void;
    availableTags?: string[]; // For auto-complete later
}

export const TagInput: React.FC<TagInputProps> = ({ tags, onChange }) => {
    const [input, setInput] = useState('');

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag();
        } else if (e.key === 'Backspace' && !input && tags.length > 0) {
            removeTag(tags[tags.length - 1]);
        }
    };

    const addTag = () => {
        const trimmed = input.trim();
        if (trimmed && !tags.includes(trimmed)) {
            onChange([...tags, trimmed]);
            setInput('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        onChange(tags.filter(tag => tag !== tagToRemove));
    };

    return (
        <div className="flex flex-wrap items-center gap-2 p-2 bg-neutral-800 rounded-lg border border-neutral-700/50 focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all">
            {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 bg-indigo-500/20 text-indigo-200 px-2 py-1 rounded-md text-sm animate-in fade-in zoom-in duration-200">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-white transition-colors">
                        <X size={12} />
                    </button>
                </span>
            ))}
            <div className="flex-1 min-w-[100px] flex items-center">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={addTag}
                    placeholder={tags.length === 0 ? "Adicione tags (Enter para confirmar)..." : ""}
                    className="bg-transparent border-none outline-none text-white placeholder:text-neutral-500 w-full text-sm"
                />
                <button
                    onClick={addTag}
                    disabled={!input.trim()}
                    className="p-1 text-neutral-400 hover:text-indigo-400 disabled:opacity-0 transition-all"
                >
                    <Plus size={16} />
                </button>
            </div>
        </div>
    );
};
