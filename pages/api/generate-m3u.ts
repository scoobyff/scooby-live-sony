import type { NextApiRequest, NextApiResponse } from 'next';

interface Channel {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  epg_channel_id: string;
  added: string;
  category_id: string;
  custom_sid: string;
  tv_archive: number;
  direct_source: string;
  tv_archive_duration: number;
}

interface Category {
  category_id: string;
  category_name: string;
  parent_id: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, username, password, categories } = req.body;

  if (!url || !username || !password) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    // Clean URL
    const cleanUrl = url.replace(/\/$/, '');
    
    // Get all categories first (for mapping category names)
    const categoriesUrl = `${cleanUrl}/player_api.php?username=${username}&password=${password}&action=get_live_categories`;
    const categoriesResponse = await fetch(categoriesUrl);
    
    if (!categoriesResponse.ok) {
      throw new Error('Failed to fetch categories');
    }
    
    const allCategories: Category[] = await categoriesResponse.json();
    const categoryMap = new Map<string, string>();
    
    allCategories.forEach(cat => {
      categoryMap.set(cat.category_id, cat.category_name);
    });

    // Get live streams
    const streamsUrl = `${cleanUrl}/player_api.php?username=${username}&password=${password}&action=get_live_streams`;
    const streamsResponse = await fetch(streamsUrl);
    
    if (!streamsResponse.ok) {
      throw new Error('Failed to fetch streams');
    }

    const allStreams: Channel[] = await streamsResponse.json();
    
    // Filter streams by selected categories
    const filteredStreams = categories && categories.length > 0 
      ? allStreams.filter(stream => categories.includes(stream.category_id))
      : allStreams;

    // Generate M3U content
    let m3uContent = '#EXTM3U\n';
    
    filteredStreams.forEach(stream => {
      const categoryName = categoryMap.get(stream.category_id) || 'Unknown';
      const channelName = stream.name || `Channel ${stream.stream_id}`;
      const logoUrl = stream.stream_icon || '';
      const epgId = stream.epg_channel_id || '';
      
      // Add channel info
      m3uContent += `#EXTINF:-1 tvg-id="${epgId}" tvg-name="${channelName}" tvg-logo="${logoUrl}" group-title="${categoryName}",${channelName}\n`;
      
      // Add stream URL
      const streamUrl = `${cleanUrl}/live/${username}/${password}/${stream.stream_id}.ts`;
      m3uContent += `${streamUrl}\n`;
    });

    // Create a unique filename based on current timestamp
    const timestamp = Date.now();
    const filename = `xtream_playlist_${timestamp}.m3u`;
    
    // Store the M3U content (in a real application, you might want to use a database or file storage)
    // For Vercel, we'll create a dynamic endpoint that serves the M3U content
    const m3uUrl = `${req.headers.origin || 'https://your-domain.vercel.app'}/api/serve-m3u?id=${timestamp}&u=${encodeURIComponent(username)}&p=${encodeURIComponent(password)}&url=${encodeURIComponent(cleanUrl)}&cats=${encodeURIComponent(JSON.stringify(categories))}`;

    res.status(200).json({
      success: true,
      m3uUrl,
      channelCount: filteredStreams.length,
      filename
    });

  } catch (error) {
    console.error('Error generating M3U:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to generate M3U playlist' 
    });
  }
}