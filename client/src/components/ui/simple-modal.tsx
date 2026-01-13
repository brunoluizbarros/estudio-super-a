import * as React from "react";
import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";

interface SimpleModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
}

/**
 * SimpleModal - Um modal simples sem Portal do Radix
 * Usado para evitar o erro "removeChild" que ocorre com o Dialog do Radix
 * quando há atualizações de estado durante o fechamento do modal
 */
export function SimpleModal({
  open,
  onClose,
  title,
  children,
  className,
  showCloseButton = true,
}: SimpleModalProps) {
  // Fechar com ESC
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    
    if (open) {
      document.addEventListener("keydown", handleEscape);
      // Prevenir scroll do body quando modal está aberto
      document.body.style.overflow = "hidden";
    }
    
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 animate-in fade-in-0"
        onClick={onClose}
      />
      
      {/* Content */}
      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={cn(
            "bg-background relative w-full max-w-lg rounded-lg border p-6 shadow-lg pointer-events-auto animate-in fade-in-0 zoom-in-95",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {title && (
            <div className="flex flex-col gap-2 text-center sm:text-left mb-4">
              <h2 className="text-lg leading-none font-semibold">{title}</h2>
            </div>
          )}
          
          {/* Close button */}
          {showCloseButton && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <XIcon className="h-4 w-4" />
              <span className="sr-only">Fechar</span>
            </button>
          )}
          
          {/* Body */}
          {children}
        </div>
      </div>
    </div>
  );
}

export default SimpleModal;
