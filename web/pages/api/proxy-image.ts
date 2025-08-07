import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { url } = req.query

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter is required' })
  }

  try {
    console.log(`[PROXY] Attempting to fetch: ${url}`)

    // VRChatの画像URLかどうかチェック
    const isVRChatImage = url.includes('vrchat.com') || url.includes('vrcimg.com') || url.includes('api.vrchat.cloud')
    console.log(`[PROXY] Is VRChat image: ${isVRChatImage}`)

    const headers: Record<string, string> = {
      'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    }

    // VRChatの画像の場合は適切なUser-Agentを追加
    if (isVRChatImage) {
      headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      headers['Referer'] = 'https://vrchat.com/'
      headers['Origin'] = 'https://vrchat.com'
      headers['Sec-Fetch-Dest'] = 'image'
      headers['Sec-Fetch-Mode'] = 'no-cors'
      headers['Sec-Fetch-Site'] = 'same-site'
      console.log(`[PROXY] Using VRChat-specific headers`)
    }

    const response = await fetch(url, {
      headers,
      method: 'GET',
    })

    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status} ${response.statusText}`)
      
      // VRChatの画像で403エラーの場合、異なるヘッダーで再試行
      if (isVRChatImage && response.status === 403) {
        console.log('Retrying with different headers...')
        
        const retryHeaders: Record<string, string> = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
          'Accept': 'image/avif,image/webp,*/*',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://hello.vrchat.com/',
          'Origin': 'https://hello.vrchat.com',
          'Connection': 'keep-alive',
          'Sec-Fetch-Dest': 'image',
          'Sec-Fetch-Mode': 'no-cors',
          'Sec-Fetch-Site': 'cross-site',
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
        
        const retryResponse = await fetch(url, {
          headers: retryHeaders,
          method: 'GET'
        })
        
        if (!retryResponse.ok) {
          return res.status(retryResponse.status).json({ 
            error: `Failed to fetch image after retry: ${retryResponse.statusText}`,
            originalUrl: url
          })
        }
        
        // 再試行が成功した場合、そのレスポンスを使用
        const retryContentType = retryResponse.headers.get('content-type')
        const retryContentLength = retryResponse.headers.get('content-length')

        if (retryContentType) {
          res.setHeader('Content-Type', retryContentType)
        }
        if (retryContentLength) {
          res.setHeader('Content-Length', retryContentLength)
        }

        res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600')
        res.setHeader('CDN-Cache-Control', 'public, max-age=3600')
        res.setHeader('Vary', 'Accept-Encoding')

        const retryBuffer = await retryResponse.arrayBuffer()
        return res.send(Buffer.from(retryBuffer))
      }
      
      return res.status(response.status).json({ 
        error: `Failed to fetch image: ${response.statusText}`,
        originalUrl: url
      })
    }

    const contentType = response.headers.get('content-type')
    const contentLength = response.headers.get('content-length')

    // レスポンスヘッダーを設定
    if (contentType) {
      res.setHeader('Content-Type', contentType)
    }
    if (contentLength) {
      res.setHeader('Content-Length', contentLength)
    }

    // キャッシュヘッダーを設定（1時間）
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600')
    res.setHeader('CDN-Cache-Control', 'public, max-age=3600')
    res.setHeader('Vary', 'Accept-Encoding')

    // 画像データをストリーミング
    const buffer = await response.arrayBuffer()
    console.log(`[PROXY] Successfully fetched image, size: ${buffer.byteLength} bytes`)
    res.send(Buffer.from(buffer))

  } catch (error) {
    console.error('[PROXY] Error proxying image:', error, 'URL:', url)
    res.status(500).json({ error: 'Internal server error' })
  }
}