import { useState } from 'react'
import Image from 'next/image'

interface ProxiedImageProps {
  src?: string
  alt: string
  width: number
  height: number
  className?: string
  fallbackText?: string
}

/**
 * VRChat画像などの403エラーを回避するためのプロキシ経由画像コンポーネント
 */
export default function ProxiedImage({ 
  src, 
  alt, 
  width, 
  height, 
  className = '', 
  fallbackText = 'No Image'
}: ProxiedImageProps) {
  const [imageError, setImageError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // 画像URLがない場合やエラーの場合はフォールバック表示
  if (!src || imageError) {
    return (
      <div 
        className={`bg-gray-200 flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <span className="text-gray-400 text-xs">{fallbackText}</span>
      </div>
    )
  }

  // VRChatの画像URLかどうかチェック
  const needsProxy = src.includes('vrchat.com') || src.includes('vrcimg.com')
  
  // プロキシが必要な場合はプロキシ経由のURLを使用
  const imageUrl = needsProxy 
    ? `/api/proxy-image?url=${encodeURIComponent(src)}`
    : src

  return (
    <div className="relative" style={{ width, height }}>
      {isLoading && (
        <div 
          className={`absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center ${className}`}
        >
          <span className="text-gray-400 text-xs">Loading...</span>
        </div>
      )}
      <Image
        src={imageUrl}
        alt={alt}
        width={width}
        height={height}
        className={className}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setImageError(true)
          setIsLoading(false)
        }}
        unoptimized={needsProxy} // プロキシ経由の場合は最適化を無効化
      />
    </div>
  )
}
