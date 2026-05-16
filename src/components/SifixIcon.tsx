/**
 * SIFIX Icon Component
 * Reusable icon component that uses the SIFIX logo
 */

interface SifixIconProps {
  size?: number
  className?: string
  style?: React.CSSProperties
  variant?: "white" | "logo" | "favicon"
}

export function SifixIcon({ size = 16, className = "", style = {}, variant = "white" }: SifixIconProps) {
  const assetMap = {
    white: "assets/sifix-white.png",
    logo: "assets/sifix-logo.png",
    favicon: "assets/sifix-favicon.png"
  }

  const logoUrl = chrome.runtime.getURL(assetMap[variant])

  return (
    <img
      src={logoUrl}
      alt="SIFIX"
      className={className}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        ...style
      }}
    />
  )
}
