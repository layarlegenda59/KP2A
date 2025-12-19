import React, { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { MobileSidebar } from './MobileSidebar'
import { AnimatedSidebar } from './AnimatedSidebar'
import { Header } from './Header'
import { Breadcrumb, CompactBreadcrumb } from '../UI/Breadcrumb'
import { FloatingQuickActions } from '../Dashboard/QuickActions'
import { SidebarProvider, useSidebar } from '../../contexts/SidebarContext'

interface MainLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

function MainLayoutContent({ children, title, subtitle }: MainLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isAnimatedSidebarOpen, setIsAnimatedSidebarOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const { isCollapsed } = useSidebar()

  // Check if screen is desktop size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 1024) // lg breakpoint
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)

    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen)
  }

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false)
  }

  const toggleAnimatedSidebar = () => {
    setIsAnimatedSidebarOpen(!isAnimatedSidebarOpen)
  }

  const closeAnimatedSidebar = () => {
    setIsAnimatedSidebarOpen(false)
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar isOpen={isMobileSidebarOpen} onClose={closeMobileSidebar} />

      {/* Animated Sidebar */}
      <AnimatedSidebar 
        isOpen={isAnimatedSidebarOpen} 
        onClose={closeAnimatedSidebar}
        isDesktop={isDesktop}
      />

      {/* Main Content */}
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
        isAnimatedSidebarOpen && isDesktop ? 'lg:mr-80' : ''
      }`}>
        <Header 
          title={title} 
          subtitle={subtitle} 
          onMenuClick={toggleMobileSidebar}
        />
        
        <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
          <div className="p-4 sm:p-6">
            {/* Breadcrumb Navigation */}
            <div className="hidden sm:block">
              <Breadcrumb />
            </div>
            <div className="block sm:hidden">
              <CompactBreadcrumb />
            </div>
            
            {children}
          </div>
        </main>
      </div>
      
      {/* Floating Quick Actions */}
      <FloatingQuickActions />
    </div>
  )
}

export function MainLayout({ children, title, subtitle }: MainLayoutProps) {
  return (
    <SidebarProvider>
      <MainLayoutContent title={title} subtitle={subtitle}>
        {children}
      </MainLayoutContent>
    </SidebarProvider>
  )
}