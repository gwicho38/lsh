/*
 * Copyright 2009-2024 C3 AI (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

import React, { useState } from 'react';
import { GuruUiImageGrid as GuruUiImageGridProps } from '@c3/types';
import UiSdlImage from '@c3/ui/UiSdlImageReact';

import '@c3/ui/GuruImageGrid.scss';

function ImageGridElement({ id, isSelected, onSelect, item, imageSpec }) {
  const handleClick = () => {
    onSelect(id);
  };

  const handleMouseMove = (event) => {
    setTooltipPosition({ x: event.clientX, y: event.clientY });
  };

  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div>
      <div
        className={isSelected ? 'selected-image-grid-element' : 'image-grid-element'}
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onMouseMove={handleMouseMove}
      >
        <div className="thumbnail">
          <UiSdlImage {...imageSpec} url={item.thumbnail} />
        </div>
        <div className="content">
          <div className="imageName">{item.imageName || ''}</div>
          <a className="imageUrl" href={item.imageUrl || 'not-found'} target="_blank">
            {imageSpec?.urlText || 'Link'}
          </a>
        </div>
      </div>
      {showTooltip && (
        <div
          className="tooltip"
          /*
           * Adjust tooltip position to be closer to the mouse coordinates.
           * TODO: Remove hardcoded values and improve tooltip positioning variably.
           */
          style={{ left: tooltipPosition.x - 50, top: tooltipPosition.y - 200 }}
        >
          NIIRS Rating: {item.rating != 'NaN' ? item.rating : 'Unknown'}
          <br />
          Cloud Cover: {item.cloudCover != 'NaN' ? item.cloudCover + '%' : 'Unknown'}
          <br />
          Timestamp: {item.ts != 'NaN' ? item.ts : 'Unknown'}
        </div>
      )}
    </div>
  );
}

const GuruUiImageGridReact: React.FunctionComponent<GuruUiImageGridProps> = (props) => {
  // Handle pagination
  const itemsPerPage = 6;
  const [currentPage, setCurrentPage] = useState(1);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const currentData = props.data.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Handle selectable items
  const [selectedItem, setSelectedItem] = useState(null);

  const handleSelect = (id) => {
    setSelectedItem((prevSelectedItem) => {
      if (prevSelectedItem === id) {
        return null;
      } else {
        return id;
      }
    });
  };

  return currentData ? (
    <div className="grid-container">
      <div className="image-grid-container">
        {currentData.map((item) => {
          return (
            <ImageGridElement
              id={item.imageName}
              isSelected={selectedItem === item.imageName}
              onSelect={handleSelect}
              item={item}
              imageSpec={props.imageSpec}
            />
          );
        })}
      </div>
      <div className="button-wrapper">
        <button className="button" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
          Previous
        </button>
        <button
          className="button"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={endIndex >= props.data.length}
        >
          Next
        </button>
      </div>
    </div>
  ) : null;
};

export default GuruUiImageGridReact;
