import type { NextApiRequest, NextApiResponse } from 'next';

interface Category {
  category_id: string;
  category_name: string;
  parent_id: number;
}

interface XtreamAuthResponse {
  user_info: {
    username: string;
    password: string;
    message: string;
    auth: number;
    status: string;
    exp_date: string;
    is_trial: string;
    active_cons: string;
    created_at: string;
    max_connections: string;
  };
  server_info: {
    url: string;
    port: string;
    https_port: string;
    server_protocol: string;
    rtmp_port: string;
    timezone: string;
    timestamp_now: number;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, username, password } = req.body;

  if (!url || !username || !password) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    // Clean URL - remove trailing slash
    const cleanUrl = url.replace(/\/$/, '');
    
    // First, authenticate with Xtream API
    const authUrl = `${cleanUrl}/player_api.php?username=${username}&password=${password}`;
    
    const authResponse = await fetch(authUrl);
    if (!authResponse.ok) {
      throw new Error('Failed to authenticate with Xtream server');
    }

    const authData: XtreamAuthResponse = await authResponse.json();
    
    if (!authData.user_info || authData.user_info.auth !== 1) {
      throw new Error('Invalid credentials or authentication failed');
    }

    // Get live TV categories
    const categoriesUrl = `${cleanUrl}/player_api.php?username=${username}&password=${password}&action=get_live_categories`;
    
    const categoriesResponse = await fetch(categoriesUrl);
    if (!categoriesResponse.ok) {
      throw new Error('Failed to fetch categories');
    }

    const categoriesData: Category[] = await categoriesResponse.json();
    
    // Filter out empty categories and sort by name
    const filteredCategories = categoriesData
      .filter(cat => cat.category_name && cat.category_name.trim() !== '')
      .sort((a, b) => a.category_name.localeCompare(b.category_name));

    res.status(200).json({
      success: true,
      categories: filteredCategories,
      server_info: authData.server_info
    });

  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch categories' 
    });
  }
}