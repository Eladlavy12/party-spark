import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  remaining: number;
  progress: number;
  size?: 'sm' | 'lg';
}

export function CountdownTimer({ remaining, progress, size = 'lg' }: CountdownTimerProps) {
  const isUrgent = remaining <= 5;
  const radius = size === 'lg' ? 36 : 18;
  const stroke = size === 'lg' ? 4 : 3;
  const circumference = 2 * Math.PI * radius;
  const svgSize = (radius + stroke) * 2;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: svgSize, height: svgSize }}>
        <svg width={svgSize} height={svgSize} className="-rotate-90">
          <circle
            cx={radius + stroke}
            cy={radius + stroke}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={stroke}
          />
          <motion.circle
            cx={radius + stroke}
            cy={radius + stroke}
            r={radius}
            fill="none"
            stroke={isUrgent ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            transition={{ duration: 0.3 }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            key={remaining}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className={`font-bold tabular-nums ${
              size === 'lg' ? 'text-2xl' : 'text-sm'
            } ${isUrgent ? 'text-destructive' : 'text-foreground'}`}
          >
            {remaining}
          </motion.span>
        </div>
      </div>
      {size === 'lg' && (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" /> seconds
        </span>
      )}
    </div>
  );
}
