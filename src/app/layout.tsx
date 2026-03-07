import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: '369 Studios | Interactive',
    description: 'Creative Digital Experiences',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
