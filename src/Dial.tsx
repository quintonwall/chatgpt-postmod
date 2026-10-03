import type { CSSProperties } from "react";
/** Discrete rotary selector with native keyboard/drag support and step controls. */
export function Dial({
  label,
  index,
  count,
  valueText,
  disabled,
  onChange,
  small = false,
}: {
  label: string;
  index: number;
  count: number;
  valueText: string;
  disabled: boolean;
  onChange: (index: number) => void;
  small?: boolean;
}) {
  const unavailable = disabled || count < 2;
  const step = (delta: number) => onChange((index + delta + count) % count);
  return (
    <div className={`dial-control ${small ? "dial-small" : ""}`}>
      <button
        type="button"
        aria-label={`Previous ${label}`}
        disabled={unavailable}
        onClick={() => step(-1)}
      >
        −
      </button>
      <div
        className="source-dial"
        style={
          {
            "--angle": `${count > 1 ? -130 + (260 * index) / (count - 1) : 0}deg`,
          } as CSSProperties
        }
      >
        <input
          type="range"
          min={0}
          max={Math.max(0, count - 1)}
          value={index}
          aria-label={`${label} dial`}
          aria-valuetext={valueText}
          disabled={unavailable}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <i />
      </div>
      <button
        type="button"
        aria-label={`Next ${label}`}
        disabled={unavailable}
        onClick={() => step(1)}
      >
        +
      </button>
    </div>
  );
}
