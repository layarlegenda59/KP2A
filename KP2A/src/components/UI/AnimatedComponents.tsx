import React from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { ReactNode } from 'react'

// Animated Card with hover effects
interface AnimatedCardProps extends HTMLMotionProps<'div'> {
  children: ReactNode
  hoverScale?: number
  hoverY?: number
  className?: string
}

export function AnimatedCard({ 
  children, 
  hoverScale = 1.02, 
  hoverY = -4, 
  className = '', 
  ...props 
}: AnimatedCardProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ 
        scale: hoverScale, 
        y: hoverY,
        transition: { duration: 0.2, ease: 'easeOut' }
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// Animated Button with ripple effect
interface AnimatedButtonProps extends HTMLMotionProps<'button'> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function AnimatedButton({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}: AnimatedButtonProps) {
  const baseClasses = 'relative overflow-hidden font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800'
  
  const variantClasses = {
    primary: 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400',
    secondary: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 focus:ring-gray-500 dark:focus:ring-gray-400',
    ghost: 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:ring-gray-500 dark:focus:ring-gray-400'
  }
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  }
  
  return (
    <motion.button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.1, ease: 'easeInOut' }}
      {...props}
    >
      <motion.div
        className="relative z-10"
        initial={false}
        animate={{ scale: 1 }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.1 }}
      >
        {children}
      </motion.div>
      
      {/* Ripple effect */}
      <motion.div
        className="absolute inset-0 bg-white dark:bg-gray-200 opacity-0"
        whileTap={{
          opacity: [0, 0.3, 0],
          scale: [0.8, 1.2, 1.4],
        }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />
    </motion.button>
  )
}

// Animated List Item
interface AnimatedListItemProps extends HTMLMotionProps<'div'> {
  children: ReactNode
  index?: number
  className?: string
}

export function AnimatedListItem({ 
  children, 
  index = 0, 
  className = '', 
  ...props 
}: AnimatedListItemProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ 
        duration: 0.3, 
        delay: index * 0.1,
        ease: 'easeOut' 
      }}
      whileHover={{ x: 4 }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// Animated Icon with bounce effect
interface AnimatedIconProps extends HTMLMotionProps<'div'> {
  children: ReactNode
  className?: string
  bounce?: boolean
}

export function AnimatedIcon({ 
  children, 
  className = '', 
  bounce = true, 
  ...props 
}: AnimatedIconProps) {
  return (
    <motion.div
      className={className}
      whileHover={bounce ? { 
        scale: 1.1,
        rotate: [0, -10, 10, -10, 0],
        transition: { duration: 0.5 }
      } : { scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      transition={{ duration: 0.2 }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// Animated Container with stagger children
interface AnimatedContainerProps extends HTMLMotionProps<'div'> {
  children: ReactNode
  className?: string
  staggerChildren?: number
}

export function AnimatedContainer({ 
  children, 
  className = '', 
  staggerChildren = 0.1, 
  ...props 
}: AnimatedContainerProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren,
            delayChildren: 0.1
          }
        }
      }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// Animated Badge with pulse effect
interface AnimatedBadgeProps extends HTMLMotionProps<'span'> {
  children: ReactNode
  variant?: 'success' | 'warning' | 'error' | 'info'
  pulse?: boolean
  className?: string
}

export function AnimatedBadge({ 
  children, 
  variant = 'info', 
  pulse = false, 
  className = '', 
  ...props 
}: AnimatedBadgeProps) {
  const variantClasses = {
    success: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700',
    warning: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700',
    error: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700',
    info: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700'
  }
  
  return (
    <motion.span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${variantClasses[variant]} ${className}`}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ 
        scale: 1, 
        opacity: 1,
        ...(pulse && {
          scale: [1, 1.05, 1],
          transition: {
            scale: {
              repeat: Infinity,
              duration: 2,
              ease: 'easeInOut'
            }
          }
        })
      }}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2 }}
      {...props}
    >
      {children}
    </motion.span>
  )
}

// Page transition wrapper
interface PageTransitionProps {
  children: ReactNode
  className?: string
}

export function PageTransition({ children, className = '' }: PageTransitionProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  )
}

// Floating Action Button
interface FloatingActionButtonProps extends HTMLMotionProps<'button'> {
  children: ReactNode
  className?: string
}

export function FloatingActionButton({ 
  children, 
  className = '', 
  ...props 
}: FloatingActionButtonProps) {
  return (
    <motion.button
      className={`fixed bottom-6 right-6 w-14 h-14 bg-blue-600 dark:bg-blue-500 text-white rounded-full shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-shadow ${className}`}
      whileHover={{ 
        scale: 1.1,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}
      whileTap={{ scale: 0.9 }}
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ 
        type: 'spring',
        stiffness: 260,
        damping: 20
      }}
      {...props}
    >
      {children}
    </motion.button>
  )
}