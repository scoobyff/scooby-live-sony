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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { u: username, p: password, url, cats } = req.query;

  if (!url || !username || !password) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const cleanUrl = Array.isArray(url) ? url[0] : url;
    const decodedUrl = decodeURIComponent(cleanUrl);
    const decodedUsername = Array.isArray(username) ? username[0] : username;
    const decodedPassword = Array.isArray(password) ? password[0] : password;
    
    let categories: string[] = [];
    if (cats) {
      const catsStr = Array.isArray(cats) ? cats[0] : cats;
      try {
        categories = JSON.parse(decodeURIComponent(catsStr));
      } catch (e) {
        console.warn('Failed to parse categories:', e);
      }
    }

    // Get categories for mapping
    const categoriesUrl = `${decodedUrl}/player_api.php?username=${decodedUsername}&password=${decodedPassword}&action=get_live_categories`;
    const categoriesResponse = await fetch(categoriesUrl);
    
    if (!categoriesResponse.ok) {
      throw new Error('Failed to fetch categories');
    }
    
    const allCategories: Category[] = await categoriesResponse.json();
    const categoryMap = new Map<string, string>();
    
    allCategories.forEach(cat => {
      categoryMap.set(cat.category_id, cat.category_name);
    });

    // Get streams
    const streamsUrl = `${decodedUrl}/player_api.php?username=${decodedUsername}&password=${decodedPassword}&action=get_live_streams`;
    const streamsResponse = await fetch(streamsUrl);
    
    if (!streamsResponse.ok) {
      throw new Error('Failed to fetch streams');
    }

    const allStreams: Channel[] = await streamsResponse.json();
    
    // Filter streams by categories
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
      
      // Clean channel name (remove problematic characters for M3U)
      const cleanChannelName = channelName.replace(/[,\n\r]/g, ' ').trim();
      const cleanCategoryName = categoryName.replace(/[,\n\r]/g, ' ').trim();
      
      // Add channel info
      m3uContent += `#EXTINF:-1 tvg-id="${epgId}" tvg-name="${cleanChannelName}" tvg-logo="${logoUrl}" group-title="${cleanCategoryName}",${cleanChannelName}\n`;
      
      // Add stream URL
      const streamUrl = `${decodedUrl}/live/${decodedUsername}/${decodedPassword}/${stream.stream_id}.ts`;
      m3uContent += `${streamUrl}\n`;
    });

    // Set appropriate headers for M3U file
    res.setHeader('Content-Type', 'audio/x-mpegurl');
    res.setHeader('Content-Disposition', `attachment; filename="xtream_playlist_${Date.now()}.m3u"`);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    // Send the M3U content
    res.status(200).send(m3uContent);

  } catch (error) {
    console.error('Error serving M3U:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to serve M3U playlist' 
    });
  }
}