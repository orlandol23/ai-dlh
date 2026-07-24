/** @type {import('tailwindcss').Config} */
import animate from 'tailwindcss-animate';
import typography from '@tailwindcss/typography';

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '"Noto Sans"', '"Noto Sans JP"', '"Noto Sans Arabic"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', '"Noto Sans"', '"Noto Sans JP"', '"Noto Sans Arabic"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Noto Sans Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50:  "hsl(var(--primary-50))",
          100: "hsl(var(--primary-100))",
          200: "hsl(var(--primary-200))",
          300: "hsl(var(--primary-300))",
          400: "hsl(var(--primary-400))",
          500: "hsl(var(--primary-500))",
          600: "hsl(var(--primary-600))",
          700: "hsl(var(--primary-700))",
          800: "hsl(var(--primary-800))",
          900: "hsl(var(--primary-900))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          50:  "hsl(var(--accent-50))",
          100: "hsl(var(--accent-100))",
          300: "hsl(var(--accent-300))",
          500: "hsl(var(--accent-500))",
          600: "hsl(var(--accent-600))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          bg: "hsl(var(--success-bg))",
          border: "hsl(var(--success-border))",
          fg: "hsl(var(--success-fg))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          bg: "hsl(var(--warning-bg))",
          border: "hsl(var(--warning-border))",
          fg: "hsl(var(--warning-fg))",
        },
        error: {
          DEFAULT: "hsl(var(--error))",
          bg: "hsl(var(--error-bg))",
          border: "hsl(var(--error-border))",
          fg: "hsl(var(--error-fg))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          bg: "hsl(var(--info-bg))",
          border: "hsl(var(--info-border))",
          fg: "hsl(var(--info-fg))",
        },
        onchain: {
          DEFAULT: "hsl(var(--onchain))",
          bg: "hsl(var(--onchain-bg))",
          border: "hsl(var(--onchain-border))",
          fg: "hsl(var(--onchain-fg))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        spin: 'spin 0.8s linear infinite',
      },
      // Module content prose — maps @tailwindcss/typography's --tw-prose-* vars
      // to the design tokens so `prose prose-token` reads correctly in BOTH
      // :root (light) and .dark, with NO prose-invert. Headings use font-display
      // (keeping the Noto JP/Arabic fallbacks via theme()), code uses font-mono.
      typography: ({ theme }) => ({
        token: {
          css: {
            // ---- color vars -> design tokens (auto light/dark) ----
            '--tw-prose-body': 'hsl(var(--foreground))',
            '--tw-prose-headings': 'hsl(var(--foreground))',
            '--tw-prose-lead': 'hsl(var(--muted-foreground))',
            '--tw-prose-links': 'hsl(var(--primary))',
            '--tw-prose-bold': 'hsl(var(--foreground))',
            '--tw-prose-counters': 'hsl(var(--muted-foreground))',
            '--tw-prose-bullets': 'hsl(var(--primary) / 0.55)',
            '--tw-prose-hr': 'hsl(var(--border))',
            '--tw-prose-quotes': 'hsl(var(--muted-foreground))',
            '--tw-prose-quote-borders': 'hsl(var(--primary))',
            '--tw-prose-captions': 'hsl(var(--muted-foreground))',
            '--tw-prose-code': 'hsl(var(--foreground))',
            '--tw-prose-pre-code': 'hsl(var(--card-foreground))',
            '--tw-prose-pre-bg': 'hsl(var(--muted))',
            '--tw-prose-th-borders': 'hsl(var(--border))',
            '--tw-prose-td-borders': 'hsl(var(--border))',
            // Mirror invert vars to the SAME tokens so the plugin's grey dark
            // palette can never leak if dark:prose-invert is ever added later.
            '--tw-prose-invert-body': 'hsl(var(--foreground))',
            '--tw-prose-invert-headings': 'hsl(var(--foreground))',
            '--tw-prose-invert-lead': 'hsl(var(--muted-foreground))',
            '--tw-prose-invert-links': 'hsl(var(--primary))',
            '--tw-prose-invert-bold': 'hsl(var(--foreground))',
            '--tw-prose-invert-counters': 'hsl(var(--muted-foreground))',
            '--tw-prose-invert-bullets': 'hsl(var(--primary) / 0.55)',
            '--tw-prose-invert-hr': 'hsl(var(--border))',
            '--tw-prose-invert-quotes': 'hsl(var(--muted-foreground))',
            '--tw-prose-invert-quote-borders': 'hsl(var(--primary))',
            '--tw-prose-invert-captions': 'hsl(var(--muted-foreground))',
            '--tw-prose-invert-code': 'hsl(var(--foreground))',
            '--tw-prose-invert-pre-code': 'hsl(var(--card-foreground))',
            '--tw-prose-invert-pre-bg': 'hsl(var(--muted))',
            '--tw-prose-invert-th-borders': 'hsl(var(--border))',
            '--tw-prose-invert-td-borders': 'hsl(var(--border))',

            // ---- base rhythm: design base size, comfortable leading.
            // Reading width is set on the wrapper (max-w-[72ch] mx-auto) since
            // utilities override the plugin's max-width — one source of truth. ----
            fontSize: '1rem',
            lineHeight: '1.75',

            // ---- headings: font-display (Space Grotesk), modest scale.
            // theme('fontFamily.display') keeps the Noto JP/Arabic fallbacks. ----
            'h1, h2, h3, h4': {
              fontFamily: theme('fontFamily.display').join(', '),
              fontWeight: '700',
              letterSpacing: '-0.02em',
              scrollMarginTop: '6rem',
            },
            h1: { fontSize: '1.875rem', lineHeight: '1.2', marginBottom: '0.8em' },
            h2: {
              fontSize: '1.5rem',
              lineHeight: '1.3',
              marginTop: '2em',
              marginBottom: '0.75em',
              paddingBottom: '0.3em',
              borderBottom: '1px solid hsl(var(--border))',
            },
            h3: { fontSize: '1.25rem', lineHeight: '1.4', marginTop: '1.6em', marginBottom: '0.6em' },
            h4: { fontSize: '1.0625rem', marginTop: '1.4em', marginBottom: '0.5em' },

            // ---- paragraphs / lists ----
            p: { marginTop: '0', marginBottom: '1.25em' },
            'ul, ol': { marginTop: '0', marginBottom: '1.25em', paddingInlineStart: '1.5em' },
            li: { marginTop: '0.4em', marginBottom: '0.4em' },
            'li::marker': { color: 'hsl(var(--muted-foreground))' },

            // ---- links ----
            a: {
              fontWeight: '500',
              textDecoration: 'underline',
              textDecorationColor: 'hsl(var(--primary) / 0.4)',
              textUnderlineOffset: '2px',
              transition: 'color .15s, text-decoration-color .15s',
            },
            'a:hover': { textDecorationColor: 'hsl(var(--primary))' },

            // ---- inline code: mono chip on --muted, no backtick pseudo-content ----
            code: {
              fontFamily: theme('fontFamily.mono').join(', '),
              fontWeight: '500',
              fontSize: '0.875em',
              backgroundColor: 'hsl(var(--muted))',
              color: 'hsl(var(--foreground))',
              padding: '0.15em 0.4em',
              borderRadius: 'calc(var(--radius) - 4px)',
              border: '1px solid hsl(var(--border))',
            },
            'code::before': { content: '""' },
            'code::after': { content: '""' },

            // ---- fenced code blocks: card-ish, inner code stripped of chip ----
            pre: {
              fontFamily: theme('fontFamily.mono').join(', '),
              fontSize: '0.875rem',
              lineHeight: '1.7',
              backgroundColor: 'hsl(var(--muted))',
              color: 'hsl(var(--card-foreground))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 'var(--radius)',
              padding: '1rem 1.25rem',
            },
            'pre code': {
              backgroundColor: 'transparent',
              border: '0',
              borderRadius: '0',
              padding: '0',
              fontWeight: '400',
              fontSize: 'inherit',
              color: 'inherit',
            },

            // ---- blockquote: leading-edge accent rule (logical border) ----
            blockquote: {
              fontStyle: 'normal',
              fontWeight: '400',
              color: 'hsl(var(--muted-foreground))',
              borderInlineStartWidth: '3px',
              borderInlineStartColor: 'hsl(var(--primary))',
              paddingInlineStart: '1em',
            },
            'blockquote p:first-of-type::before': { content: '""' },
            'blockquote p:last-of-type::after': { content: '""' },

            // ---- tables (defensive: needs remark-gfm to actually render) ----
            table: { fontSize: '0.9375em', width: '100%' },
            thead: { borderBottomColor: 'hsl(var(--border))' },
            'thead th': {
              fontFamily: theme('fontFamily.display').join(', '),
              fontWeight: '600',
              color: 'hsl(var(--foreground))',
              verticalAlign: 'bottom',
              textAlign: 'start',
              paddingInlineEnd: '0.6em',
              paddingBottom: '0.6em',
            },
            'tbody td': { paddingTop: '0.6em', paddingBottom: '0.6em', paddingInlineEnd: '0.6em' },
            'tbody tr': { borderBottomColor: 'hsl(var(--border))' },

            // ---- hr / strong / images ----
            hr: { borderColor: 'hsl(var(--border))', marginTop: '2.5em', marginBottom: '2.5em' },
            strong: { fontWeight: '700' },
            img: { borderRadius: 'var(--radius)' },
          },
        },
      }),
    },
  },
  plugins: [animate, typography],
}
