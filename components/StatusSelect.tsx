'use client';

export function StatusSelect({
  value,
  options,
  action,
  name = 'status',
}: {
  value: string;
  options: { value: string; label: string }[];
  action: (formData: FormData) => void;
  name?: string;
}) {
  return (
    <form action={action}>
      <select
        name={name}
        defaultValue={value}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="field-lg !py-2 !px-3 text-sm min-h-0"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </form>
  );
}
