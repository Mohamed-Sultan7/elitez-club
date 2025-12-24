import React from 'react';
import { parseMessageContent } from '@/lib/linkUtils';
import LinkPreview from './LinkPreview';

interface MessageContentProps {
  content: string;
  className?: string;
}

const MessageContent: React.FC<MessageContentProps> = ({ content, className = '' }) => {
  const parsedContent = parseMessageContent(content);

  return (
    <div className={className}>
      {parsedContent.map((part, index) => (
        <LinkPreview key={index} link={part} />
      ))}
    </div>
  );
};

export default MessageContent;