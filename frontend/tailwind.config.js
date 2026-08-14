export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#050505',
        surface: '#0f0f11', // Slightly lighter than background, or you can use rgba in classes
        border: 'rgba(255,255,255,0.05)',
        primary: '#3b82f6',
        success: '#10b981',
        danger: '#ef4444',
      }
    },
  },
  plugins: [],
}
