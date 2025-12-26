/**
 * Export utilities for saving visualizations as images
 */

// Export SVG element as PNG
export async function exportAsPNG(
  svgElement: SVGSVGElement,
  filename: string = 'visualization.png',
  backgroundColor: string = '#0f172a'
): Promise<void> {
  try {
    // Get SVG dimensions
    const bbox = svgElement.getBoundingClientRect();
    const width = bbox.width;
    const height = bbox.height;

    // Serialize SVG to string
    const svgData = new XMLSerializer().serializeToString(svgElement);

    // Create a canvas
    const canvas = document.createElement('canvas');
    canvas.width = width * 2; // 2x for better quality
    canvas.height = height * 2;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Fill background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Create an image from SVG
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    return new Promise((resolve, reject) => {
      img.onload = () => {
        // Draw image on canvas with scaling
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Convert canvas to blob
        canvas.toBlob((blob) => {
          if (blob) {
            // Download the image
            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            link.click();

            // Cleanup
            URL.revokeObjectURL(url);
            URL.revokeObjectURL(downloadUrl);
            resolve();
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        }, 'image/png');
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load SVG as image'));
      };

      img.src = url;
    });
  } catch (error) {
    console.error('Error exporting PNG:', error);
    throw error;
  }
}

// Export SVG element as SVG file
export function exportAsSVG(svgElement: SVGSVGElement, filename: string = 'visualization.svg'): void {
  try {
    // Clone the SVG to avoid modifying the original
    const svgClone = svgElement.cloneNode(true) as SVGSVGElement;

    // Add XML namespace if not present
    if (!svgClone.getAttribute('xmlns')) {
      svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }

    // Serialize SVG to string
    const svgData = new XMLSerializer().serializeToString(svgClone);

    // Create blob and download
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    // Cleanup
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting SVG:', error);
    throw error;
  }
}

// Copy current view to clipboard as text (state snapshot)
export async function copyStateToClipboard(state: any, concept: string): Promise<void> {
  try {
    const stateText = `${concept} State Snapshot:\n\n${JSON.stringify(state, null, 2)}`;

    await navigator.clipboard.writeText(stateText);
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    throw error;
  }
}

// Export state as JSON file
export function exportStateAsJSON(state: any, filename: string = 'state.json'): void {
  try {
    const jsonData = JSON.stringify(state, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    // Cleanup
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting JSON:', error);
    throw error;
  }
}

// Share via Web Share API (if supported)
export async function shareVisualization(
  svgElement: SVGSVGElement,
  concept: string,
  description: string = ''
): Promise<void> {
  if (!navigator.share) {
    throw new Error('Web Share API not supported in this browser');
  }

  try {
    // Convert SVG to PNG blob
    const bbox = svgElement.getBoundingClientRect();
    const canvas = document.createElement('canvas');
    canvas.width = bbox.width * 2;
    canvas.height = bbox.height * 2;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Fill background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Serialize and draw SVG
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();

    return new Promise((resolve, reject) => {
      img.onload = async () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], `${concept}.png`, { type: 'image/png' });

            try {
              await navigator.share({
                title: `${concept} Visualization`,
                text: description || `Check out this ${concept} visualization!`,
                files: [file],
              });
              URL.revokeObjectURL(url);
              resolve();
            } catch (shareError) {
              URL.revokeObjectURL(url);
              reject(shareError);
            }
          } else {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to create blob'));
          }
        }, 'image/png');
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  } catch (error) {
    console.error('Error sharing:', error);
    throw error;
  }
}

// Get shareable link (for the current page)
export function getShareableLink(): string {
  if (typeof window !== 'undefined') {
    return window.location.href;
  }
  return '';
}

// Copy link to clipboard
export async function copyLinkToClipboard(): Promise<void> {
  try {
    const link = getShareableLink();
    await navigator.clipboard.writeText(link);
  } catch (error) {
    console.error('Error copying link:', error);
    throw error;
  }
}
