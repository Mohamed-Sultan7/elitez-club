
import React from 'react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GoldButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'destructive';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  loading?: boolean;
}

const GoldButton = ({ 
  children, 
  variant = 'default', 
  size = 'default', 
  className, 
  loading = false,
  ...props 
}: GoldButtonProps) => {
  return (
    <Button
      className={cn(
        "font-heading transition-all duration-300",
        variant === 'default' ? "bg-gold text-black hover:bg-gold/90 golden-glow" : 
        variant === 'outline' ? "border-gold text-gold hover:bg-gold/10" :
        variant === 'destructive' ? "bg-red-600 hover:bg-red-700 text-white border-red-600" :
        "border-gold text-gold hover:bg-gold/10",
        loading && "opacity-70 cursor-not-allowed",
        className
      )}
      disabled={loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center justify-center">
          Processing
          <svg className="animate-spin ml-3 mr-0 rtl:mr-3 rtl:ml-0 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </span>
      ) : children}
    </Button>
  );
};

export default GoldButton;
