import ReactPlayer from 'react-player';

export function MediaPlayer({ url, className = '' }: { url: string; className?: string }) {
  if (!url) return null;
  
  const cleanUrl = url.trim();

  // Google Drive
  const googleDriveMatch = cleanUrl.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (googleDriveMatch) {
    const fileId = googleDriveMatch[1];
    return (
      <iframe
        src={`https://drive.google.com/file/d/${fileId}/preview`}
        className={className}
        style={{ border: 'none', width: '100%', aspectRatio: '16/9' }}
        allow="autoplay"
        allowFullScreen
      />
    );
  }

  const isPlayable = ReactPlayer.canPlay(cleanUrl);
  const isImageMatch = cleanUrl.match(/\.(jpeg|jpg|gif|png|webp|svg|bmp|tiff)$/i) != null;
  
  if (isPlayable && !isImageMatch) {
    return (
      <div className={`overflow-hidden ${className}`} style={{ aspectRatio: '16/9', width: '100%' }}>
        {/* @ts-ignore: ReactPlayer props type issue in this environment */}
        <ReactPlayer 
          url={cleanUrl} 
          controls 
          width="100%" 
          height="100%" 
          style={{ background: '#000' }}
        />
      </div>
    );
  }

  return (
    <img src={cleanUrl} alt="" className={`object-contain ${className}`} />
  );
}
