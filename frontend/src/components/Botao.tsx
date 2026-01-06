import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = `
        inline-flex items-center justify-center gap-2
        font-semibold rounded-xl
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        active:scale-[0.98]
    `;

  const variants = {
    primary: `
            bg-brand-500 text-white
            hover:bg-brand-600
            shadow-sm shadow-brand-500/20
            hover:shadow-md hover:shadow-brand-500/30
        `,
    secondary: `
            bg-surface-100 text-surface-700
            hover:bg-surface-200
            border border-surface-200
        `,
    ghost: `
            bg-transparent text-surface-600
            hover:bg-surface-100
        `,
    danger: `
            bg-red-500 text-white
            hover:bg-red-600
            shadow-sm shadow-red-500/20
        `,
    outline: `
            bg-transparent border border-surface-200
            text-surface-700 hover:bg-surface-50
        `,
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm min-h-[36px]',
    md: 'px-4 py-2.5 text-sm min-h-[44px]',
    lg: 'px-6 py-3 text-base min-h-[52px]',
    xl: 'px-8 py-4 text-lg min-h-[60px]',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`
                ${baseStyles}
                ${variants[variant]}
                ${sizes[size]}
                ${widthClass}
                ${className}
            `.replace(/\s+/g, ' ').trim()}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : null}
      {children}
    </button>
  );
};

// FAB - Floating Action Button
interface FABProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label?: string;
}

export const FAB: React.FC<FABProps> = ({ icon, label, className = '', ...props }) => {
  return (
    <button
      className={`
                fab
                ${className}
            `}
      title={label}
      {...props}
    >
      {icon}
    </button>
  );
};

export default Button;