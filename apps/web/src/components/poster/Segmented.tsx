interface SegmentedProps<T extends string> {
    options: readonly T[];
    value: T;
    onChange: (value: T) => void;
    labels: Record<T, string>;
    ariaLabel: string;
}

// Two or three choices side by side in an ink box. The chosen one is printed solid.
export default function Segmented<T extends string>({ options, value, onChange, labels, ariaLabel }: SegmentedProps<T>) {
    return (
        <div className="flex border-2 border-ink text-sm font-bold" role="group" aria-label={ariaLabel}>
            {options.map((option) => (
                <button
                    key={option}
                    type="button"
                    aria-pressed={value === option}
                    onClick={() => option !== value && onChange(option)}
                    className={`px-4 py-1.5 transition-colors ${value === option ? "bg-ink text-paper" : "text-ink hover:bg-wash"}`}
                >
                    {labels[option]}
                </button>
            ))}
        </div>
    );
}
