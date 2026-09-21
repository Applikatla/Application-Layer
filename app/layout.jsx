import './globals.css';

export const metadata = {
  title: 'ALAD: Application-Layer Attack Detection System',
  description: 'Application-Layer Attack Detection from Internal Application State',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2300f2fe'><path d='M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'/></svg>",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#0a0d14] text-slate-100 font-['Plus_Jakarta_Sans',sans-serif] antialiased selection:bg-cyan-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
