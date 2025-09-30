/** @type {import('tailwindcss').Config} */
// VeloHub V3 - Tailwind CSS Configuration
// VERSION: v1.2.0 | DATE: 2025-01-29 | AUTHOR: VeloHub Development Team

module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Cores oficiais da marca VeloHub
      colors: {
        'velohub-white': '#F3F7FC',
        'velohub-gray': '#272A30',
        'velohub-blue-dark': '#000058',
        'velohub-blue-light': '#1E3A8A',
        'velohub-blue-medium': '#3B82F6',
        'velohub-blue-accent': '#60A5FA',
        'velohub-orange': '#F97316',
        'velohub-orange-light': '#FB923C',
        'velohub-green': '#10B981',
        'velohub-green-light': '#34D399',
        'velohub-red': '#EF4444',
        'velohub-red-light': '#F87171',
        'velohub-yellow': '#F59E0B',
        'velohub-yellow-light': '#FBBF24',
        'velohub-purple': '#8B5CF6',
        'velohub-purple-light': '#A78BFA',
        'velohub-pink': '#EC4899',
        'velohub-pink-light': '#F472B6',
        'velohub-indigo': '#6366F1',
        'velohub-indigo-light': '#818CF8',
        'velohub-teal': '#14B8A6',
        'velohub-teal-light': '#2DD4BF',
        'velohub-cyan': '#06B6D4',
        'velohub-cyan-light': '#22D3EE',
        'velohub-lime': '#84CC16',
        'velohub-lime-light': '#A3E635',
        'velohub-emerald': '#059669',
        'velohub-emerald-light': '#10B981',
        'velohub-rose': '#F43F5E',
        'velohub-rose-light': '#FB7185',
        'velohub-amber': '#D97706',
        'velohub-amber-light': '#F59E0B',
        'velohub-slate': '#64748B',
        'velohub-slate-light': '#94A3B8',
        'velohub-zinc': '#71717A',
        'velohub-zinc-light': '#A1A1AA',
        'velohub-neutral': '#737373',
        'velohub-neutral-light': '#A3A3A3',
        'velohub-stone': '#78716C',
        'velohub-stone-light': '#A8A29E',
      },
      
      // Tipografia personalizada
      fontFamily: {
        'velohub': ['Poppins', 'sans-serif'],
        'velohub-secondary': ['Anton', 'sans-serif'],
        'velohub-mono': ['JetBrains Mono', 'monospace'],
      },
      
      // Sombras personalizadas
      boxShadow: {
        'velohub': '0 4px 6px -1px rgba(0, 0, 88, 0.1), 0 2px 4px -1px rgba(0, 0, 88, 0.06)',
        'velohub-lg': '0 10px 15px -3px rgba(0, 0, 88, 0.1), 0 4px 6px -2px rgba(0, 0, 88, 0.05)',
        'velohub-xl': '0 20px 25px -5px rgba(0, 0, 88, 0.1), 0 10px 10px -5px rgba(0, 0, 88, 0.04)',
        'velohub-2xl': '0 25px 50px -12px rgba(0, 0, 88, 0.25)',
        'velohub-inner': 'inset 0 2px 4px 0 rgba(0, 0, 88, 0.06)',
      },
      
      // Border radius personalizado
      borderRadius: {
        'velohub': '0.5rem',
        'velohub-lg': '0.75rem',
        'velohub-xl': '1rem',
        'velohub-2xl': '1.5rem',
        'velohub-3xl': '2rem',
      },
      
      // Transições personalizadas
      transitionTimingFunction: {
        'velohub': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'velohub-in': 'cubic-bezier(0.4, 0, 1, 1)',
        'velohub-out': 'cubic-bezier(0, 0, 0.2, 1)',
        'velohub-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      
      // Durações de transição personalizadas
      transitionDuration: {
        'velohub': '300ms',
        'velohub-fast': '150ms',
        'velohub-slow': '500ms',
      },
      
      // Espaçamentos personalizados
      spacing: {
        'velohub': '1.5rem',
        'velohub-lg': '2rem',
        'velohub-xl': '3rem',
        'velohub-2xl': '4rem',
        'velohub-3xl': '6rem',
      },
      
      // Tamanhos personalizados
      width: {
        'velohub': '18rem',
        'velohub-lg': '24rem',
        'velohub-xl': '32rem',
        'velohub-2xl': '48rem',
      },
      
      height: {
        'velohub': '18rem',
        'velohub-lg': '24rem',
        'velohub-xl': '32rem',
        'velohub-2xl': '48rem',
      },
      
      // Z-index personalizado
      zIndex: {
        'velohub': '1000',
        'velohub-dropdown': '1001',
        'velohub-sticky': '1002',
        'velohub-fixed': '1003',
        'velohub-modal-backdrop': '1004',
        'velohub-modal': '1005',
        'velohub-popover': '1006',
        'velohub-tooltip': '1007',
        'velohub-toast': '1008',
      },
    },
  },
  plugins: [],
}
