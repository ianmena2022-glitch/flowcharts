"use client";

import { useState } from "react";

export default function EditableLabel({
  label,
  onChange,
  className,
}: {
  label: string;
  onChange: (label: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(label);

  function commit() {
    setEditing(false);
    const trimmed = value.trim();
    if (trimmed && trimmed !== label) onChange(trimmed);
  }

  if (editing) {
    return (
      <textarea
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") {
            setValue(label);
            setEditing(false);
          }
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        rows={2}
        className={`nodrag w-full resize-none bg-transparent text-center outline-none ${className ?? ""}`}
      />
    );
  }

  return (
    <span
      onDoubleClick={(e) => {
        e.stopPropagation();
        setValue(label);
        setEditing(true);
      }}
      className={className}
    >
      {label}
    </span>
  );
}
