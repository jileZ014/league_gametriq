export const Avatar = ({children, className}: any) => <div className={`rounded-full overflow-hidden ${className}`}>{children}</div>
export const AvatarFallback = ({children}: any) => <div className="bg-gray-300 w-full h-full flex items-center justify-center">{children}</div>
export const AvatarImage = ({src, alt}: any) => <img src={src} alt={alt} className="w-full h-full object-cover" />