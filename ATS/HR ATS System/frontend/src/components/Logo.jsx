import { Hexagon, Zap } from 'lucide-react';
import { cn } from '../utils/cn';

export function Logo({ 
  size = 32, 
  className,
  showText = false,
  textClassName
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div 
        className="relative flex items-center justify-center shrink-0" 
        style={{ width: size, height: size }}
      >
        <Hexagon 
          size={size} 
          className="text-primary fill-primary/10" 
          strokeWidth={2.5} 
        />
        <Zap 
          size={size * 0.5} 
          className="absolute text-primary" 
          fill="currentColor"
          strokeWidth={0}
        />
      </div>
      {showText && (
        <span className={cn("text-xl font-bold text-default-900 tracking-tight", textClassName)}>
          Tecno<span className="text-primary">Legacy</span>
        </span>
      )}
    </div>
  );
}

export default Logo;
