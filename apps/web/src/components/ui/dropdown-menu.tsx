import * as React from 'react'

export const DropdownMenu = ({children}: {children: React.ReactNode}) => 
  <div className="relative">{children}</div>

export const DropdownMenuContent = ({children}: {children: React.ReactNode}) => 
  <div className="absolute bg-white border rounded shadow">{children}</div>

export const DropdownMenuItem = ({children, onClick}: {children: React.ReactNode, onClick?: () => void}) => 
  <div className="px-3 py-2 hover:bg-gray-100 cursor-pointer" onClick={onClick}>{children}</div>

export const DropdownMenuLabel = ({children}: {children: React.ReactNode}) => 
  <div className="px-3 py-2 font-semibold">{children}</div>

export const DropdownMenuSeparator = () => 
  <hr className="border-gray-200" />

export const DropdownMenuTrigger = ({children}: {children: React.ReactNode}) => 
  <>{children}</>