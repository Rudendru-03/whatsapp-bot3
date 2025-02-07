import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AppSidebar } from '@/components/app-sidebar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'WhatsApp Chatbot',
  description: 'A WhatsApp chatbot for selling iPhones and managing conferences',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} flex flex-col h-full`}>
        <SidebarProvider>
          <AppSidebar className="fixed left-0 top-0 h-screen w-64 border-r" />
          <main className="ml-64 flex-1 min-h-screen p-4">
            <SidebarTrigger />
            {children}
          </main>
        </SidebarProvider>
      </body>
    </html>
  )
}