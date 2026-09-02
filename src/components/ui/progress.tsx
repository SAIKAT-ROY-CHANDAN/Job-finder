import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, ...props }, ref) => (
    <div
      ref={ref}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-secondary", className)}
      {...props}
    >
      <div
        className={cn(
          "h-full w-full flex-1 rounded-full bg-primary transition-all",
          value >= 75 && "bg-emerald-500",
          value >= 50 && value < 75 && "bg-amber-500",
          value < 50 && "bg-red-500",
        )}
        style={{ transform: `translateX(-${100 - value}%)` }}
      />
    </div>
  ),
);
Progress.displayName = "Progress";

export { Progress };
