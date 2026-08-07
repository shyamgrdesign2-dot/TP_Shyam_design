import React, { useCallback } from "react";
import { Button } from "antd";

import "./DrawingCanvasEmptyState.scss";

const DrawingCanvasEmptyState = ({
  isFirstTimeUser = true,
  onCreateCanvas,
  onKnowMore,
}) => {
  const handleCreate = useCallback(() => {
    if (typeof onCreateCanvas === "function") onCreateCanvas();
  }, [onCreateCanvas]);

  const handleKnowMore = useCallback(() => {
    if (typeof onKnowMore === "function") onKnowMore();
  }, [onKnowMore]);

  if (!isFirstTimeUser) {
    return (
      <div className="drawing-canvas-empty drawing-canvas-empty--returning">
        <div className="drawing-canvas-empty__content">
          <div className="drawing-canvas-empty__icon-simple">
            <svg width="128" height="128" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="24" y="38" width="80" height="60" rx="8" fill="#F0F0EE" />
              <path d="M24 46C24 41.5817 27.5817 38 32 38H52L60 46H24V46Z" fill="#E2E2DF" />
              <rect x="36" y="30" width="56" height="40" rx="4" fill="white" />
              <rect x="42" y="38" width="44" height="2" fill="#F0F0EE" />
              <rect x="42" y="44" width="44" height="2" fill="#F0F0EE" />
              <rect x="42" y="50" width="30" height="2" fill="#F0F0EE" />
              <path d="M24 54V90C24 94.4183 27.5817 98 32 98H96C100.418 98 104 94.4183 104 90V54L24 54Z" fill="#EBEBE9" />
              <rect x="44" y="68" width="40" height="4" rx="2" fill="#D8D8D6" />
            </svg>
          </div>
          
          <div className="drawing-canvas-empty__headline-simple">No Canvases Yet</div>
          <p className="drawing-canvas-empty__description-simple">
            You haven't created any canvases for this patient yet.
          </p>

          <Button className="drawing-canvas-empty__cta-simple" onClick={handleCreate} type="primary">
            <span className="drawing-canvas-empty__cta-plus">+</span>
            Create New Canvas
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="drawing-canvas-empty">
      <div className="drawing-canvas-empty__content">
        <div className="drawing-canvas-empty__icon" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56" fill="none">
            <path opacity="0.4" d="M37.6688 4.65385H18.1713C9.70219 4.65385 4.65332 9.70272 4.65332 18.1718V37.646C4.65332 46.1384 9.70219 51.1872 18.1713 51.1872H37.6455C46.1146 51.1872 51.1634 46.1384 51.1634 37.6693V18.1718C51.1867 9.70272 46.1378 4.65385 37.6688 4.65385Z" fill="#A461D8" />
            <path d="M50.7912 8.26019C48.3482 14.3328 42.8107 22.2667 37.5059 27.4552C36.7381 22.6623 32.9224 18.9163 28.0829 18.2416C33.2946 12.9368 41.2751 7.30625 47.371 4.83998C48.4412 4.42118 49.5348 4.74692 50.1862 5.42165C50.9075 6.11965 51.2332 7.18992 50.7912 8.26019Z" fill="#A461D8" />
            <path opacity="0.4" d="M37.5059 27.4319C36.5752 28.3393 35.6446 29.1769 34.7604 29.8749L31.1076 32.8065C30.6422 33.1323 30.1769 33.4115 29.665 33.6441C29.665 33.2951 29.6185 32.9461 29.5952 32.5739C29.3858 31.0383 28.6878 29.5725 27.4314 28.3161C26.1518 27.0597 24.6162 26.3384 23.0573 26.129C22.685 26.0825 22.2895 26.0825 21.9405 26.0825C22.1499 25.5008 22.4524 24.9657 22.8479 24.5236L25.7562 20.8707C26.4542 19.9866 27.2453 19.1025 28.1062 18.2183C32.9224 18.8931 36.7614 22.6623 37.5059 27.4319Z" fill="#A461D8" />
            <path d="M29.665 33.6674C29.665 35.7149 28.8739 37.6693 27.4081 39.1351C26.2681 40.2752 24.7557 41.0662 22.8944 41.2989L18.3341 41.8108C15.8446 42.09 13.7041 39.9494 13.9833 37.4366L14.4951 32.8763C14.9372 28.8047 18.3341 26.1988 21.9405 26.129C22.2895 26.1057 22.685 26.129 23.0573 26.1755C24.6394 26.3849 26.1517 27.1062 27.4314 28.3626C28.6645 29.5957 29.3858 31.0848 29.5952 32.6204C29.6185 32.9694 29.665 33.3184 29.665 33.6674Z" fill="#A461D8" />
          </svg>
        </div>

        <div className="drawing-canvas-empty__headline">
          <div className="drawing-canvas-empty__headline-kicker">Introducing</div>
          <div className="drawing-canvas-empty__headline-title">Drawing Canvas</div>
        </div>

        <p className="drawing-canvas-empty__description">
          Create and annotate medical drawings effortlessly with canvas. Use the digital canvas to sketch, highlight, and
          explain conditions to patients with clarity.
          <button type="button" className="drawing-canvas-empty__know-more" onClick={handleKnowMore}>
            Know more
          </button>
        </p>


        <Button className="drawing-canvas-empty__cta" onClick={handleCreate} type="primary">
          <span className="drawing-canvas-empty__cta-plus" aria-hidden="true">
            +
          </span>
          Create New Canvas
        </Button>
      </div>
    </div>
  );
};

export default DrawingCanvasEmptyState;

