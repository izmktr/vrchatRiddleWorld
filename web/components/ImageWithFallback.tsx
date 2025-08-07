import Image from 'next/image'
import { useState, useEffect } from 'react'

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
  // VRChatの画像URLかどうかチェック
  const needsProxy = src.includes('vrchat.com') || src.includes('vrcimg.com') || src.includes('api.vrchat.cloud')
  
  // 初期URLを直接計算
  const initialUrl = needsProxy 
    ? `/api/proxy-image?url=${encodeURIComponent(src)}`
    : src

  const [imgSrc, setImgSrc] = useState(initialUrl)
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    // srcが変更されたときにURLを再計算
    const imageUrl = needsProxy 
      ? `/api/proxy-image?url=${encodeURIComponent(src)}`
      : src
    
    console.log(`[ImageWithFallback] Loading image:`, { 
      originalSrc: src, 
      needsProxy, 
      finalUrl: imageUrl 
    })
    
    // 初期状態をリセット
    setHasError(false)
    setIsLoading(true)
    setRetryCount(0)
    setImgSrc(imageUrl)
  }, [src, needsProxy])

  const handleError = () => {
    console.warn(`[ImageWithFallback] Failed to load image (attempt ${retryCount + 1}):`, src)
    console.warn(`[ImageWithFallback] Image src was:`, imgSrc)
    
    // VRChatの画像で1回目の失敗の場合、元のURLで直接試す
    if (needsProxy && retryCount === 0) {
      console.log(`[ImageWithFallback] Retrying with direct URL:`, src)
      setRetryCount(1)
      setImgSrc(src)
      return
    }
    
    // 2回目の失敗またはVRChat以外の画像の場合、エラー状態に
    console.error(`[ImageWithFallback] Final error state for:`, src)
    setHasError(true)
    setIsLoading(false)
  }

  const handleLoad = () => {
    console.log(`[ImageWithFallback] Successfully loaded image:`, src)
    console.log(`[ImageWithFallback] Loaded image src was:`, imgSrc)
    setIsLoading(false)
    setHasError(false)
  }

  if (hasError) {
    return (
      <div className={`${fill ? 'absolute inset-0' : 'relative'} flex items-center justify-center bg-gray-200 text-gray-500 ${className || ''}`}>
        <div className="text-center">
          <div className="text-2xl mb-1">🖼️</div>
          <div className="text-xs">画像なし</div>
        </div>
      </div>
    )
  }

  return (
    <>
      {isLoading && (
        <div className={`${fill ? 'absolute inset-0' : 'relative'} bg-gray-200 animate-pulse flex items-center justify-center ${className || ''}`}>
          <span className="text-gray-400 text-xs">Loading...</span>
        </div>
      )}
      <Image
        src={imgSrc}
        alt={alt}
        fill={fill}
        width={width}
        height={height}
        className={`${className || ''} ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onError={handleError}
        onLoad={handleLoad}
        unoptimized={needsProxy || retryCount > 0} // プロキシ経由またはリトライ時は最適化を無効化
        priority={false}
        {...props}
      />
    </>
  )
}

export default ImageWithFallback
