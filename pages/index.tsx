import { useState, useEffect } from 'react';
import Head from 'next/head';

interface Category {
  category_id: string;
  category_name: string;
  parent_id: number;
}

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

export default function Home() {
  const [xtreamUrl, setXtreamUrl] = useState('http://starshare.fun/');
  const [username, setUsername] = useState('home123');
  const [password, setPassword] = useState('home123');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [m3uUrl, setM3uUrl] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setIsLoading(true);
    setError('');
    setCategories([]);
    
    try {
      const response = await fetch('/api/get-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: xtreamUrl,
          username,
          password,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch categories');
      }

      setCategories(data.categories || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateM3U = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/generate-m3u', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: xtreamUrl,
          username,
          password,
          categories: selectedCategories,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate M3U');
      }

      setM3uUrl(data.m3uUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  return (
    <>
      <Head>
        <title>Xtream to M3U Converter</title>
        <meta name="description" content="Convert Xtream Codes to M3U playlists" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-xl p-8">
            <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
              🎬 Xtream to M3U Converter
            </h1>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Login Form */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-700">Xtream Codes Login</h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Xtream Server URL
                  </label>
                  <input
                    type="url"
                    value={xtreamUrl}
                    onChange={(e) => setXtreamUrl(e.target.value)}
                    placeholder="http://your-server.com:port"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <button
                  onClick={handleLogin}
                  disabled={!xtreamUrl || !username || !password || isLoading}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Loading...' : 'Get Categories'}
                </button>
              </div>

              {/* Categories Selection */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-700">Select Categories</h2>
                
                {categories.length > 0 && (
                  <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4">
                    <div className="mb-4">
                      <button
                        onClick={() => setSelectedCategories(
                          selectedCategories.length === categories.length 
                            ? [] 
                            : categories.map(cat => cat.category_id)
                        )}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {selectedCategories.length === categories.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    
                    {categories.map((category) => (
                      <label key={category.category_id} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(category.category_id)}
                          onChange={() => toggleCategory(category.category_id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{category.category_name}</span>
                      </label>
                    ))}
                  </div>
                )}

                {categories.length > 0 && (
                  <button
                    onClick={handleGenerateM3U}
                    disabled={selectedCategories.length === 0 || isLoading}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? 'Generating...' : 'Generate M3U Playlist'}
                  </button>
                )}
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                <p className="font-medium">Error:</p>
                <p>{error}</p>
              </div>
            )}

            {/* M3U URL Display */}
            {m3uUrl && (
              <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="text-lg font-semibold text-green-800 mb-4">
                  ✅ M3U Playlist Generated Successfully!
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-green-700 mb-2">
                      Your M3U Playlist URL:
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={m3uUrl}
                        readOnly
                        className="flex-1 px-3 py-2 bg-white border border-green-300 rounded-lg text-sm"
                      />
                      <button
                        onClick={() => navigator.clipboard.writeText(m3uUrl)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="text-sm text-green-700">
                    <p className="font-medium mb-2">How to use:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Copy the URL above and paste it into your IPTV player</li>
                      <li>Compatible with VLC, OTT Navigator, Kodi, and more</li>
                      <li>The playlist includes only your selected categories</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .min-h-screen {
          min-height: 100vh;
        }
      `}</style>
    </>
  );
}