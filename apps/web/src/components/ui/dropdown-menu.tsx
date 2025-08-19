export const DropdownMenu = ({children}: any) => <div className="relative">{children}</div>
export const DropdownMenuContent = ({children}: any) => <div className="absolute bg-white border rounded shadow">{children}</div>
export const DropdownMenuItem = ({children}: any) => <div className="px-3 py-2 hover:bg-gray-100">{children}</div>
export const DropdownMenuLabel = ({children}: any) => <div className="px-3 py-2 font-semibold">{children}</div>
export const DropdownMenuSeparator = () => <hr className="border-gray-200" />
export const DropdownMenuTrigger = ({children}: any) => <>{children}</>