'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Globe, Check, Languages } from 'lucide-react'
import { 
  SUPPORTED_LANGUAGES, 
  type SupportedLanguage,
  getCurrentLanguage,
  setLanguage 
} from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface LanguageSwitcherProps {
  variant?: 'default' | 'ghost' | 'outline'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  showLabel?: boolean
  className?: string
}

export function LanguageSwitcher({ 
  variant = 'ghost', 
  size = 'icon',
  showLabel = false,
  className 
}: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation('common')
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>(getCurrentLanguage())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      setCurrentLang(lng as SupportedLanguage)
    }

    i18n.on('languageChanged', handleLanguageChange)
    return () => {
      i18n.off('languageChanged', handleLanguageChange)
    }
  }, [i18n])

  const handleLanguageChange = async (language: SupportedLanguage) => {
    if (language === currentLang) return
    
    setLoading(true)
    try {
      await setLanguage(language)
      
      // Show success message in the new language
      const successMessage = language === 'es' 
        ? 'Idioma cambiado a Español' 
        : 'Language changed to English'
      
      toast.success(successMessage)
    } catch (error) {
      console.error('Failed to change language:', error)
      toast.error(t('messages.errorOccurred'))
    } finally {
      setLoading(false)
    }
  }

  const currentLanguageConfig = SUPPORTED_LANGUAGES[currentLang]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size}
          className={cn(
            'gap-2',
            loading && 'opacity-50 cursor-wait',
            className
          )}
          disabled={loading}
          aria-label={t('accessibility.selectLanguage')}
        >
          <Languages className="h-4 w-4" />
          {showLabel && (
            <span className="hidden sm:inline-block">
              {currentLanguageConfig.nativeName}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {Object.entries(SUPPORTED_LANGUAGES).map(([code, config]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => handleLanguageChange(code as SupportedLanguage)}
            className={cn(
              'flex items-center justify-between',
              currentLang === code && 'bg-accent'
            )}
          >
            <span className="flex items-center gap-2">
              <span className="text-lg" role="img" aria-label={config.name}>
                {code === 'en' ? '🇺🇸' : '🇲🇽'}
              </span>
              <span>{config.nativeName}</span>
            </span>
            {currentLang === code && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Compact version for mobile
export function LanguageSwitcherCompact({ className }: { className?: string }) {
  const { i18n } = useTranslation()
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>(getCurrentLanguage())

  const toggleLanguage = async () => {
    const newLang: SupportedLanguage = currentLang === 'en' ? 'es' : 'en'
    await setLanguage(newLang)
    setCurrentLang(newLang)
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className={cn('px-2 py-1 h-auto', className)}
      aria-label="Toggle language"
    >
      <span className="text-xs font-medium">
        {currentLang === 'en' ? 'ES' : 'EN'}
      </span>
    </Button>
  )
}

// Accessible language switcher for screen readers
export function LanguageSwitcherAccessible() {
  const { t, i18n } = useTranslation('common')
  const currentLang = getCurrentLanguage()

  return (
    <div className="sr-only" role="navigation" aria-label="Language selection">
      <label htmlFor="language-select" className="sr-only">
        {t('accessibility.selectLanguage')}
      </label>
      <select
        id="language-select"
        value={currentLang}
        onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
        className="sr-only"
      >
        {Object.entries(SUPPORTED_LANGUAGES).map(([code, config]) => (
          <option key={code} value={code}>
            {config.name}
          </option>
        ))}
      </select>
    </div>
  )
}

export default LanguageSwitcher