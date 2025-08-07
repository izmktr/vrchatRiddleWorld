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
    // VRChatの画像URLかどうかチェック
    const isVRChatImage = url.includes('vrchat.com') || url.includes('vrcimg.com')

    const headers: Record<string, string> = {
      'Accept': 'image/*,*/*;q=0.8',
      'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
    }

    // VRChatの画像の場合はUser-Agentを追加
    if (isVRChatImage) {
      headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    const response = await fetch(url, {
      headers,
      method: 'GET',
    })

    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status} ${response.statusText}`)
      return res.status(response.status).json({ 
        error: `Failed to fetch image: ${response.statusText}` 
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

    // 画像データをストリーミング
    const buffer = await response.arrayBuffer()
    res.send(Buffer.from(buffer))

  } catch (error) {
    console.error('Error proxying image:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
