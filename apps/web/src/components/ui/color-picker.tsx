'use client'

import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Input } from './input'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

interface ColorPickerProps {
  id?: string
  value: string
  onChange: (value: string) => void
  className?: string
}

export function ColorPicker({ id, value, onChange, className }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hue, setHue] = useState(0)
  const [saturation, setSaturation] = useState(0)
  const [lightness, setLightness] = useState(0)

  // Parse HSL value
  useEffect(() => {
    const match = value.match(/(\d+(?:\.\d+)?)\s*(\d+(?:\.\d+)?)%?\s*(\d+(?:\.\d+)?)%?/)
    if (match) {
      setHue(parseFloat(match[1]))
      setSaturation(parseFloat(match[2]))
      setLightness(parseFloat(match[3]))
    }
  }, [value])

  const handleHueChange = (newHue: number) => {
    setHue(newHue)
    updateValue(newHue, saturation, lightness)
  }

  const handleSaturationLightnessChange = (newSaturation: number, newLightness: number) => {
    setSaturation(newSaturation)
    setLightness(newLightness)
    updateValue(hue, newSaturation, newLightness)
  }

  const updateValue = (h: number, s: number, l: number) => {
    onChange(`${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}%`)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          className={cn(
            "h-10 w-10 rounded-md border border-input shadow-sm transition-colors hover:border-ring focus:outline-none focus:ring-2 focus:ring-ring",
            className
          )}
          style={{ backgroundColor: `hsl(${value})` }}
          aria-label="Pick a color"
        />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-3">
          {/* Saturation/Lightness picker */}
          <div
            className="relative h-32 w-full rounded-md cursor-crosshair"
            style={{
              background: `
                linear-gradient(to bottom, transparent, black),
                linear-gradient(to right, white, hsl(${hue}, 100%, 50%))
              `,
            }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const x = e.clientX - rect.left
              const y = e.clientY - rect.top
              const newSaturation = (x / rect.width) * 100
              const newLightness = 100 - (y / rect.height) * 100
              handleSaturationLightnessChange(newSaturation, newLightness)
            }}
          >
            <div
              className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
              style={{
                left: `${saturation}%`,
                top: `${100 - lightness}%`,
                backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
              }}
            />
          </div>

          {/* Hue slider */}
          <div className="space-y-1">
            <label className="text-xs font-medium">Hue</label>
            <input
              type="range"
              min="0"
              max="360"
              value={hue}
              onChange={(e) => handleHueChange(Number(e.target.value))}
              className="w-full h-3 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, 
                  hsl(0, 100%, 50%), 
                  hsl(60, 100%, 50%), 
                  hsl(120, 100%, 50%), 
                  hsl(180, 100%, 50%), 
                  hsl(240, 100%, 50%), 
                  hsl(300, 100%, 50%), 
                  hsl(360, 100%, 50%)
                )`,
              }}
            />
          </div>

          {/* Manual input */}
          <div className="space-y-1">
            <label className="text-xs font-medium">HSL Value</label>
            <Input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="e.g., 222.2 47.4% 11.2%"
              className="h-8 text-xs"
            />
          </div>

          {/* Preview */}
          <div className="flex items-center space-x-2">
            <div
              className="h-8 w-8 rounded border"
              style={{ backgroundColor: `hsl(${value})` }}
            />
            <span className="text-xs font-mono">{value}</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}