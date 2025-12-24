import React from 'react';
import { ExternalLink, Youtube, Globe } from 'lucide-react';
import { ParsedLink, getDomainFromUrl } from '@/lib/linkUtils';

interface LinkPreviewProps {
  link: ParsedLink;
  className?: string;
}

const LinkPreview: React.FC<LinkPreviewProps> = ({ link, className = '' }) => {
  if (link.type === 'youtube' && link.videoId) {
    return (
      <div className={`my-2 ${className}`}>
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-2 bg-red-600/10 hover:bg-red-600/20 rounded-lg border border-red-400/30 hover:border-red-400/50 transition-all text-sm text-red-300 hover:text-red-200 max-w-full group"
        >
          <Youtube className="w-4 h-4 flex-shrink-0 text-red-400" />
          <div className="min-w-0 flex-1">
            <div className="font-medium truncate">YouTube Video</div>
            <div className="text-xs text-red-400/70 truncate">{link.url}</div>
          </div>
          <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
        </a>
      </div>
    );
  }

  if (link.type === 'url' && link.url) {
    return (
      <div className={`my-2 ${className}`}>
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600/10 hover:bg-blue-600/20 rounded-lg border border-blue-400/30 hover:border-blue-400/50 transition-all text-sm text-blue-300 hover:text-blue-200 max-w-full group"
        >
          <Globe className="w-4 h-4 flex-shrink-0 text-blue-400" />
          <div className="min-w-0 flex-1">
            <div className="font-medium truncate">{getDomainFromUrl(link.url)}</div>
            <div className="text-xs text-blue-400/70 truncate">{link.url}</div>
          </div>
          <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
        </a>
      </div>
    );
  }

  // Regular text
  return <span className={className}>{link.content}</span>;
};

export default LinkPreview;