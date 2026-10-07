"use client";
import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
export default function Modal({
  title,
  description,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null),
    formArea = useRef<HTMLDivElement>(null),
    baseline = useRef(""),
    lastFocus = useRef<HTMLElement | null>(null),
    continueRef = useRef<HTMLButtonElement>(null);
  const [dirty, setDirty] = useState(false),
    [confirm, setConfirm] = useState(false);
  const titleId = useId(),
    descriptionId = useId();
  function snapshot() {
    const form = formArea.current?.querySelector("form");
    return form ? JSON.stringify(Array.from(new FormData(form).entries())) : "";
  }
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null,
      dialog = dialogRef.current!,
      overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    baseline.current = snapshot();
    (
      dialog.querySelector(
        'input:not([type="hidden"]),select,textarea',
      ) as HTMLElement | null
    )?.focus();
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    if (confirm) continueRef.current?.focus();
    else lastFocus.current?.focus();
  }, [confirm]);
  function requestClose() {
    if (busy) return;
    if (dirty || snapshot() !== baseline.current) {
      lastFocus.current = document.activeElement as HTMLElement;
      setConfirm(true);
    } else onClose();
  }
  return (
    <dialog
      ref={dialogRef}
      className="modal-card accessible-modal"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={busy}
      onCancel={(e) => {
        e.preventDefault();
        if (busy) return;
        if (confirm) setConfirm(false);
        else requestClose();
      }}
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        const controls = Array.from(
          e.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not(:disabled):not([type="hidden"]),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]',
          ),
        ).filter((el) => el.getClientRects().length);
        const first = controls[0],
          last = controls.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }}
    >
      <div className="modal-head">
        <div>
          <h2 id={titleId}>{confirm ? "Descartar alterações?" : title}</h2>
          <p id={descriptionId}>
            {confirm
              ? "Você tem informações que ainda não foram salvas."
              : description}
          </p>
        </div>
        {!confirm && (
          <button
            type="button"
            className="icon-btn"
            aria-label="Fechar formulário"
            disabled={busy}
            onClick={requestClose}
          >
            <X aria-hidden="true" />
          </button>
        )}
      </div>
      {confirm && (
        <div className="discard-confirm">
          <p>
            Continue preenchendo para manter todos os dados ou descarte para
            fechar.
          </p>
          <div className="modal-actions">
            <button
              ref={continueRef}
              type="button"
              className="btn primary"
              onClick={() => setConfirm(false)}
            >
              Continuar preenchendo
            </button>
            <button type="button" className="btn secondary" onClick={onClose}>
              Descartar alterações
            </button>
          </div>
        </div>
      )}
      <div
        ref={formArea}
        hidden={confirm}
        onChangeCapture={() => setDirty(snapshot() !== baseline.current)}
        onClickCapture={(e) => {
          if ((e.target as HTMLElement).closest("[data-modal-close]")) {
            e.preventDefault();
            e.stopPropagation();
            requestClose();
          }
        }}
      >
        {children}
      </div>
    </dialog>
  );
}
