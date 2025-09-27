'use client';

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { Check, AlertCircle, Eye, EyeOff } from "lucide-react";

interface AnimatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helper?: string;
  error?: string;
  success?: boolean;
  icon?: React.ReactNode;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function AnimatedInput({
  label,
  helper,
  error,
  success,
  icon,
  className,
  onFocus,
  onBlur,
  ...props
}: AnimatedInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(!!props.value || !!props.defaultValue);
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isPassword = props.type === 'password';
  const inputType = isPassword && showPassword ? 'text' : props.type;

  useEffect(() => {
    setHasValue(!!props.value);
  }, [props.value]);

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    setHasValue(!!e.target.value);
    onBlur?.();
    props.onBlur?.(e);
  };

  return (
    <div className={cn("space-y-2 animate-gpu", className)}>
      <div className="relative">
        {/* Floating Label */}
        {label && (
          <Label
            htmlFor={props.id}
            className={cn(
              "absolute left-3 transition-all duration-200 ease-spring pointer-events-none",
              "text-muted-foreground",
              isFocused || hasValue
                ? "top-0 -translate-y-1/2 text-xs bg-background px-1 text-primary font-medium"
                : "top-1/2 -translate-y-1/2 text-sm"
            )}
          >
            {label}
          </Label>
        )}

        {/* Input Container */}
        <div className="relative">
          {/* Left Icon */}
          {icon && (
            <div className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-200",
              isFocused ? "text-primary" : "text-muted-foreground"
            )}>
              {icon}
            </div>
          )}

          {/* Input Field */}
          <Input
            ref={inputRef}
            type={inputType}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={cn(
              "input-focus transition-all duration-200 ease-spring",
              "focus:ring-2 focus:ring-primary/20 focus:border-primary",
              icon && "pl-10",
              isPassword && "pr-10",
              label && !isFocused && !hasValue && "placeholder-transparent",
              error && "border-destructive focus:border-destructive focus:ring-destructive/20",
              success && "border-green-500 focus:border-green-500 focus:ring-green-500/20",
              className
            )}
            {...props}
          />

          {/* Password Toggle */}
          {isPassword && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          )}

          {/* Success Icon */}
          {success && !error && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Check className="h-4 w-4 text-green-500 animate-scale-in" />
            </div>
          )}

          {/* Error Icon */}
          {error && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <AlertCircle className="h-4 w-4 text-destructive animate-scale-in" />
            </div>
          )}
        </div>

        {/* Focus Ring Animation */}
        {isFocused && (
          <div className="absolute inset-0 -z-10 rounded-md bg-primary/5 animate-scale-in" />
        )}
      </div>

      {/* Helper/Error Text */}
      {(helper || error) && (
        <div className={cn(
          "text-xs transition-all duration-200 ease-spring",
          error ? "text-destructive" : "text-muted-foreground"
        )}>
          <div className={cn(
            "transition-all duration-200",
            error ? "animate-scale-in" : ""
          )}>
            {error || helper}
          </div>
        </div>
      )}
    </div>
  );
}

interface AnimatedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helper?: string;
  error?: string;
  success?: boolean;
}

export function AnimatedTextarea({
  label,
  helper,
  error,
  success,
  className,
  ...props
}: AnimatedTextareaProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(!!props.value || !!props.defaultValue);

  useEffect(() => {
    setHasValue(!!props.value);
  }, [props.value]);

  const handleFocus = () => setIsFocused(true);
  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(false);
    setHasValue(!!e.target.value);
    props.onBlur?.(e);
  };

  return (
    <div className={cn("space-y-2 animate-gpu", className)}>
      <div className="relative">
        {/* Floating Label */}
        {label && (
          <Label
            htmlFor={props.id}
            className={cn(
              "absolute left-3 transition-all duration-200 ease-spring pointer-events-none z-10",
              "text-muted-foreground",
              isFocused || hasValue
                ? "top-0 -translate-y-1/2 text-xs bg-background px-1 text-primary font-medium"
                : "top-3 text-sm"
            )}
          >
            {label}
          </Label>
        )}

        {/* Textarea */}
        <Textarea
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(
            "input-focus transition-all duration-200 ease-spring resize-none",
            "focus:ring-2 focus:ring-primary/20 focus:border-primary",
            label && !isFocused && !hasValue && "placeholder-transparent",
            error && "border-destructive focus:border-destructive focus:ring-destructive/20",
            success && "border-green-500 focus:border-green-500 focus:ring-green-500/20",
            className
          )}
          {...props}
        />

        {/* Focus Ring Animation */}
        {isFocused && (
          <div className="absolute inset-0 -z-10 rounded-md bg-primary/5 animate-scale-in" />
        )}
      </div>

      {/* Helper/Error Text */}
      {(helper || error) && (
        <div className={cn(
          "text-xs transition-all duration-200 ease-spring",
          error ? "text-destructive" : "text-muted-foreground"
        )}>
          {error || helper}
        </div>
      )}
    </div>
  );
}

