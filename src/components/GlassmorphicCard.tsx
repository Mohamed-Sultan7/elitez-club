
import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

interface GlassmorphicCardProps {
  className?: string;
  header?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  hover?: boolean;
}

const GlassmorphicCard = ({ className, header, children, footer, hover = false }: GlassmorphicCardProps) => {
  return (
    <Card 
      className={cn(
        "glass border border-white/10 overflow-hidden bg-opacity-20 backdrop-blur-md",
        hover && "transition-all duration-300 card-tilt",
        className
      )}
    >
      {header && <CardHeader className="border-b border-white/5">{header}</CardHeader>}
      <CardContent className={cn("p-6", !header && "pt-6")}>
        {children}
      </CardContent>
      {footer && <CardFooter className="border-t border-white/5">{footer}</CardFooter>}
    </Card>
  );
};

export default GlassmorphicCard;
