/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { SavedOutfit } from '../types';
import { Trash2Icon, DownloadCloudIcon } from './icons';

interface SavedOutfitsPanelProps {
  savedOutfits: SavedOutfit[];
  onLoadOutfit: (outfitId: string) => void;
  onDeleteOutfit: (outfitId: string) => void;
  isLoading: boolean;
}

const SavedOutfitsPanel: React.FC<SavedOutfitsPanelProps> = ({ savedOutfits, onLoadOutfit, onDeleteOutfit, isLoading }) => {
  if (savedOutfits.length === 0) {
    return null;
  }

  return (
    <div className="pt-6 border-t border-gray-400/50">
      <h2 className="text-xl font-serif tracking-wider text-gray-800 mb-3">Trang phục đã lưu</h2>
      <div className="grid grid-cols-3 gap-3">
        {savedOutfits.map((outfit) => (
          <div
            key={outfit.id}
            className="relative aspect-square border rounded-lg overflow-hidden group"
          >
            <img src={outfit.previewUrl} alt={outfit.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity p-2">
              <p className="text-white text-xs font-bold text-center mb-2 leading-tight">{outfit.name}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onLoadOutfit(outfit.id)}
                  disabled={isLoading}
                  className="p-2 bg-white/20 rounded-full text-white hover:bg-white/40 disabled:opacity-50"
                  aria-label={`Tải ${outfit.name}`}
                >
                  <DownloadCloudIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onDeleteOutfit(outfit.id)}
                  disabled={isLoading}
                  className="p-2 bg-white/20 rounded-full text-white hover:bg-white/40 disabled:opacity-50"
                  aria-label={`Xóa ${outfit.name}`}
                >
                  <Trash2Icon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SavedOutfitsPanel;