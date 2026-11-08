import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Roam · Travel expenses',description:'A little less accounting. A little more adventure.',manifest:'/manifest.webmanifest',icons:{icon:'/icon.svg',apple:'/icon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
