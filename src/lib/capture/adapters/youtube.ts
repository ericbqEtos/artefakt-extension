export interface YouTubeMetadata {
  title: string;
  author: string[];
  type: string;
  videoMetadata: {
    channelName: string;
    channelUrl?: string;
    duration?: string;
    currentTimestamp?: number;
    publishedDate?: string;
    viewCount?: string;
  };
}

export function extractYouTubeMetadata(): YouTubeMetadata | null {
  if (!window.location.hostname.includes('youtube.com')) {
    return null;
  }

  // Get video title
  const titleEl = document.querySelector('h1.ytd-video-primary-info-renderer, h1.ytd-watch-metadata');
  const title = titleEl?.textContent?.trim() || document.title.replace(' - YouTube', '');

  // Get channel info
  const channelEl = document.querySelector('#channel-name a, ytd-channel-name a');
  const channelName = channelEl?.textContent?.trim() || '';
  const channelUrl = channelEl?.getAttribute('href')
    ? `https://youtube.com${channelEl.getAttribute('href')}`
    : undefined;

  // Get video duration from player
  const durationEl = document.querySelector('.ytp-time-duration');
  const duration = durationEl?.textContent?.trim();

  // Get current timestamp
  const video = document.querySelector('video');
  const currentTimestamp = video ? Math.floor(video.currentTime) : undefined;

  // Get publish date
  const dateEl = document.querySelector('#info-strings yt-formatted-string, #info span:nth-child(3)');
  const publishedDate = dateEl?.textContent?.trim();

  // Get view count
  const viewsEl = document.querySelector('#info span.view-count, ytd-video-view-count-renderer span');
  const viewCount = viewsEl?.textContent?.trim();

  return {
    title,
    author: channelName ? [channelName] : [],
    type: 'video',
    videoMetadata: {
      channelName,
      channelUrl,
      duration,
      currentTimestamp,
      publishedDate,
      viewCount
    }
  };
}
