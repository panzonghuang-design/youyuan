"use client";

import React from "react";

export function Field(props: {
  label: string;
  type: string;
  placeholder?: string;
  labelClass?: string;
  inputClass?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="grid gap-2 text-sm text-muted">
      <span className={props.labelClass}>{props.label}</span>
      <input
        type={props.type}
        placeholder={props.placeholder}
        value={props.value}
        onChange={props.onChange}
        className={`w-full rounded-2xl border border-border bg-white text-black px-4 py-3 text-sm placeholder:text-gray-400 focus:border-accent focus:outline-none ${props.inputClass ?? ""}`}
      />
    </label>
  );
}

export function Select(props: {
  label: string;
  options: string[];
  labelClass?: string;
  selectClass?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}) {
  return (
    <label className="grid gap-2 text-sm text-muted">
      <span className={props.labelClass}>{props.label}</span>
      <div className="relative">
        <select
          value={props.value}
          onChange={props.onChange}
          className={`w-full h-[52px] appearance-none rounded-2xl border border-[#f3d4e8] bg-white px-4 pr-10 text-base font-semibold text-[#2f2a2a] placeholder:text-[#b380b0] focus:border-accent focus:outline-none ${props.selectClass ?? ""}`}
        >
          {props.options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#ff6ba6] text-lg">⌄</span>
      </div>
    </label>
  );
}

export function FormCard({
  title,
  subtitle,
  children,
  cta,
  onSubmit,
}: {
  title: string;
  subtitle?: string;
  cta: string;
  children: React.ReactNode;
  onSubmit?: () => void;
}) {
  return (
    <div className="card mx-auto grid w-full max-w-md gap-4 text-center">
      <div>
        <h2 className="text-2xl font-extrabold text-[#2f2a2a] tracking-wide">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-[#7a4a7c] font-semibold">{subtitle}</p>}
      </div>
      <div className="grid gap-3 text-left font-semibold text-[#2f2a2a]">{children}</div>
      <button
        className="w-full rounded-xl bg-gradient-to-r from-accent to-accent2 px-4 py-3 font-semibold text-ink shadow-pill"
        onClick={onSubmit}
      >
        {cta}
      </button>
    </div>
  );
}

export function PenIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-4 w-4 text-black"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20H4l1.5-5.5L16 4.5a2.12 2.12 0 0 1 3 3L8.5 17" />
      <path d="M14.5 6.5l3 3" />
    </svg>
  );
}

export function SaveIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-4 w-4 text-black"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 4h11l3 3v13H5Z" />
      <path d="M9 4v6h6V4" />
      <path d="M8 14h8" />
      <path d="M10 17h4" />
    </svg>
  );
}

export function SmileIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9 10h0.01M15 10h0.01" />
      <path d="M8.5 14.2c1.4 1.3 3.6 1.3 5 0" />
    </svg>
  );
}

export function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="6.5" width="16" height="12" rx="3" />
      <path d="M9 6.5 10.2 4h3.6L15 6.5" />
      <circle cx="12" cy="12.5" r="3.2" />
    </svg>
  );
}

export function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H8l-4 4V6a1 1 0 0 1 1-1Z" />
      <path d="M8 9h8M8 13h5" />
    </svg>
  );
}

export function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

// Outline chat bubble similar to reference
export function ChatBubbleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-4 4V7a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

// Simple user outline (head + shoulders) to match reference
export function UserLineIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7.5" r="3.5" />
      <path d="M5 20c0-3.3 3-5.5 7-5.5s7 2.2 7 5.5" />
    </svg>
  );
}
