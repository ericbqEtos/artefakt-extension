import { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { Spinner } from './ui/Spinner';
import { useToast } from './ui/Toast';
import {
  generateCitations,
  generateQuickCitation,
  getAvailableStyles,
  preloadCommonStyles,
  type CitationStyleId,
  type CitationResult
} from '../lib/citation';
import type { SourceCapture } from '../types/source';

interface CitationFormatterProps {
  sources: SourceCapture[];
  onClose?: () => void;
}

export function CitationFormatter({ sources, onClose }: CitationFormatterProps) {
  const [selectedStyle, setSelectedStyle] = useState<CitationStyleId>('apa');
  const [citations, setCitations] = useState<Map<string, CitationResult>>(new Map());
  const [fullBibliography, setFullBibliography] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'bibliography' | 'intext'>('bibliography');
  const { addToast } = useToast();

  const availableStyles = getAvailableStyles();

  // Preload common styles on mount
  useEffect(() => {
    preloadCommonStyles().catch(console.error);
  }, []);

  // Generate citations when sources or style changes
  const generateCitationsForSources = useCallback(async () => {
    if (sources.length === 0) {
      setCitations(new Map());
      setFullBibliography('');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await generateCitations(sources, selectedStyle);
      setCitations(result.citations);
      setFullBibliography(result.fullBibliography);
    } catch (err) {
      console.error('Citation generation error:', err);
      setError('Failed to generate citations. Using preview format.');

      // Fall back to quick citations
      const quickCitations = new Map<string, CitationResult>();
      sources.forEach(source => {
        const quick = generateQuickCitation(source, selectedStyle);
        const authorName = source.metadata.author?.[0]?.family ||
                          source.metadata.author?.[0]?.literal ||
                          'Unknown Author';
        const year = source.metadata.issued?.['date-parts']?.[0]?.[0] ||
                    new Date(source.createdAt).getFullYear();
        quickCitations.set(source.id!, {
          inText: `(${authorName}, ${year})`,
          bibliography: quick,
          bibliographyHtml: quick
        });
      });
      setCitations(quickCitations);
      setFullBibliography(sources.map(s => generateQuickCitation(s, selectedStyle)).join('\n\n'));
    } finally {
      setIsLoading(false);
    }
  }, [sources, selectedStyle]);

  useEffect(() => {
    generateCitationsForSources();
  }, [generateCitationsForSources]);

  // Copy to clipboard
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast('success', `${label} copied to clipboard`);
    } catch (err) {
      console.error('Copy failed:', err);
      addToast('error', 'Failed to copy to clipboard');
    }
  };

  // Copy all bibliography entries
  const copyAllBibliography = () => {
    copyToClipboard(fullBibliography, 'Bibliography');
  };

  // Copy single citation
  const copyCitation = (sourceId: string) => {
    const citation = citations.get(sourceId);
    if (citation) {
      const text = previewMode === 'bibliography' ? citation.bibliography : citation.inText;
      copyToClipboard(text, 'Citation');
    }
  };

  if (sources.length === 0) {
    return (
      <div className="p-4 text-center text-neutral-500">
        <p>Select one or more sources to generate citations.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold text-neutral-900">
          Generate Citations
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-600 rounded"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 border-b space-y-3">
        <div className="flex gap-3">
          <Select
            label="Citation Style"
            value={selectedStyle}
            onChange={(value) => setSelectedStyle(value as CitationStyleId)}
            options={availableStyles.map(style => ({
              id: style.id,
              name: style.name
            }))}
            className="flex-1"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setPreviewMode('bibliography')}
            className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
              previewMode === 'bibliography'
                ? 'bg-primary-100 text-primary-700 font-medium'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            Bibliography
          </button>
          <button
            onClick={() => setPreviewMode('intext')}
            className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
              previewMode === 'intext'
                ? 'bg-primary-100 text-primary-700 font-medium'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            In-Text Citations
          </button>
        </div>
      </div>

      {/* Citation Output */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="md" />
            <span className="ml-2 text-neutral-600">Generating citations...</span>
          </div>
        ) : error ? (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
            {error}
          </div>
        ) : null}

        {!isLoading && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="text-sm text-neutral-600">
              {sources.length} source{sources.length !== 1 ? 's' : ''} selected
            </div>

            {/* Individual Citations */}
            {sources.map(source => {
              const citation = citations.get(source.id!);
              const displayText = previewMode === 'bibliography'
                ? citation?.bibliography
                : citation?.inText;

              return (
                <div
                  key={source.id}
                  className="p-3 bg-neutral-50 rounded-lg border border-neutral-200"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                      {source.sourceType === 'ai-conversation' ? (
                        <span className="text-purple-600">{source.platform || 'AI'}</span>
                      ) : (
                        source.sourceType
                      )}
                    </span>
                    <button
                      onClick={() => copyCitation(source.id!)}
                      className="p-1 text-neutral-400 hover:text-primary-600 rounded"
                      aria-label="Copy citation"
                      title="Copy citation"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>

                  <p className="text-sm text-neutral-700 leading-relaxed break-words">
                    {displayText || 'Generating...'}
                  </p>

                  {/* Show source title for reference */}
                  <p className="mt-2 text-xs text-neutral-400 truncate">
                    {source.metadata.title}
                  </p>

                  {/* NotebookLM tool context indicator */}
                  {source.platform === 'notebooklm' && source.aiMetadata?.toolContext && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                        {source.aiMetadata.toolContext.outputLabel}
                      </span>
                      {source.aiMetadata.toolContext.sourceCount && source.aiMetadata.toolContext.sourceCount > 0 && (
                        <span className="text-xs text-neutral-500">
                          {source.aiMetadata.toolContext.sourceCount} source{source.aiMetadata.toolContext.sourceCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t bg-neutral-50">
        <Button
          variant="primary"
          className="w-full"
          onClick={copyAllBibliography}
          disabled={isLoading || sources.length === 0}
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy All to Clipboard
        </Button>
      </div>
    </div>
  );
}
