import * as React from 'react'

// Card Components
export const Card = ({children, className = ''}: any) => (
  <div className={`bg-white rounded-lg shadow p-4 ${className}`}>{children}</div>
)
export const CardHeader = ({children, className = ''}: any) => (
  <div className={`mb-4 ${className}`}>{children}</div>
)
export const CardTitle = ({children, className = ''}: any) => (
  <h3 className={`text-lg font-semibold ${className}`}>{children}</h3>
)
export const CardDescription = ({children, className = ''}: any) => (
  <p className={`text-sm text-gray-600 ${className}`}>{children}</p>
)
export const CardContent = ({children, className = ''}: any) => (
  <div className={className}>{children}</div>
)
export const CardFooter = ({children, className = ''}: any) => (
  <div className={`mt-4 ${className}`}>{children}</div>
)

// Button
export const Button = React.forwardRef(({children, variant = 'default', size = 'default', className = '', ...props}: any, ref: any) => (
  <button
    ref={ref}
    className={`px-4 py-2 rounded font-medium transition-colors
      ${variant === 'destructive' ? 'bg-red-500 text-white hover:bg-red-600' : 
        variant === 'outline' ? 'border border-gray-300 hover:bg-gray-100' :
        variant === 'secondary' ? 'bg-gray-100 hover:bg-gray-200' :
        variant === 'ghost' ? 'hover:bg-gray-100' :
        variant === 'link' ? 'text-blue-600 hover:underline' :
        'bg-blue-500 text-white hover:bg-blue-600'}
      ${size === 'sm' ? 'px-3 py-1 text-sm' : 
        size === 'lg' ? 'px-6 py-3 text-lg' :
        size === 'icon' ? 'p-2' : ''}
      ${className}`}
    {...props}
  >
    {children}
  </button>
))

