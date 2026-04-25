// atoms.jsx — AI-DLH atoms. Lifted from frontend/src/components/atoms
const { forwardRef } = React;

const cn = (...xs) => xs.filter(Boolean).join(' ');

// Button
const Button = forwardRef(function Button(
  { className = '', variant = 'primary', size = 'md', children, ...props }, ref
) {
  const base = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
  const variants = {
    primary: 'bg-[#2463eb] text-white hover:bg-[#2058d4]',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
    outline: 'border border-slate-200 bg-white text-slate-900 hover:bg-slate-100',
    destructive: 'bg-red-500 text-white hover:bg-red-600',
  };
  const sizes = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-11 px-8 text-lg',
  };
  return (
    <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
});

// Card family
const Card = ({ className = '', ...p }) =>
  <div className={cn('rounded-lg border border-slate-200 bg-white text-slate-900 shadow-sm', className)} {...p} />;
const CardHeader = ({ className = '', ...p }) =>
  <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...p} />;
const CardTitle = ({ className = '', ...p }) =>
  <h3 className={cn('text-2xl font-semibold leading-none tracking-tight', className)} {...p} />;
const CardDescription = ({ className = '', ...p }) =>
  <p className={cn('text-sm text-slate-500', className)} {...p} />;
const CardContent = ({ className = '', ...p }) =>
  <div className={cn('p-6 pt-0', className)} {...p} />;

// Badge
const Badge = ({ variant = 'default', className = '', ...p }) => {
  const variants = {
    default: 'bg-[#2463eb] text-white',
    success: 'bg-green-500 text-white',
    warning: 'bg-yellow-500 text-white',
    error: 'bg-red-500 text-white',
    outline: 'bg-white text-slate-900 border border-slate-200',
  };
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', variants[variant], className)} {...p} />;
};

// Input
const Input = forwardRef(function Input({ className = '', ...props }, ref) {
  return (
    <input ref={ref}
      className={cn('flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50', className)}
      {...props} />
  );
});

// Select (matched styling to Input per DashboardPage)
const Select = forwardRef(function Select({ className = '', children, ...props }, ref) {
  return (
    <select ref={ref}
      className={cn('flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2', className)}
      {...props}>{children}</select>
  );
});

// Spinner (inline SVG, matches codebase)
const Spinner = ({ className = 'h-5 w-5' }) => (
  <svg className={cn('animate-spin', className)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

// Logo mark
const LogoMark = ({ size = 40 }) => (
  <div className="bg-[#2463eb] rounded-lg flex items-center justify-center text-white font-bold"
       style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}>AI</div>
);

Object.assign(window, {
  Button, Card, CardHeader, CardTitle, CardDescription, CardContent,
  Badge, Input, Select, Spinner, LogoMark,
});
