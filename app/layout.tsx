import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'CheckMate OS · Every Move Matters',description:'The business command center for CheckMate Events.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>;}