interface AnimatedSelectProps {
  label?: string;
  helper?: string;
  error?: string;
  placeholder?: string;
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

export function AnimatedSelect({
  label,
  helper,
  error,
  placeholder,
  children,
  value,
  onValueChange,
  className
}: AnimatedSelectProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = !!value;

  return (
    <div className={cn("space-y-2 animate-gpu", className)}>
      <div className="relative">
        {/* Floating Label */}
        {label && (
          <Label
            className={cn(
              "absolute left-3 transition-all duration-200 ease-spring pointer-events-none z-10",
              "text-muted-foreground",
              isFocused || hasValue
                ? "top-0 -translate-y-1/2 text-xs bg-background px-1 text-primary font-medium"
                : "top-1/2 -translate-y-1/2 text-sm"
            )}
          >
            {label}
          </Label>
        )}

        {/* Select */}
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={cn(
              "input-focus transition-all duration-200 ease-spring",
              "focus:ring-2 focus:ring-primary/20 focus:border-primary",
              error && "border-destructive focus:border-destructive focus:ring-destructive/20",
              className
            )}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="animate-scale-in">
            {children}
          </SelectContent>
        </Select>

        {/* Focus Ring Animation */}
        {isFocused && (
          <div className="absolute inset-0 -z-10 rounded-md bg-primary/5 animate-scale-in" />
        )}
      </div>

      {/* Helper/Error Text */}
      {(helper || error) && (
        <div className={cn(
          "text-xs transition-all duration-200 ease-spring",
          error ? "text-destructive" : "text-muted-foreground"
        )}>
          {error || helper}
        </div>
      )}
    </div>
  );
}

interface AnimatedCheckboxProps {
  label: string;
  helper?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
}

export function AnimatedCheckbox({
  label,
  helper,
  checked,
  onCheckedChange,
  className
}: AnimatedCheckboxProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className={cn("space-y-1 animate-gpu", className)}>
      <div
        className={cn(
          "flex items-center space-x-3 p-2 rounded-md transition-all duration-200 ease-spring",
          "hover:bg-muted/50 cursor-pointer",
          isHovered && "shadow-sm"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => onCheckedChange?.(!checked)}
      >
        <Checkbox
          checked={checked}
          onCheckedChange={onCheckedChange}
          className={cn(
            "transition-all duration-200 ease-spring",
            checked && "animate-scale-in"
          )}
        />
        <Label className="cursor-pointer transition-colors duration-200">
          {label}
        </Label>
      </div>

      {helper && (
        <div className="text-xs text-muted-foreground ml-7">
          {helper}
        </div>
      )}
    </div>
  );
}

interface AnimatedRadioGroupProps {
  label?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  options: Array<{ value: string; label: string; helper?: string }>;
  className?: string;
}

export function AnimatedRadioGroup({
  label,
  value,
  onValueChange,
  options,
  className
}: AnimatedRadioGroupProps) {
  return (
    <div className={cn("space-y-4 animate-gpu", className)}>
      {label && (
        <Label className="text-sm font-medium">{label}</Label>
      )}

      <RadioGroup value={value} onValueChange={onValueChange} className="space-y-2">
        {options.map((option, index) => (
          <div
            key={option.value}
            className={cn(
              "flex items-start space-x-3 p-3 rounded-md transition-all duration-200 ease-spring",
              "hover:bg-muted/50 cursor-pointer border border-transparent",
              value === option.value && "bg-primary/5 border-primary/20"
            )}
            style={{
              animationDelay: `${index * 50}ms`
            }}
            onClick={() => onValueChange?.(option.value)}
          >
            <RadioGroupItem
              value={option.value}
              className={cn(
                "mt-0.5 transition-all duration-200 ease-spring",
                value === option.value && "animate-scale-in"
              )}
            />
            <div className="space-y-1">
              <Label className="cursor-pointer transition-colors duration-200">
                {option.label}
              </Label>
              {option.helper && (
                <div className="text-xs text-muted-foreground">
                  {option.helper}
                </div>
              )}
            </div>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}

// Form Section with staggered animations
interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function FormSection({
  title,
  description,
  children,
  className,
  delay = 0
}: FormSectionProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={cn(
        "space-y-4 transition-all duration-500 ease-spring animate-gpu",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        className
      )}
    >
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-lg font-semibold transition-all duration-300">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-muted-foreground transition-all duration-300">
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}