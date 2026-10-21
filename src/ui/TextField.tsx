import { input } from "./styles";

interface Props {
  id: string;
  label: string;
  testId: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  hint?: string;
  mono?: boolean;
}

export function TextField({ id, label, testId, value, onChange, hint, mono, ...rest }: Props) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-900">
        {label}
      </label>
      <input
        id={id}
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={`${input} ${mono ? "font-mono uppercase" : ""}`}
        {...rest}
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-sm text-slate-700">
          {hint}
        </p>
      )}
    </div>
  );
}