// Badge
export const Badge = ({children, variant = 'default', className = ''}: any) => (
  <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full
    ${variant === 'destructive' ? 'bg-red-100 text-red-800' :
      variant === 'secondary' ? 'bg-gray-100 text-gray-800' :
      variant === 'outline' ? 'border border-gray-300' :
      'bg-blue-100 text-blue-800'}
    ${className}`}>
    {children}
  </span>
)

// Alert
export const Alert = ({children, className = ''}: any) => (
  <div className={`p-4 rounded-lg border ${className}`}>{children}</div>
)
export const AlertDescription = ({children}: any) => (
  <div className="text-sm">{children}</div>
)
export const AlertTitle = ({children}: any) => (
  <h5 className="font-medium mb-1">{children}</h5>
)

// Avatar
export const Avatar = ({children, className = ''}: any) => (
  <div className={`relative rounded-full overflow-hidden w-10 h-10 ${className}`}>{children}</div>
)
export const AvatarImage = ({src, alt = ''}: any) => (
  <img src={src} alt={alt} className="w-full h-full object-cover" />
)
export const AvatarFallback = ({children}: any) => (
  <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-600">{children}</div>
)

// Dialog
export const Dialog = ({children, open}: any) => {
  if (!open) return null
  return <div className="fixed inset-0 z-50">{children}</div>
}
export const DialogContent = ({children}: any) => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="bg-black bg-opacity-50 absolute inset-0" />
    <div className="bg-white rounded-lg p-6 z-10 max-w-md w-full">{children}</div>
  </div>
)
export const DialogHeader = ({children}: any) => (
  <div className="mb-4">{children}</div>
)
export const DialogTitle = ({children}: any) => (
  <h2 className="text-xl font-bold">{children}</h2>
)
export const DialogDescription = ({children}: any) => (
  <p className="text-sm text-gray-600">{children}</p>
)
export const DialogTrigger = ({children}: any) => <>{children}</>
export const DialogFooter = ({children}: any) => (
  <div className="mt-4 flex justify-end space-x-2">{children}</div>
)
export const DialogClose = ({children}: any) => <>{children}</>
export const DialogPortal = ({children}: any) => <>{children}</>
export const DialogOverlay = () => null

// Dropdown Menu
export const DropdownMenu = ({children}: any) => (
  <div className="relative inline-block">{children}</div>
)
export const DropdownMenuContent = ({children}: any) => (
  <div className="absolute mt-2 bg-white border rounded shadow-lg z-10">{children}</div>
)
export const DropdownMenuItem = ({children, onClick}: any) => (
  <div className="px-4 py-2 hover:bg-gray-100 cursor-pointer" onClick={onClick}>{children}</div>
)
export const DropdownMenuTrigger = ({children}: any) => <>{children}</>
export const DropdownMenuLabel = ({children}: any) => (
  <div className="px-4 py-2 font-semibold text-sm">{children}</div>
)
export const DropdownMenuSeparator = () => <hr className="my-1" />

// Tabs
export const Tabs = ({children, defaultValue, className = ''}: any) => (
  <div className={className}>{children}</div>
)
export const TabsList = ({children, className = ''}: any) => (
  <div className={`flex space-x-2 border-b ${className}`}>{children}</div>
)
export const TabsTrigger = ({children, value}: any) => (
  <button className="px-4 py-2 hover:bg-gray-100">{children}</button>
)
export const TabsContent = ({children, value}: any) => (
  <div className="mt-4">{children}</div>
)

// Form Components
export const Label = React.forwardRef(({children, className = '', ...props}: any, ref: any) => (
  <label ref={ref} className={`block text-sm font-medium mb-1 ${className}`} {...props}>{children}</label>
))

export const Input = React.forwardRef(({className = '', ...props}: any, ref: any) => (
  <input
    ref={ref}
    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    {...props}
  />
))

export const Textarea = React.forwardRef(({className = '', ...props}: any, ref: any) => (
  <textarea
    ref={ref}
    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    {...props}
  />
))

export const Checkbox = React.forwardRef(({className = '', ...props}: any, ref: any) => (
  <input
    ref={ref}
    type="checkbox"
    className={`rounded border-gray-300 ${className}`}
    {...props}
  />
))

// Select
export const Select = ({children, ...props}: any) => (
  <select className="w-full px-3 py-2 border rounded-md" {...props}>{children}</select>
)
export const SelectTrigger = ({children, className = ''}: any) => (
  <div className={`w-full px-3 py-2 border rounded-md cursor-pointer ${className}`}>{children}</div>
)
export const SelectContent = ({children}: any) => <>{children}</>
export const SelectItem = ({value, children}: any) => (
  <option value={value}>{children}</option>
)
export const SelectValue = ({placeholder}: any) => (
  <span className="text-gray-500">{placeholder}</span>
)
export const SelectGroup = ({children}: any) => <>{children}</>
export const SelectLabel = ({children}: any) => (
  <span className="font-semibold">{children}</span>
)
export const SelectSeparator = () => <hr />

// Switch
export const Switch = ({checked, onCheckedChange, className = ''}: any) => (
  <button
    onClick={() => onCheckedChange?.(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
      ${checked ? 'bg-blue-600' : 'bg-gray-300'} ${className}`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
        ${checked ? 'translate-x-6' : 'translate-x-1'}`}
    />
  </button>
)

// Separator
export const Separator = ({className = '', orientation = 'horizontal'}: any) => (
  <hr className={`${orientation === 'vertical' ? 'h-full w-px' : 'w-full h-px'} bg-gray-200 border-0 ${className}`} />
)

// Progress
export const Progress = ({value = 0, className = ''}: any) => (
  <div className={`w-full bg-gray-200 rounded-full h-2 overflow-hidden ${className}`}>
    <div
      className="h-full bg-blue-600 transition-all"
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
)

// ScrollArea
export const ScrollArea = ({children, className = ''}: any) => (
  <div className={`overflow-auto ${className}`}>{children}</div>
)

// Toast
export const toast = (options: any) => {
  console.log('Toast:', options)
}

export const useToast = () => ({
  toast: (options: any) => console.log('Toast:', options)
})

// Toaster component for toast notifications
export const Toaster = () => null

// Command/Combobox components
export const Command = ({children}: any) => <div>{children}</div>
export const CommandInput = (props: any) => <Input {...props} />
export const CommandList = ({children}: any) => <div>{children}</div>
export const CommandEmpty = ({children}: any) => <div className="p-4 text-center text-gray-500">{children}</div>
export const CommandGroup = ({children}: any) => <div>{children}</div>
export const CommandItem = ({children, onSelect}: any) => (
  <div className="px-2 py-1 hover:bg-gray-100 cursor-pointer" onClick={onSelect}>{children}</div>
)
export const CommandSeparator = () => <hr className="my-2" />

// Popover
export const Popover = ({children}: any) => <div className="relative">{children}</div>
export const PopoverTrigger = ({children}: any) => <>{children}</>
export const PopoverContent = ({children}: any) => (
  <div className="absolute z-10 mt-2 bg-white border rounded shadow-lg p-4">{children}</div>
)

// Sheet
export const Sheet = ({children}: any) => <div>{children}</div>
export const SheetTrigger = ({children}: any) => <>{children}</>
export const SheetContent = ({children}: any) => (
  <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-lg p-6">{children}</div>
)
export const SheetHeader = ({children}: any) => <div className="mb-4">{children}</div>
export const SheetTitle = ({children}: any) => <h2 className="text-xl font-bold">{children}</h2>
export const SheetDescription = ({children}: any) => <p className="text-sm text-gray-600">{children}</p>

// Accordion
export const Accordion = ({children}: any) => <div>{children}</div>
export const AccordionItem = ({children}: any) => <div className="border-b">{children}</div>
export const AccordionTrigger = ({children}: any) => (
  <button className="w-full py-4 text-left hover:bg-gray-50">{children}</button>
)
export const AccordionContent = ({children}: any) => <div className="pb-4">{children}</div>

// Tooltip
export const Tooltip = ({children}: any) => <div className="relative">{children}</div>
export const TooltipTrigger = ({children}: any) => <>{children}</>
export const TooltipContent = ({children}: any) => (
  <div className="absolute z-10 bg-gray-900 text-white text-sm rounded px-2 py-1">{children}</div>
)
export const TooltipProvider = ({children}: any) => <>{children}</>

// Form
export const Form = ({children, ...props}: any) => <form {...props}>{children}</form>
export const FormItem = ({children}: any) => <div className="mb-4">{children}</div>
export const FormLabel = Label
export const FormControl = ({children}: any) => <>{children}</>
export const FormDescription = ({children}: any) => <p className="text-sm text-gray-600 mt-1">{children}</p>
export const FormMessage = ({children}: any) => <p className="text-sm text-red-600 mt-1">{children}</p>
export const FormField = ({render}: any) => render()

// Table
export const Table = ({children}: any) => <table className="w-full">{children}</table>
export const TableHeader = ({children}: any) => <thead>{children}</thead>
export const TableBody = ({children}: any) => <tbody>{children}</tbody>
export const TableRow = ({children}: any) => <tr className="border-b">{children}</tr>
export const TableHead = ({children}: any) => <th className="text-left p-2">{children}</th>
export const TableCell = ({children}: any) => <td className="p-2">{children}</td>

// Slider
export const Slider = ({value, onValueChange, max = 100, className = ''}: any) => (
  <input
    type="range"
    value={value}
    onChange={(e) => onValueChange?.([parseInt(e.target.value)])}
    max={max}
    className={`w-full ${className}`}
  />
)

// RadioGroup
export const RadioGroup = ({children, ...props}: any) => <div {...props}>{children}</div>
export const RadioGroupItem = ({value, ...props}: any) => (
  <input type="radio" value={value} {...props} />
)

// NavigationMenu
export const NavigationMenu = ({children}: any) => <nav>{children}</nav>
export const NavigationMenuList = ({children}: any) => <ul className="flex space-x-4">{children}</ul>
export const NavigationMenuItem = ({children}: any) => <li>{children}</li>
export const NavigationMenuTrigger = ({children}: any) => <button className="px-3 py-2">{children}</button>
export const NavigationMenuContent = ({children}: any) => <div>{children}</div>
export const NavigationMenuLink = ({children, href}: any) => <a href={href}>{children}</a>

// Calendar
export const Calendar = ({mode, selected, onSelect}: any) => (
  <div className="p-4 border rounded">Calendar placeholder</div>
)

// DatePicker
export const DatePicker = ({date, onDateChange}: any) => (
  <Input type="date" value={date} onChange={(e: any) => onDateChange?.(e.target.value)} />
)

// Collapsible
export const Collapsible = ({children}: any) => <div>{children}</div>
export const CollapsibleTrigger = ({children}: any) => <button>{children}</button>
export const CollapsibleContent = ({children}: any) => <div>{children}</div>

// ContextMenu
export const ContextMenu = ({children}: any) => <div>{children}</div>
export const ContextMenuTrigger = ({children}: any) => <>{children}</>
export const ContextMenuContent = ({children}: any) => <div className="bg-white border rounded shadow">{children}</div>
export const ContextMenuItem = ({children}: any) => <div className="px-3 py-2 hover:bg-gray-100">{children}</div>

// HoverCard
export const HoverCard = ({children}: any) => <div className="relative">{children}</div>
export const HoverCardTrigger = ({children}: any) => <>{children}</>
export const HoverCardContent = ({children}: any) => (
  <div className="absolute z-10 bg-white border rounded shadow p-4">{children}</div>
)

// Menubar
export const Menubar = ({children}: any) => <div className="flex space-x-4">{children}</div>
export const MenubarMenu = ({children}: any) => <div className="relative">{children}</div>
export const MenubarTrigger = ({children}: any) => <button className="px-3 py-2">{children}</button>
export const MenubarContent = ({children}: any) => (
  <div className="absolute mt-2 bg-white border rounded shadow">{children}</div>
)
export const MenubarItem = ({children}: any) => <div className="px-3 py-2 hover:bg-gray-100">{children}</div>

// Toggle
export const Toggle = ({pressed, onPressedChange, children}: any) => (
  <button
    onClick={() => onPressedChange?.(!pressed)}
    className={`px-3 py-2 rounded ${pressed ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
  >
    {children}
  </button>
)

// ToggleGroup
export const ToggleGroup = ({children}: any) => <div className="flex space-x-2">{children}</div>
export const ToggleGroupItem = ({value, children}: any) => (
  <button className="px-3 py-2 rounded hover:bg-gray-100">{children}</button>
)

// Skeleton
export const Skeleton = ({className = ''}: any) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
)

// AspectRatio
export const AspectRatio = ({ratio = 1, children}: any) => (
  <div style={{ paddingBottom: `${100 / ratio}%` }} className="relative">
    <div className="absolute inset-0">{children}</div>
  </div>
)