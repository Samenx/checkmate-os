"use client";
import { useEffect, useRef } from "react";
import {
  X,
  Plus,
  ArrowUpRight,
  ChevronRight,
  LoaderCircle,
  Search,
} from "lucide-react";
import { initials, statusTone } from "@/lib/client";
export function IconButton({ icon: Icon, label, onClick, ...rest }: any) {
  return (
    <button
      className="icon-button"
      title={label}
      aria-label={label}
      onClick={onClick}
      {...rest}
    >
      <Icon size={18} />
    </button>
  );
}
export function Badge({ children }: any) {
  return (
    <span className={`badge ${statusTone(String(children))}`}>
      <i />
      {children}
    </span>
  );
}
export function Avatar({ name, small = false, imageUrl = "", imageFit = "cover" }: any) {
  return (
    <span
      className={`avatar ${small ? "small" : ""}`}
      style={
        {
          "--avatar-hue": String(
            (name || "")
              .split("")
              .reduce((s: number, c: string) => s + c.charCodeAt(0), 0) % 260,
          ),
        } as any
      }
    >
      {imageUrl ? <img src={imageUrl} alt="" style={{objectFit:imageFit}}/> : initials(name)}
    </span>
  );
}
export function Empty({
  title = "Nothing here yet",
  description = "Add your first record to get started.",
  action,
}: any) {
  return (
    <div className="empty">
      <span className="empty-chess">♙</span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Modal({ title, children, onClose, wide = false }: any) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const d = ref.current;
    const close = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    d?.addEventListener("cancel", close);
    return () => d?.removeEventListener("cancel", close);
  }, [onClose]);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-heading">
        <div>
          <span className="eyebrow">CHECKMATE OS</span>
          <h2>{title}</h2>
        </div>
        <IconButton icon={X} label="Close dialog" onClick={onClose} />
      </div>
      {children}
    </dialog>
  );
}
export function Section({
  title,
  subtitle,
  action,
  children,
  className = "",
}: any) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-head">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function SearchInput({
  value,
  onChange,
  placeholder = "Search records…",
}: any) {
  return (
    <label className="search-input">
      <Search size={16} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
export function Loading() {
  return (
    <div className="loading-grid">
      {Array.from({ length: 8 }, (_, i) => (
        <div className="skeleton" key={i} />
      ))}
    </div>
  );
}
