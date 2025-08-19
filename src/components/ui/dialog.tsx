import * as React from 'react'

export const Dialog = ({children, open}: {children: React.ReactNode, open?: boolean}) => 
  open ? <div className="fixed inset-0 z-50">{children}</div> : null

export const DialogContent = ({children}: {children: React.ReactNode}) => 
  <div className="bg-white p-6 rounded-lg">{children}</div>

export const DialogHeader = ({children}: {children: React.ReactNode}) => 
  <div className="mb-4">{children}</div>

export const DialogTitle = ({children}: {children: React.ReactNode}) => 
  <h2 className="text-xl font-bold">{children}</h2>

export const DialogTrigger = ({children}: {children: React.ReactNode}) => 
  <>{children}</>

export const DialogDescription = ({children}: {children: React.ReactNode}) => 
  <p className="text-sm text-gray-600">{children}</p>

export const DialogFooter = ({children}: {children: React.ReactNode}) => 
  <div className="flex justify-end space-x-2 mt-4">{children}</div>

export const DialogClose = ({children}: {children: React.ReactNode}) => 
  <>{children}</>

export const DialogPortal = ({children}: {children: React.ReactNode}) => 
  <>{children}</>

export const DialogOverlay = () => 
  <div className="fixed inset-0 bg-black bg-opacity-50" />