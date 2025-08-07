import Image from 'next/image'
import { useState } from 'react'

interface ImageWithFallbackProps {
  src: string
  alt: string
  fill?: boolean
  className?: string
  width?: number
  height?: number
}

const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  fill,
  className,
  width,
  height,
  ...props
}) => {
  const [imgSrc, setImgSrc] = useState(src)
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // VRChatの画像URLかどうかチェック
  const needsProxy = src.includes('vrchat.com') || src.includes('vrcimg.com') || src.includes('api.vrchat.cloud')
  
  // プロキシが必要な場合はプロキシ経由のURLを使用
  const imageUrl = needsProxy 
    ? `/api/proxy-image?url=${encodeURIComponent(src)}`
    : src

  const handleError = () => {
    console.warn(`Failed to load image: ${src}`)
    setHasError(true)
    setIsLoading(false)
  }

  const handleLoad = () => {
    setIsLoading(false)
  }

  if (hasError) {
    return (
      <div className={`flex items-center justify-center bg-gray-200 text-gray-500 ${className}`}>
        <div className="text-center">
          <div className="text-4xl mb-2">🖼️</div>
          <div className="text-sm">画像なし</div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className={`absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center ${className}`}>
          <span className="text-gray-400 text-xs">Loading...</span>
        </div>
      )}
      <Image
        src={imageUrl}
        alt={alt}
        fill={fill}
        width={width}
        height={height}
        className={className}
        onError={handleError}
        onLoad={handleLoad}
        unoptimized={needsProxy} // プロキシ経由の場合は最適化を無効化
        {...props}
      />
    </div>
  )
}

export default ImageWithFallback
