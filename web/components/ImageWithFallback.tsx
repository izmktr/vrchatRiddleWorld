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
  const [useDirectImage, setUseDirectImage] = useState(false)

  const handleError = () => {
    if (!useDirectImage && src.includes('api.vrchat.cloud')) {
      // VRChat APIの場合、Next.jsの画像最適化を迂回して直接表示を試す
      setUseDirectImage(true)
      setImgSrc(src) // 元のURLに戻す
    } else {
      setHasError(true)
      // フォールバック画像のURL
      setImgSrc('https://via.placeholder.com/256x256/e5e7eb/6b7280?text=No+Image')
    }
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

  // VRChat APIで直接画像表示を使用する場合
  if (useDirectImage) {
    return (
      <img
        src={imgSrc}
        alt={alt}
        className={className}
        onError={handleError}
        style={fill ? { width: '100%', height: '100%', objectFit: 'cover' } : undefined}
        width={width}
        height={height}
      />
    )
  }

  return (
    <Image
      src={imgSrc}
      alt={alt}
      fill={fill}
      width={width}
      height={height}
      className={className}
      onError={handleError}
      unoptimized={src.includes('api.vrchat.cloud')} // VRChat APIの場合は最適化を無効化
      {...props}
    />
  )
}

export default ImageWithFallback
