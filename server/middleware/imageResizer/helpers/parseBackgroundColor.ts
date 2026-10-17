import { RGBColor, WHITE } from '../interfaces'

/**
 * Parse background color from query parameter
 * Supports: 'white', 'black', hex ('ff0000', '#ff0000'), rgb ('255,255,255')
 */
export function parseBackgroundColor(color: string): RGBColor {
  const namedColors: Record<string, RGBColor> = {
    white: WHITE,
    black: { r: 0, g: 0, b: 0 },
    red: { r: 255, g: 0, b: 0 },
    green: { r: 0, g: 255, b: 0 },
    blue: { r: 0, g: 0, b: 255 },
    gray: { r: 128, g: 128, b: 128 },
    grey: { r: 128, g: 128, b: 128 },
  }

  // Named color
  if (namedColors[color.toLowerCase()]) {
    return namedColors[color.toLowerCase()]
  }

  // Hex color (with or without #)
  const hex = color.replace(/^#/, '')
  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    }
  }

  // RGB format: 255,255,255
  const rgbMatch = color.match(/^(\d{1,3}),(\d{1,3}),(\d{1,3})$/)
  if (rgbMatch) {
    return {
      r: Math.min(255, parseInt(rgbMatch[1])),
      g: Math.min(255, parseInt(rgbMatch[2])),
      b: Math.min(255, parseInt(rgbMatch[3])),
    }
  }

  // Default to white
  return WHITE
}
